-- F-181 (ADR 0378) : pièce d'identité recto verso. Colonnes, contraintes, et droits inchangés de
-- artisan_documents pour chaque rôle.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('17401740-0000-4000-8000-000000000001', 'piece.a1@example.test', '{}', '{"account_type":"artisan","siret":"00017410200012"}'),
  ('17401740-0000-4000-8000-000000000002', 'piece.a2@example.test', '{}', '{"account_type":"artisan","siret":"00017420100012"}'),
  ('17401740-0000-4000-8000-000000000003', 'piece.part@example.test', '{}', '{}'),
  ('17401740-0000-4000-8000-000000000004', 'piece.sup@example.test', '{"role":"support"}', '{}'),
  ('17401740-0000-4000-8000-000000000005', 'piece.adm@example.test', '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid;
$$;

-- ---------- Colonnes ----------
select has_column('public', 'artisan_documents', 'piece', 'colonne piece');
select has_column('public', 'artisan_documents', 'verso_path', 'colonne verso_path');
select has_column('public', 'artisan_documents', 'verso_mime_type', 'colonne verso_mime_type');
select col_not_null('public', 'artisan_documents', 'partage_stripe', 'partage_stripe obligatoire');
select col_default_is('public', 'artisan_documents', 'partage_stripe', 'true', 'transmission à Stripe acceptée par défaut');

-- ---------- Contraintes (écriture par le serveur) ----------
select lives_ok(
  $$ insert into public.artisan_documents
       (artisan_id, type, storage_path, mime_type, size_bytes, piece, verso_path, verso_mime_type, partage_stripe)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'identite', 'a1/recto.jpg', 'image/jpeg', 1000,
             'carte_identite', 'a1/verso.jpg', 'image/jpeg', false) $$,
  'carte d''identité : recto, verso et refus de transmission enregistrés');
select lives_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000002'), 'identite', 'a2/passeport.jpg', 'image/jpeg', 1000, 'passeport') $$,
  'passeport : une seule page');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'identite', 'a1/x.jpg', 'image/jpeg', 10, 'permis') $$,
  '23514', null, 'pièce inconnue refusée');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'rc_pro', 'a1/rc.pdf', 'application/pdf', 10, 'passeport') $$,
  '23514', null, 'type de pièce réservé à la pièce d''identité');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, verso_path, verso_mime_type)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'rc_pro', 'a1/rc.pdf', 'application/pdf', 10, 'a1/v.jpg', 'image/jpeg') $$,
  '23514', null, 'verso réservé à la pièce d''identité');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece, verso_path, verso_mime_type)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'identite', 'a1/p.jpg', 'image/jpeg', 10, 'passeport', 'a1/v.jpg', 'image/jpeg') $$,
  '23514', null, 'pas de verso pour un passeport');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece, verso_path)
     values (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), 'identite', 'a1/c.jpg', 'image/jpeg', 10, 'carte_identite', 'a1/v.jpg') $$,
  '23514', null, 'verso sans type de fichier refusé');

-- ---------- Artisan A1 : sa pièce seulement, en lecture ----------
select pg_temp.connecter('17401740-0000-4000-8000-000000000001', 'artisan_en_attente');
set local role authenticated;
select results_eq(
  $$ select piece, verso_path, partage_stripe from public.artisan_documents where type = 'identite' $$,
  $$ values ('carte_identite'::text, 'a1/verso.jpg'::text, false) $$,
  'artisan : lit le type, le verso et son choix pour sa propre pièce, et aucune autre');
select throws_ok(
  $$ update public.artisan_documents set partage_stripe = true $$,
  '42501', null, 'artisan : ne modifie pas directement son choix (écriture par le serveur)');
select throws_ok(
  $$ insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, piece)
     values (app.my_artisan_id(), 'identite', 'x/p.jpg', 'image/jpeg', 10, 'passeport') $$,
  '42501', null, 'artisan : pas d''écriture directe');
reset role;

-- ---------- Artisan A2 : ne voit pas la pièce de A1 ----------
select pg_temp.connecter('17401740-0000-4000-8000-000000000002', 'artisan_en_attente');
set local role authenticated;
select results_eq(
  $$ select piece from public.artisan_documents where type = 'identite' $$,
  $$ values ('passeport'::text) $$,
  'autre artisan : seulement sa propre pièce');
reset role;

-- ---------- Particulier ----------
select pg_temp.connecter('17401740-0000-4000-8000-000000000003', 'particulier');
set local role authenticated;
select is_empty($$ select 1 from public.artisan_documents where type = 'identite' $$, 'particulier : aucune pièce');
reset role;

-- ---------- Support et administrateur ----------
select pg_temp.connecter('17401740-0000-4000-8000-000000000004', 'support', 'aal2');
set local role authenticated;
select results_eq(
  $$ select count(*)::int from public.artisan_documents where type = 'identite' and artisan_id in
       (pg_temp.artisan('17401740-0000-4000-8000-000000000001'), pg_temp.artisan('17401740-0000-4000-8000-000000000002')) $$,
  $$ values (2) $$, 'support : lit les pièces pour les vérifier');
reset role;
select pg_temp.connecter('17401740-0000-4000-8000-000000000005', 'admin', 'aal2');
set local role authenticated;
select results_eq(
  $$ select verso_path from public.artisan_documents where artisan_id = pg_temp.artisan('17401740-0000-4000-8000-000000000001') and type = 'identite' $$,
  $$ values ('a1/verso.jpg'::text) $$, 'administrateur : lit le verso');
reset role;

-- ---------- Visiteur ----------
set local role anon;
select throws_ok('select piece from public.artisan_documents', '42501', null, 'visiteur : aucune pièce');
reset role;

select * from finish();
rollback;
