-- F-40, F-41 (ADR 0201) : un push à chaque message pour un destinataire qui a l'application ; rien
-- pour un destinataire sans appareil ; l'e-mail groupé ne part plus en push ; file réservée à la
-- fonction notify (RLS vérifiée avec chaque rôle, CLAUDE.md).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1100000-0000-4000-8000-000000000001', 'pushmsg.client@example.test', false, now(), '{}', '{"first_name":"Camille"}'),
  ('e1200000-0000-4000-8000-000000000001', 'pushmsg.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

delete from public.notifications;
delete from public.push_tokens;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('e1400000-0000-4000-8000-000000000001', 'e1200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN PUSH', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_pushmsg', true);
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('e1500000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('e1600000-0000-4000-8000-000000000001', 'e1500000-0000-4000-8000-000000000001',
   'e1400000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000001', '+33612345678');
select pg_temp.connecter('e1200000-0000-4000-8000-000000000001', 'artisan');
select set_config('test.chantier', public.artisan_fix_appointment('e1600000-0000-4000-8000-000000000001',
  current_date + 2, '10:00')::text, true);

-- L'artisan a l'application ; le client, non.
select pg_temp.connecter('e1200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.register_push_token('ExponentPushToken[artisan-msg]', 'ios') $$,
  'artisan : téléphone enregistré');
reset role;

-- ---------- Un push par message ----------
select pg_temp.connecter('e1100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'),
  'Bonjour, le portail sera ouvert dès 8 h.'), 'client : premier message');
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Code : 1234A'),
  'client : second message dans la foulée');
select throws_ok('select * from public.message_pushes', '42501', null, 'client : file illisible');
select throws_ok('select * from public.claim_message_pushes(10)', '42501', null,
  'client : pas d''accès aux lots d''envoi');
select throws_ok($$ select public.complete_message_push(gen_random_uuid(), true, false) $$, '42501', null,
  'client : pas d''écriture du résultat');
reset role;

select is((select count(*)::int from public.message_pushes
  where user_id = 'e1200000-0000-4000-8000-000000000001' and status = 'a_envoyer'), 2,
  'artisan : un push par message, sans attendre');
select results_eq(
  $$ select (data ->> 'messages')::int, push_status::text from public.notifications where type = 'nouveaux_messages' $$,
  $$ values (2, null::text) $$,
  'e-mail toujours groupé, mais plus en push (pas de doublon)');

select pg_temp.connecter('e1200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok('select * from public.message_pushes', '42501', null, 'artisan : file illisible');
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Merci !'),
  'artisan : réponse');
reset role;
select is((select count(*)::int from public.message_pushes where user_id = 'e1100000-0000-4000-8000-000000000001'), 0,
  'client sans application : aucun push');

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok('select * from public.message_pushes', '42501', null, 'visiteur : aucun accès');
reset role;

-- ---------- Lot d'envoi ----------
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select results_eq(
  $$ select auteur, destinataire, kind::text, apercu, titre is not null, cardinality(tokens)
     from public.claim_message_pushes(10) order by apercu desc $$,
  $$ values ('Camille'::text, 'artisan'::text, 'texte'::text, 'Code : 1234A'::text, true, 1),
            ('Camille'::text, 'artisan'::text, 'texte'::text, 'Bonjour, le portail sera ouvert dès 8 h.'::text, true, 1) $$,
  'lot : auteur, côté destinataire, début du texte et jeton');
select is((select count(*)::int from public.claim_message_pushes(10)), 0, 'en cours : pas repris tout de suite');
select lives_ok($$ select public.complete_message_push(id, true, false) from public.message_pushes $$,
  'envois réussis enregistrés');
reset role;
select is((select count(*)::int from public.message_pushes where status = 'envoyee' and pushed_at is not null), 2,
  'deux pushes envoyés');

-- Message lu avant l'envoi : pas de push.
select pg_temp.connecter('e1100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(format('select public.send_message(%L, %L)', current_setting('test.chantier'), 'Encore une chose'),
  'client : troisième message');
reset role;
select pg_temp.connecter('e1200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok(format('select public.mark_conversation_read(%L)', current_setting('test.chantier')),
  'artisan : conversation ouverte');
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select is((select count(*)::int from public.claim_message_pushes(10)), 0, 'message déjà lu : rien à pousser');
reset role;
select is((select status::text from public.message_pushes mp join public.messages m on m.id = mp.message_id
  where m.body = 'Encore une chose'), 'ignoree', 'push du message lu ignoré');

select * from finish();
rollback;
