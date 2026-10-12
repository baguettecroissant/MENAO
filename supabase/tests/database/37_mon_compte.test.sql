-- F-08 : « Mon compte » (ADR 0039). Informations personnelles, date du choix sur les
-- communications marketing, demande de suppression du compte.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b9100000-0000-4000-8000-000000000001', 'compte.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('b9100000-0000-4000-8000-000000000002', 'compte.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple","marketing_opt_in":true}'),
  ('b9100000-0000-4000-8000-000000000003', null, true, null, '{}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, anonymous boolean default false) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'is_anonymous', anonymous,
    'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Consentement marketing : date du choix ----------
select is((select marketing_updated_at from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000001'),
  null, 'inscription sans communications : aucune date de choix');
select isnt((select marketing_updated_at from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000002'),
  null, 'inscription avec communications : date du consentement');

-- ---------- Particulier A : ses informations ----------
select pg_temp.connecter('b9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok(
  $$ update public.profiles set first_name = 'Camille-Marie', last_name = 'Exemple', phone = '+33612345678'
     where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  'particulier : modifie ses nom, prénom et téléphone');
select results_eq(
  $$ select first_name, phone from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  $$ values ('Camille-Marie'::text, '+33612345678'::text) $$, 'informations enregistrées');
select throws_ok(
  $$ update public.profiles set phone = '0612345678' where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  '23514', null, 'téléphone au format international uniquement');
update public.profiles set first_name = 'Pirate' where user_id = 'b9100000-0000-4000-8000-000000000002';
select throws_ok(
  $$ update public.profiles set marketing_updated_at = now() - interval '1 year'
     where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  '42501', null, 'particulier : ne date pas lui-même son consentement');
select lives_ok(
  $$ update public.profiles set marketing_opt_in = true where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  'particulier : accepte les communications');
select is((select marketing_updated_at from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000001'),
  now(), 'consentement daté');
select lives_ok(
  $$ update public.profiles set marketing_opt_in = false where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  'particulier : retire son consentement');
select results_eq(
  $$ select marketing_opt_in, marketing_updated_at from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000001' $$,
  $$ values (false, now()) $$, 'retrait daté');

-- ---------- Demande de suppression du compte ----------
select isnt(public.request_account_deletion('Je n''ai plus de travaux prévus.'), null, 'demande de suppression enregistrée');
select is(public.request_account_deletion(), now(), 'seconde demande : date de la demande en cours');
select results_eq(
  $$ select type::text, status::text, contact_email, message, due_at from public.tickets $$,
  $$ values ('suppression_compte', 'ouvert', 'compte.a@example.test', 'Je n''ai plus de travaux prévus.', now() + interval '1 month') $$,
  'une seule demande, visible de son auteur, réponse attendue sous un mois');
reset role;
select is((select first_name from public.profiles where user_id = 'b9100000-0000-4000-8000-000000000002'), 'Alex',
  'profil d''un autre compte inchangé');

select pg_temp.connecter('b9100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.tickets $$, 'autre compte : ne voit pas la demande');
reset role;

select pg_temp.connecter('b9100000-0000-4000-8000-000000000003', 'particulier', true);
set local role authenticated;
select throws_ok($$ select public.request_account_deletion() $$, '42501', null,
  'session anonyme : pas de demande de suppression');
reset role;

set local role anon;
select throws_ok($$ select public.request_account_deletion() $$, '42501', null, 'visiteur : refusé');
reset role;

-- Demande traitée : une nouvelle demande reste possible.
update public.tickets set status = 'resolu', resolved_at = now()
where user_id = 'b9100000-0000-4000-8000-000000000001';
select pg_temp.connecter('b9100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select lives_ok($$ select public.request_account_deletion() $$, 'nouvelle demande après traitement');
select is((select count(*)::int from public.tickets where type = 'suppression_compte'), 2, 'deux demandes au total');
reset role;

select * from finish();
rollback;
