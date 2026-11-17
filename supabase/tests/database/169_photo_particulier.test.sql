-- Photo de profil du particulier (F-169, ADR 0360) : l'artisan qui a accepté la demande la voit
-- sur la fiche de la demande et du chantier ; celui qui ne l'a pas encore acceptée ne la voit pas ;
-- un autre artisan n'a rien ; personne ne peut écrire le chemin de sa photo soi-même. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('f6900000-0000-4000-8000-000000000001', 'photo169.a@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f6900000-0000-4000-8000-000000000002', 'photo169.b@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f6900000-0000-4000-8000-000000000003', 'photo169.c@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('f6900000-0000-4000-8000-000000000004', 'photo169.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('f6910000-0000-4000-8000-000000000001', 'f6900000-0000-4000-8000-000000000001', 'valide', 'PHOTO A', 'communes'),
  ('f6910000-0000-4000-8000-000000000002', 'f6900000-0000-4000-8000-000000000002', 'valide', 'PHOTO B', 'communes'),
  ('f6910000-0000-4000-8000-000000000003', 'f6900000-0000-4000-8000-000000000003', 'valide', 'PHOTO C', 'communes');
update public.profiles set first_name = 'Camille', last_name = 'Durand',
  avatar_path = 'f6900000-0000-4000-8000-000000000004/portrait.jpg'
where user_id = 'f6900000-0000-4000-8000-000000000004';

insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('f6920000-0000-4000-8000-00000000000' || a)::uuid, 'f6900000-0000-4000-8000-000000000004',
  'Projet ' || a, 'electricien', '06088', 'Nice'
from generate_series(1, 2) a;
-- Artisan A : demande acceptée, avec son chantier. Artisan B : demande pas encore acceptée.
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, expires_at, status) values
  ('f6930000-0000-4000-8000-000000000001', 'f6920000-0000-4000-8000-000000000001',
   'f6910000-0000-4000-8000-000000000001', 'f6900000-0000-4000-8000-000000000004', '+33612345678',
   now() + interval '1 day', 'acceptee'),
  ('f6930000-0000-4000-8000-000000000002', 'f6920000-0000-4000-8000-000000000002',
   'f6910000-0000-4000-8000-000000000002', 'f6900000-0000-4000-8000-000000000004', '+33612345678',
   now() + interval '1 day', 'envoyee');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title) values
  ('f6940000-0000-4000-8000-000000000001', 'f6920000-0000-4000-8000-000000000001',
   'f6930000-0000-4000-8000-000000000001', 'f6910000-0000-4000-8000-000000000001',
   'f6900000-0000-4000-8000-000000000004', 'Mise aux normes');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Artisan qui a accepté la demande ----------
select pg_temp.connecter('f6900000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is(
  public.artisan_request_detail('f6930000-0000-4000-8000-000000000001') -> 'client' ->> 'avatar_path',
  'f6900000-0000-4000-8000-000000000004/portrait.jpg', 'demande acceptée : la photo du client est donnée');
select is(
  public.artisan_chantier_detail('f6940000-0000-4000-8000-000000000001') -> 'client' ->> 'avatar_path',
  'f6900000-0000-4000-8000-000000000004/portrait.jpg', 'fiche du chantier : la photo du client est donnée');
select is(
  public.artisan_request_detail('f6930000-0000-4000-8000-000000000002'), null,
  'la demande d''un autre artisan reste illisible');

-- ---------- Artisan qui n'a pas encore accepté ----------
reset role;
select pg_temp.connecter('f6900000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select is(
  public.artisan_request_detail('f6930000-0000-4000-8000-000000000002') -> 'client' ->> 'first_name',
  'Camille', 'demande reçue : le prénom est donné');
select is(
  public.artisan_request_detail('f6930000-0000-4000-8000-000000000002') -> 'client' ->> 'avatar_path',
  null, 'demande pas encore acceptée : pas de photo, comme pour le nom et le téléphone');

-- ---------- Artisan sans lien avec le client ----------
reset role;
select pg_temp.connecter('f6900000-0000-4000-8000-000000000003', 'artisan');
set local role authenticated;
select is(
  public.artisan_request_detail('f6930000-0000-4000-8000-000000000001'), null,
  'artisan sans lien : rien');
select is(
  (select count(*)::int from public.profiles where user_id = 'f6900000-0000-4000-8000-000000000004'),
  0, 'artisan sans lien : le profil du client reste illisible');

-- ---------- Le particulier ne choisit pas lui-même le chemin de sa photo ----------
reset role;
select pg_temp.connecter('f6900000-0000-4000-8000-000000000004', 'particulier');
set local role authenticated;
select throws_ok(
  $$ update public.profiles set avatar_path = 'ailleurs/photo.jpg'
     where user_id = 'f6900000-0000-4000-8000-000000000004' $$,
  '42501', null, 'le chemin de la photo ne s''écrit que par le serveur');

reset role;
select * from finish();
rollback;
