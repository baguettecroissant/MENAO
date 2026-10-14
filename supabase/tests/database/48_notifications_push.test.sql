-- F-41 (lot 6e) : notifications push. Jetons des appareils (RLS, enregistrement, changement de
-- compte, 10 appareils au plus, désinscription) et file d'envoi de la fonction notify (prise en
-- charge, résultat, jetons oubliés). RLS vérifiée avec chaque rôle (CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('f8100000-0000-4000-8000-000000000001', 'push.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('f8100000-0000-4000-8000-000000000002', 'push.autre@example.test', false, now(), '{}', '{}'),
  ('f8200000-0000-4000-8000-000000000001', 'push.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f8300000-0000-4000-8000-000000000001', null, true, null, '{}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Isolement : aucune autre notification ni aucun autre jeton dans les comptages.
delete from public.notifications;
delete from public.push_tokens;

-- ---------- Enregistrement d'un jeton ----------
select pg_temp.connecter('f8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok($$ select public.register_push_token('ExponentPushToken[client-iphone_1]', 'ios') $$,
  'particulier : jeton de son téléphone enregistré');
select lives_ok($$ select public.register_push_token('ExponentPushToken[client-iphone_1]', 'ios') $$,
  'même jeton à la réouverture : sans doublon');
select results_eq(
  $$ select token, platform::text from public.push_tokens $$,
  $$ values ('ExponentPushToken[client-iphone_1]'::text, 'ios'::text) $$,
  'particulier : son jeton, une seule fois');
select throws_ok($$ select public.register_push_token('pas-un-jeton', 'android') $$,
  '23514', null, 'jeton qui n''est pas un jeton Expo : refusé');
select throws_ok($$ insert into public.push_tokens (user_id, token, platform)
    values (auth.uid(), 'ExponentPushToken[direct]', 'android') $$,
  '42501', null, 'création directe refusée');
select throws_ok($$ update public.push_tokens set platform = 'android' $$,
  '42501', null, 'modification directe refusée');
select throws_ok($$ select * from public.claim_push_notifications(10) $$,
  '42501', null, 'particulier : pas d''accès aux lots d''envoi');
select throws_ok($$ select public.forget_push_tokens(array['ExponentPushToken[client-iphone_1]']) $$,
  '42501', null, 'particulier : pas d''oubli des jetons des autres');
reset role;

select pg_temp.connecter('f8100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from public.push_tokens), 0, 'autre compte : aucun jeton visible');
select lives_ok($$ select public.unregister_push_token('ExponentPushToken[client-iphone_1]') $$,
  'autre compte : désinscription sans effet sur le jeton d''un autre');
reset role;
select is((select count(*)::int from public.push_tokens), 1, 'jeton du particulier conservé');

select pg_temp.connecter('f8300000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select public.register_push_token('ExponentPushToken[anonyme]', 'ios') $$,
  '42501', null, 'session anonyme de recherche : pas de jeton');
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select 1 from public.push_tokens', '42501', null, 'visiteur : aucun accès');
select throws_ok($$ select public.register_push_token('ExponentPushToken[visiteur]', 'ios') $$,
  '42501', null, 'visiteur : pas d''enregistrement');
reset role;

-- ---------- Changement de compte et 10 appareils au plus ----------
select pg_temp.connecter('f8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.register_push_token('ExponentPushToken[client-iphone_1]', 'ios') $$,
  'téléphone repris par un autre compte');
select lives_ok($$ select public.register_push_token('ExponentPushToken[artisan-' || i || ']', 'android')
    from generate_series(1, 10) i $$,
  'artisan : dix autres appareils');
select is((select count(*)::int from public.push_tokens), 10, 'artisan : 10 appareils au plus');
select is((select count(*)::int from public.push_tokens where token = 'ExponentPushToken[client-iphone_1]'), 0,
  'le plus ancien est oublié');
reset role;
select is((select count(*)::int from public.push_tokens where user_id = 'f8100000-0000-4000-8000-000000000001'), 0,
  'le téléphone n''est plus rattaché au premier compte');

select pg_temp.connecter('f8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.unregister_push_token('ExponentPushToken[artisan-10]') $$,
  'artisan : désinscription d''un appareil (déconnexion)');
select is((select count(*)::int from public.push_tokens), 9, 'artisan : appareil retiré');
reset role;

-- ---------- File d'envoi ----------
-- Destinataire avec l'application : en push ; sans appareil : e-mail seulement.
insert into public.notifications (id, user_id, type, data) values
  ('f8900000-0000-4000-8000-000000000001', 'f8200000-0000-4000-8000-000000000001', 'nouvelle_demande', '{"titre":"Prises"}'),
  ('f8900000-0000-4000-8000-000000000002', 'f8100000-0000-4000-8000-000000000002', 'devis_recu', '{}'),
  ('f8900000-0000-4000-8000-000000000003', 'f8200000-0000-4000-8000-000000000001', 'devis_signe', '{}');
select results_eq(
  $$ select id, push_status::text from public.notifications order by id $$,
  $$ values ('f8900000-0000-4000-8000-000000000001'::uuid, 'a_envoyer'::text),
            ('f8900000-0000-4000-8000-000000000002'::uuid, null::text),
            ('f8900000-0000-4000-8000-000000000003'::uuid, 'a_envoyer'::text) $$,
  'push à envoyer seulement pour le compte qui a l''application');
-- Déjà lue dans l'application avant l'envoi : pas de push.
update public.notifications set read_at = now() where id = 'f8900000-0000-4000-8000-000000000003';

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select id, type::text, data ->> 'titre', cardinality(tokens) from public.claim_push_notifications(10) $$,
  $$ values ('f8900000-0000-4000-8000-000000000001'::uuid, 'nouvelle_demande'::text, 'Prises'::text, 9) $$,
  'lot : la notification à pousser, avec les jetons du destinataire');
select is((select count(*)::int from public.claim_push_notifications(10)), 0,
  'notification en cours : pas reprise tout de suite');
select lives_ok($$ select public.complete_push_notification('f8900000-0000-4000-8000-000000000001', true, false) $$,
  'envoi réussi enregistré');
select lives_ok($$ select public.forget_push_tokens(array['ExponentPushToken[artisan-1]', 'ExponentPushToken[artisan-2]']) $$,
  'jetons refusés par le service oubliés');
reset role;

select results_eq(
  $$ select id, push_status::text, push_attempts, pushed_at is not null from public.notifications
     where push_status is not null order by id $$,
  $$ values ('f8900000-0000-4000-8000-000000000001'::uuid, 'envoyee'::text, 1::smallint, true),
            ('f8900000-0000-4000-8000-000000000003'::uuid, 'ignoree'::text, 0::smallint, false) $$,
  'envoyée une fois ; la notification déjà lue est ignorée');
select is((select count(*)::int from public.push_tokens), 7, 'deux jetons oubliés');
select is((select status::text from public.notifications where id = 'f8900000-0000-4000-8000-000000000001'),
  'a_envoyer', 'l''e-mail suit son propre cours');

-- Erreur passagère : à retenter ; au bout de 3 tentatives, en échec.
insert into public.notifications (id, user_id, type) values
  ('f8900000-0000-4000-8000-000000000004', 'f8200000-0000-4000-8000-000000000001', 'acompte_paye');
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is((select count(*)::int from public.claim_push_notifications(10)), 1, '1re tentative');
select lives_ok($$ select public.complete_push_notification('f8900000-0000-4000-8000-000000000004', false, true) $$,
  'erreur passagère : à retenter');
select is((select count(*)::int from public.claim_push_notifications(10)), 1, '2e tentative');
select lives_ok($$ select public.complete_push_notification('f8900000-0000-4000-8000-000000000004', false, true) $$,
  'nouvelle erreur passagère');
select is((select count(*)::int from public.claim_push_notifications(10)), 1, '3e tentative');
select lives_ok($$ select public.complete_push_notification('f8900000-0000-4000-8000-000000000004', false, true) $$,
  'troisième erreur');
select is((select count(*)::int from public.claim_push_notifications(10)), 0, 'plus de 4e tentative');
reset role;
select is((select push_status::text from public.notifications where id = 'f8900000-0000-4000-8000-000000000004'),
  'echec', 'en échec après 3 tentatives');

select * from finish();
rollback;
