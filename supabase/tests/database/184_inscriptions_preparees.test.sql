-- Inscriptions préparées par un conseiller (F-195, lot 84, ADR 0395) : préparation contrôlée,
-- lecture par son seul conseiller, lien ouvert sans compte (première ouverture notée, lien expiré ou
-- inconnu refusé), effacement par l'artisan, rattachement à l'inscription qui efface les données
-- personnelles, trace dans le back-office, purge. Données fictives (SIRET 00000184…, c184…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1840000-0000-4000-8000-000000000001', 'c184.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1840000-0000-4000-8000-000000000002', 'c184.sarah@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1840000-0000-4000-8000-000000000003', 'c184.ines@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1840000-0000-4000-8000-000000000004', 'c184.karim@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.profiles (user_id, first_name) values ('c1840000-0000-4000-8000-000000000002', 'Sarah')
  on conflict (user_id) do update set first_name = excluded.first_name;

insert into public.commercials (id, user_id, code, nom, status) values
  ('c1841000-0000-4000-8000-000000000001', 'c1840000-0000-4000-8000-000000000002', 'sarah-184', 'Sarah Exemple', 'actif'),
  ('c1841000-0000-4000-8000-000000000002', 'c1840000-0000-4000-8000-000000000003', 'ines-184', 'Inès Exemple', 'actif');

-- Une entreprise déjà inscrite.
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1842000-0000-4000-8000-000000000001', 'c1840000-0000-4000-8000-000000000004', '00000189100019', 'DEJA C184', 'brouillon');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

select has_table('public', 'prepared_signups', 'table des inscriptions préparées');
select ok((select relrowsecurity from pg_class where oid = 'public.prepared_signups'::regclass), 'RLS activée');

-- ---------- Sarah prépare ----------
select pg_temp.connecter('c1840000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.commercial_prepare_signup('00000189100019', 'DEJA', '{}', 'Karim', 'B', 'k@example.test', '+33612345678') $$,
  '22023', 'Cette entreprise est déjà inscrite sur MENAO.', 'entreprise déjà inscrite : refusée');
select throws_ok($$ select public.commercial_prepare_signup('00000184200012', 'BAINS', '{}', 'Karim', 'B', 'pas-un-mail', '+33612345678') $$,
  '22023', 'Adresse e-mail invalide.', 'e-mail invalide refusé');
select throws_ok($$ select public.commercial_prepare_signup('00000184200012', 'BAINS', '{}', 'Karim', 'B', 'k@example.test', '0612') $$,
  '22023', null, 'téléphone invalide refusé');
select lives_ok($$ select public.commercial_prepare_signup('00000184200012', 'BAINS C184', '{"tradeCodes":["plombier"]}',
  'Karim', 'B', 'Karim@Example.test', '+33612345678') $$, 'préparation enregistrée');
select lives_ok($$ select public.commercial_prepare_signup('00000184200012', 'BAINS C184', '{"tradeCodes":["plombier","chauffagiste"]}',
  'Karim', 'B', 'karim@example.test', '+33612345678') $$, 'nouvelle préparation du même SIRET');
select is((select count(*)::int from public.prepared_signups), 1, 'la nouvelle remplace l''ancienne');
select is((select email from public.prepared_signups), 'karim@example.test', 'e-mail en minuscules');
select is((select count(*)::int from public.commercial_prepared_signups()), 1, 'suivi : sa préparation');
select throws_ok($$ insert into public.prepared_signups (commercial_id, siret) values ('c1841000-0000-4000-8000-000000000001', '00000184200019') $$,
  '42501', null, 'aucune écriture directe');
reset role;

-- ---------- Inès ne voit rien ----------
select pg_temp.connecter('c1840000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select is((select count(*)::int from public.prepared_signups), 0, 'préparation d''un collègue invisible');
select lives_ok($$ select public.commercial_delete_prepared_signup((select id from public.prepared_signups limit 1)) $$,
  'suppression sans effet sur celle d''un collègue');
reset role;
select is((select count(*)::int from public.prepared_signups where siret = '00000184200012'), 1, 'toujours là');

-- ---------- L'artisan ouvre son lien, sans compte ----------
set local role anon;
select is(public.prepared_signup_open('0123456789abcdef0123456789abcdef'), null, 'lien inconnu : rien');
select is(public.prepared_signup_open('pas-une-cle'), null, 'clé mal formée : rien');
select throws_ok($$ select count(*) from public.prepared_signups $$, '42501', null,
  'anonyme : la table ne lui est pas lisible directement');
reset role;
create temp table cle as select key from public.prepared_signups where siret = '00000184200012';
grant select on cle to anon;
set local role anon;
select is(public.prepared_signup_open((select key from cle)) ->> 'advisor', 'Sarah', 'lien : prénom de la conseillère');
select is(public.prepared_signup_open((select key from cle)) ->> 'code', 'sarah-184', 'lien : code de la conseillère');
select is(public.prepared_signup_open((select key from cle)) -> 'draft' -> 'tradeCodes', '["plombier", "chauffagiste"]'::jsonb,
  'lien : métiers préparés');
reset role;
select isnt((select opened_at from public.prepared_signups where siret = '00000184200012'), null, 'première ouverture notée');

-- Lien expiré sans avoir été ouvert.
insert into public.prepared_signups (commercial_id, siret, company_name, draft, first_name, email, phone, expires_at, key)
values ('c1841000-0000-4000-8000-000000000001', '00000184300015', 'VIEUX C184', '{}', 'Paul', 'paul@example.test',
  '+33611111111', now() - interval '1 hour', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
set local role anon;
select is(public.prepared_signup_open('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), null, 'lien expiré sans ouverture : rien');
-- « Ce n'est pas moi ».
select lives_ok($$ select public.prepared_signup_forget('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') $$, 'effacement par l''artisan');
reset role;
select is((select count(*)::int from public.prepared_signups where siret = '00000184300015'), 0, 'informations effacées');

-- ---------- L'inscription est rattachée à Sarah ----------
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1840000-0000-4000-8000-000000000005', 'c184.bains@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, siret, raison_sociale, status) values
  ('c1842000-0000-4000-8000-000000000002', 'c1840000-0000-4000-8000-000000000005', '00000184200012', 'BAINS C184', 'brouillon');
insert into public.commercial_attributions (commercial_id, artisan_id) values
  ('c1841000-0000-4000-8000-000000000001', 'c1842000-0000-4000-8000-000000000002');
select isnt((select converted_at from public.prepared_signups where siret = '00000184200012'), null, 'préparation devenue inscription');
select is((select email from public.prepared_signups where siret = '00000184200012'), null, 'e-mail effacé à l''inscription');
select is((select draft from public.prepared_signups where siret = '00000184200012'), null, 'brouillon effacé à l''inscription');

select pg_temp.connecter('c1840000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is((select artisan_status::text from public.commercial_prepared_signups() where siret = '00000184200012'), 'brouillon',
  'suivi : étape du dossier de l''artisan');
reset role;

set local role anon;
select is(public.prepared_signup_open((select key from cle)), null, 'lien déjà utilisé : rien');
reset role;

-- ---------- Back-office ----------
select pg_temp.connecter('c1840000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_artisan_prepared_signup('c1842000-0000-4000-8000-000000000002') $$, '42501', null,
  'trace réservée aux admins');
reset role;
select pg_temp.connecter('c1840000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(public.admin_artisan_prepared_signup('c1842000-0000-4000-8000-000000000002') ->> 'code', 'sarah-184',
  'back-office : préparée par Sarah');
reset role;

-- ---------- Purge ----------
insert into public.prepared_signups (commercial_id, siret, company_name, draft, first_name, email, phone, expires_at, created_at)
values
  ('c1841000-0000-4000-8000-000000000001', '00000184400013', 'JAMAIS C184', '{}', 'Luc', 'luc@example.test', '+33622222222',
   now() - interval '1 day', now() - interval '8 days'),
  ('c1841000-0000-4000-8000-000000000001', '00000184500010', 'RECENT C184', '{}', 'Max', 'max@example.test', '+33633333333',
   now() + interval '6 days', now());
select is(app.purge_prepared_signups(), 1, 'purge : lien jamais ouvert après 7 jours');
select is((select count(*)::int from public.prepared_signups where siret in ('00000184200012', '00000184500010')), 2,
  'purge : inscription faite et lien récent gardés');

select * from finish();
rollback;
