-- F-52 (lot 3a, ADR 0047) : personnes, recherche globale, activité et suspension manuelle d'un
-- artisan. Réservé aux admins avec double authentification ; sessions anonymes jamais listées.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('be100000-0000-4000-8000-000000000001', 'personnes.client@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Personne"}'),
  ('be100000-0000-4000-8000-000000000002', null, true, null, '{}', '{}'),
  ('be200000-0000-4000-8000-000000000001', 'personnes.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Alix"}'),
  ('be300000-0000-4000-8000-000000000001', 'personnes.admin@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, zone_mode, connect_charges_enabled)
values ('be400000-0000-4000-8000-000000000001', 'be200000-0000-4000-8000-000000000001', 'valide',
  '00000042000000', 'PERSONNES ARTISAN SARL', 'communes', true);

-- ---------- Accès réservé aux admins avec double authentification ----------
select pg_temp.connecter('be100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.admin_people() $$, '42501', null, 'particulier : pas de liste des personnes');
select throws_ok($$ select public.admin_people_counts() $$, '42501', null, 'particulier : pas de compteurs');
select throws_ok(
  $$ select public.admin_user_account('be100000-0000-4000-8000-000000000001') $$,
  '42501', null, 'particulier : pas de compte');
select throws_ok($$ select * from public.admin_search('personnes') $$, '42501', null, 'particulier : pas de recherche');
select throws_ok(
  $$ select public.admin_artisan_activity('be400000-0000-4000-8000-000000000001') $$,
  '42501', null, 'particulier : pas d''activité d''artisan');
select throws_ok(
  $$ select public.admin_suspend_artisan('be400000-0000-4000-8000-000000000001', 'Test') $$,
  '42501', null, 'particulier : ne suspend pas un artisan');
reset role;

select pg_temp.connecter('be300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select * from public.admin_people() $$, '42501', null, 'admin sans double authentification : refusé');
select throws_ok(
  $$ select public.admin_suspend_artisan('be400000-0000-4000-8000-000000000001', 'Test') $$,
  '42501', null, 'admin sans double authentification : suspension refusée');
reset role;

-- ---------- Personnes ----------
select pg_temp.connecter('be300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;

select results_eq(
  $$ select user_id::text, name, email, role, (artisan_id is null), total
     from public.admin_people('tous', 'personnes.client') $$,
  $$ values ('be100000-0000-4000-8000-000000000001', 'Camille Personne', 'personnes.client@example.test',
             'particulier', true, 1::bigint) $$,
  'personne retrouvée par son e-mail, avec son nom et son rôle');
select results_eq(
  $$ select artisan_id::text from public.admin_people('artisans', 'personnes.artisan') $$,
  $$ values ('be400000-0000-4000-8000-000000000001') $$,
  'artisan : fiche artisan liée');
select is_empty(
  $$ select 1 from public.admin_people('particuliers', 'personnes.artisan') $$,
  'filtre par rôle');
select is(
  public.admin_people_counts('personnes.'),
  '{"tous": 3, "particuliers": 1, "artisans": 1, "equipe": 1}'::jsonb,
  'compteurs par rôle');
select ok(
  not exists (select 1 from public.admin_people('tous', null, 100, 0)
              where user_id = 'be100000-0000-4000-8000-000000000002'),
  'session anonyme jamais listée');
select is(
  public.admin_user_account('be100000-0000-4000-8000-000000000001') ->> 'email',
  'personnes.client@example.test', 'compte : e-mail');
select is(public.admin_user_account('be100000-0000-4000-8000-000000000002'), null, 'compte anonyme : rien');

-- ---------- Recherche globale ----------
select results_eq(
  $$ select kind, id::text, label from public.admin_search('personnes artisan sarl') $$,
  $$ values ('artisan', 'be400000-0000-4000-8000-000000000001', 'PERSONNES ARTISAN SARL') $$,
  'recherche : artisan par sa raison sociale');
select results_eq(
  $$ select kind, id::text from public.admin_search('0000 0042') where kind = 'artisan' $$,
  $$ values ('artisan', 'be400000-0000-4000-8000-000000000001') $$,
  'recherche : SIRET saisi avec des espaces');
select results_eq(
  $$ select kind, label, tag from public.admin_search('personnes.client') $$,
  $$ values ('personne', 'Camille Personne', 'particulier') $$,
  'recherche : personne par son e-mail');
select is_empty($$ select 1 from public.admin_search('   ') $$, 'recherche vide : aucun résultat');

-- ---------- Activité d'un artisan ----------
select is(
  public.admin_artisan_activity('be400000-0000-4000-8000-000000000001'),
  '{"demandes": {"total": 0, "en_attente": 0, "acceptees": 0, "refusees": 0, "expirees": 0, "annulees": 0},
    "chantiers": {}, "avis": {"publies": 0, "note_moyenne": null}}'::jsonb,
  'activité d''un artisan sans demande');

-- ---------- Suspension manuelle ----------
select throws_ok(
  $$ select public.admin_suspend_artisan('be400000-0000-4000-8000-000000000001', '  ') $$,
  '22023', null, 'motif obligatoire');
select lives_ok(
  $$ select public.admin_suspend_artisan('be400000-0000-4000-8000-000000000001', 'Plaintes répétées de clients.') $$,
  'artisan suspendu par l''équipe');
select throws_ok(
  $$ select public.admin_suspend_artisan('be400000-0000-4000-8000-000000000001', 'Encore') $$,
  '22023', null, 'déjà suspendu : refusé');
-- Assurances absentes : pas de réactivation.
select throws_ok(
  $$ select public.admin_reactivate_artisan('be400000-0000-4000-8000-000000000001') $$,
  '22023', null, 'réactivation refusée sans assurances à jour');
reset role;

select results_eq(
  $$ select status::text, suspension_reason from public.artisans where id = 'be400000-0000-4000-8000-000000000001' $$,
  $$ values ('suspendu', 'decision_admin') $$,
  'statut et motif de suspension');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'artisan.suspendu' and target_id = 'be400000-0000-4000-8000-000000000001'
            and data ->> 'motif' = 'Plaintes répétées de clients.'),
  'suspension journalisée avec son motif');
select results_eq(
  $$ select data ->> 'par', data ->> 'motif' from public.notifications
     where user_id = 'be200000-0000-4000-8000-000000000001' and type = 'compte_suspendu' $$,
  $$ values ('equipe', 'Plaintes répétées de clients.') $$,
  'artisan prévenu du motif');

insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, status)
values
  ('be400000-0000-4000-8000-000000000001', 'decennale', 'be400000-0000-4000-8000-000000000001/d.pdf',
   'application/pdf', 1000, current_date + 200, 'valide'),
  ('be400000-0000-4000-8000-000000000001', 'rc_pro', 'be400000-0000-4000-8000-000000000001/r.pdf',
   'application/pdf', 1000, current_date + 200, 'valide');

select pg_temp.connecter('be300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select lives_ok(
  $$ select public.admin_reactivate_artisan('be400000-0000-4000-8000-000000000001') $$,
  'suspension levée, assurances à jour');
reset role;
select results_eq(
  $$ select status::text, suspension_reason from public.artisans where id = 'be400000-0000-4000-8000-000000000001' $$,
  $$ values ('valide', null::text) $$,
  'artisan de nouveau validé');
select is(
  (select data ->> 'par' from public.notifications
   where user_id = 'be200000-0000-4000-8000-000000000001' and type = 'compte_reactive'),
  'equipe', 'artisan prévenu de la levée');

-- Une suspension pour assurance expirée ne se lève pas à la main.
update public.artisans set status = 'suspendu', suspension_reason = 'documents_expires'
where id = 'be400000-0000-4000-8000-000000000001';
select pg_temp.connecter('be300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select throws_ok(
  $$ select public.admin_reactivate_artisan('be400000-0000-4000-8000-000000000001') $$,
  '22023', null, 'suspension automatique : levée par le renouvellement, pas à la main');
reset role;

select * from finish();
rollback;
