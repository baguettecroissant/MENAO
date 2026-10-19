-- Pages co-marquées (F-59, lot 3, ADR 0142) : page lue sans compte seulement si un admin l'a
-- activée et si le partenaire est actif ; nom, code et message, rien d'autre ; réglage réservé
-- aux admins, journalisé ; l'espace partenaire indique si la page est en ligne. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7200000-0000-4000-8000-000000000001', 'page72.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c7200000-0000-4000-8000-000000000002', 'page72.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.partners (id, code, nom, siret, contact_email, notes, dashboard_token) values
  ('c7210000-0000-4000-8000-000000000001', 'agence-page72', 'Agence Exemple', '73282932000074',
   'page72.agence@example.test', 'Note interne confidentielle', repeat('ab', 24));

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Page non activée : rien ----------
set local role anon;
select ok(public.partner_page('agence-page72') is null, 'page non activée : rien');
reset role;

-- ---------- Réglage par un admin seulement ----------
select pg_temp.connecter('c7200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select throws_ok(
  $$ select public.admin_save_partner_page('c7210000-0000-4000-8000-000000000001', true, 'Bonjour') $$,
  '42501', null, 'artisan : réglage impossible');
reset role;

select pg_temp.connecter('c7200000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok(
  format($$ select public.admin_save_partner_page('c7210000-0000-4000-8000-000000000001', true, %L) $$, repeat('a', 401)),
  '22023', 'Message de recommandation : 400 caractères au plus.', 'message trop long : refusé');
select lives_ok(
  $$ select public.admin_save_partner_page('c7210000-0000-4000-8000-000000000001', true,
       '  Nous travaillons avec MENAO pour vos travaux.  ') $$,
  'page activée avec un message');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'partenaire.page'), 1, 'réglage journalisé');

-- ---------- Lecture sans compte ----------
set local role anon;
select is(public.partner_page(' AGENCE-PAGE72 ')::jsonb,
  '{"nom": "Agence Exemple", "code": "agence-page72", "message": "Nous travaillons avec MENAO pour vos travaux."}'::jsonb,
  'visiteur : nom, code et message seulement (ni SIRET, ni e-mail, ni notes)');
select ok(public.partner_page('code-inconnu') is null, 'code inconnu : rien');
select is((public.partner_dashboard(repeat('ab', 24)) ->> 'page_publique')::boolean, true,
  'espace partenaire : la page est signalée en ligne');
reset role;

-- ---------- Partenaire suspendu ou page désactivée : rien ----------
update public.partners set status = 'suspendu' where code = 'agence-page72';
set local role anon;
select ok(public.partner_page('agence-page72') is null, 'partenaire suspendu : plus de page');
reset role;
update public.partners set status = 'actif' where code = 'agence-page72';
select pg_temp.connecter('c7200000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_save_partner_page('c7210000-0000-4000-8000-000000000001', false, '') $$,
  'page désactivée');
reset role;
set local role anon;
select ok(public.partner_page('agence-page72') is null, 'page désactivée : rien');
reset role;
select ok((select page_message is null from public.partners where code = 'agence-page72'),
  'message vide : enregistré comme absent');

select * from finish();
rollback;
