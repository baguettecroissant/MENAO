-- « Demander à MENAO » (F-160, ADR 0346) : une question et sa réponse enregistrées pour
-- l'entreprise, lisibles par elle seule, dans la limite du mois. Données fictives (e165…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1650000-0000-4000-8000-000000000001', 'chat165.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1650000-0000-4000-8000-000000000002', 'chat165.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1651000-0000-4000-8000-000000000001', 'e1650000-0000-4000-8000-000000000001', 'valide', 'CHAT 165', 'communes', true),
  ('e1651000-0000-4000-8000-000000000002', 'e1650000-0000-4000-8000-000000000002', 'valide', 'AUTRE 165', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1651000-0000-4000-8000-000000000001', 'entreprise', 'cus_e165a', 'sub_e165a', 'active'),
  ('e1651000-0000-4000-8000-000000000002', 'entreprise', 'cus_e165b', 'sub_e165b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 165' $$;
create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
$$;

set local role authenticated;
select pg_temp.connecter('e1650000-0000-4000-8000-000000000001');
select lives_ok($$ select public.artisan_create_plan_tender('Maison 165',
  '[{"path":"e1651000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6501.jpg","name":"cloisons.jpg"}]'::jsonb,
  array['plaquiste']) $$, 'création');
select is(public.artisan_plan_chat_quota(), '{"used": 0, "limit": 40}'::jsonb, 'quota : 40 par défaut');
select isnt(public.artisan_save_plan_chat(pg_temp.ao(), 'Combien de plaques de BA13 ?',
  'Il vous faut 39 plaques.', '{"lignes": []}'::jsonb), null, 'question et réponse enregistrées');
select results_eq(
  $$ select role, content from public.tender_chat_messages where tender_id = pg_temp.ao() order by created_at $$,
  $$ values ('artisan'::text, 'Combien de plaques de BA13 ?'::text), ('menao', 'Il vous faut 39 plaques.') $$,
  'question puis réponse, dans l''ordre');
select is((public.artisan_plan_chat_quota() ->> 'used')::int, 1, 'une question comptée');
select throws_ok($$ select public.artisan_save_plan_chat(pg_temp.ao(), '  ', 'réponse') $$, '22023',
  null, 'question vide refusée');
select throws_ok($$ insert into public.tender_chat_messages (tender_id, artisan_id, role, content)
  values (pg_temp.ao(), 'e1651000-0000-4000-8000-000000000001', 'menao', 'faux') $$, '42501',
  null, 'écriture directe refusée');
reset role;

-- Limite du mois atteinte : refus.
update public.platform_settings set value = '1' where key = 'plan_chat_questions_mois';
set local role authenticated;
select pg_temp.connecter('e1650000-0000-4000-8000-000000000001');
select throws_ok($$ select public.artisan_save_plan_chat(pg_temp.ao(), 'Et le prix ?', 'Réponse.') $$,
  '53400', null, 'questions du mois épuisées');

-- Une autre entreprise ne lit ni n'écrit rien.
select pg_temp.connecter('e1650000-0000-4000-8000-000000000002');
select is((select count(*)::int from public.tender_chat_messages), 0, 'autre entreprise : rien à lire');
select throws_ok($$ select public.artisan_save_plan_chat(
  (select id from public.tenders where name = 'Maison 165'), 'Question', 'Réponse') $$,
  '22023', null, 'autre entreprise : appel d''offres introuvable');
reset role;

set local role anon;
select throws_ok($$ select public.artisan_plan_chat_quota() $$, '42501', null, 'visiteur : refusé');
reset role;

select * from finish();
rollback;
