-- F-20, F-35, F-25 : logo de l'entreprise sur les documents (ADR 0038). Colonne écrite par le
-- serveur seul, bucket privé, lecture par l'artisan, les clients dont un document porte le logo et
-- l'équipe ; logo figé à l'envoi du devis ; « Retirer le logo ».
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('b8100000-0000-4000-8000-000000000001', 'logo.a@example.test', false, now(), '{}', '{"first_name":"Camille","last_name":"Exemple"}'),
  ('b8100000-0000-4000-8000-000000000002', 'logo.b@example.test', false, now(), '{}', '{"first_name":"Alex","last_name":"Exemple"}'),
  ('b8200000-0000-4000-8000-000000000001', 'logo.artisan@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Xavier"}'),
  ('b8200000-0000-4000-8000-000000000002', 'logo.autre@example.test', false, now(), '{"role":"artisan"}', '{"first_name":"Yasmine"}'),
  ('b8300000-0000-4000-8000-000000000001', 'logo.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva) values
  ('b8400000-0000-4000-8000-000000000001', 'b8200000-0000-4000-8000-000000000001', 'valide', '00000002600013',
   'ARTISAN LOGO', '5710', '4 RUE DE LA PAIX', '75002', 'PARIS', 'communes', true, 'acct_logo', true),
  ('b8400000-0000-4000-8000-000000000002', 'b8200000-0000-4000-8000-000000000002', 'valide', '00000001800010',
   'ARTISAN AUTRE', '1000', '8 RUE DU PORT', '06300', 'NICE', 'communes', true, 'acct_logo_autre', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('b8400000-0000-4000-8000-000000000001', 'decennale', 'b8400000-0000-4000-8000-000000000001/decennale.pdf',
  'application/pdf', 1000, current_date + 200, 'DEC-1', 'Assurances Exemple', 'France métropolitaine', 'valide');
insert into public.projects (id, user_id, status, description, summary, trade_code, ville_code_insee, ville_nom,
  code_postal, adresse, location, criteria_validated_at) values
  ('b8500000-0000-4000-8000-000000000001', 'b8100000-0000-4000-8000-000000000001', 'demande_envoyee',
   'Ajouter des prises.', 'Installation de prises', 'electricien', '06088', 'Nice', '06000',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', now());
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone) values
  ('b8600000-0000-4000-8000-000000000001', 'b8500000-0000-4000-8000-000000000001',
   'b8400000-0000-4000-8000-000000000001', 'b8100000-0000-4000-8000-000000000001', '+33612345678');

-- Logos rangés par process-upload (clé serveur) : ancien logo inutilisé, logo actuel, autre artisan.
update public.artisans set logo_path = 'b8400000-0000-4000-8000-000000000001/logo-1.png'
where id = 'b8400000-0000-4000-8000-000000000001';
insert into storage.objects (bucket_id, name) values
  ('artisan-logos', 'b8400000-0000-4000-8000-000000000001/logo-0.png'),
  ('artisan-logos', 'b8400000-0000-4000-8000-000000000001/logo-1.png'),
  ('artisan-logos', 'b8400000-0000-4000-8000-000000000002/logo.png');

select results_eq($$ select public from storage.buckets where id = 'artisan-logos' $$, $$ values (false) $$,
  'bucket des logos privé');

-- ---------- Artisan : son logo, rien de plus ----------
select pg_temp.connecter('b8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select throws_ok($$ update public.artisans set logo_path = 'b8400000-0000-4000-8000-000000000002/logo.png' $$,
  '42501', null, 'artisan : ne choisit pas lui-même le fichier de son logo');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('artisan-logos', 'b8400000-0000-4000-8000-000000000001/x.png') $$,
  '42501', null, 'artisan : aucun dépôt direct dans le bucket des logos');
select results_eq(
  $$ select name from storage.objects where bucket_id = 'artisan-logos' order by name $$,
  $$ values ('b8400000-0000-4000-8000-000000000001/logo-0.png'::text),
            ('b8400000-0000-4000-8000-000000000001/logo-1.png'::text) $$,
  'artisan : lit ses logos, pas ceux des autres');

select set_config('test.chantier',
  public.artisan_fix_appointment('b8600000-0000-4000-8000-000000000001', current_date + 2, '10:00')::text, true);
select set_config('test.devis', public.artisan_save_quote_draft(current_setting('test.chantier')::uuid, $j$[
  {"type":"materiel","designation":"Prise de courant","quantityMilli":4000,"unit":"u","unitPriceHtCents":2250,"vatRateBp":1000}
]$j$::jsonb)::text, true);
select is(public.quote_document(current_setting('test.devis')::uuid) #>> '{issuer,logo_path}',
  'b8400000-0000-4000-8000-000000000001/logo-1.png', 'brouillon : logo actuel de l''artisan');

-- ---------- Particulier : rien avant l'envoi ----------
reset role;
select pg_temp.connecter('b8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'artisan-logos'), 0,
  'particulier : aucun logo avant l''envoi du devis');

-- ---------- Envoi : logo figé ; l'artisan le remplace ensuite ----------
reset role;
select pg_temp.connecter('b8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select lives_ok($$ select public.artisan_send_quote(current_setting('test.devis')::uuid, 30, current_date + 10, 2) $$,
  'devis envoyé avec le logo');
reset role;
update public.artisans set logo_path = 'b8400000-0000-4000-8000-000000000001/logo-2.png'
where id = 'b8400000-0000-4000-8000-000000000001';
insert into storage.objects (bucket_id, name) values ('artisan-logos', 'b8400000-0000-4000-8000-000000000001/logo-2.png');

select ok(app.artisan_logo_in_use('b8400000-0000-4000-8000-000000000001/logo-1.png'), 'logo d''un devis envoyé : utilisé');
select ok(app.artisan_logo_in_use('b8400000-0000-4000-8000-000000000001/logo-2.png'), 'logo actuel : utilisé');
select ok(not app.artisan_logo_in_use('b8400000-0000-4000-8000-000000000001/logo-0.png'), 'ancien logo : supprimable');
select policy_cmd_is('storage', 'objects', 'artisan-logos : suppression de ses logos inutilisés', 'DELETE',
  'suppression limitée aux logos inutilisés');

select pg_temp.connecter('b8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.quote_document(current_setting('test.devis')::uuid) #>> '{issuer,logo_path}',
  'b8400000-0000-4000-8000-000000000001/logo-1.png', 'devis envoyé : logo figé à l''envoi');
select results_eq(
  $$ select name from storage.objects where bucket_id = 'artisan-logos' $$,
  $$ values ('b8400000-0000-4000-8000-000000000001/logo-1.png'::text) $$,
  'particulier : lit le logo de son devis, pas les autres');

reset role;
select pg_temp.connecter('b8100000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'artisan-logos'), 0,
  'autre particulier : aucun logo');

reset role;
select pg_temp.connecter('b8200000-0000-4000-8000-000000000002', 'artisan');
set local role authenticated;
select results_eq(
  $$ select name from storage.objects where bucket_id = 'artisan-logos' $$,
  $$ values ('b8400000-0000-4000-8000-000000000002/logo.png'::text) $$,
  'autre artisan : son logo seulement');

reset role;
select pg_temp.connecter('b8300000-0000-4000-8000-000000000001', 'support');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'artisan-logos'), 4,
  'équipe : tous les logos');

-- ---------- « Retirer le logo » ----------
reset role;
select pg_temp.connecter('b8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.artisan_remove_logo(), null, 'particulier : aucun logo à retirer');
reset role;
select pg_temp.connecter('b8200000-0000-4000-8000-000000000001', 'artisan');
set local role authenticated;
select is(public.artisan_remove_logo(), 'b8400000-0000-4000-8000-000000000001/logo-2.png',
  'artisan : retire son logo (ancien chemin renvoyé)');
select is(public.artisan_remove_logo(), null, 'plus de logo à retirer');
reset role;
select pg_temp.connecter('b8100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select results_eq(
  $$ select name from storage.objects where bucket_id = 'artisan-logos' $$,
  $$ values ('b8400000-0000-4000-8000-000000000001/logo-1.png'::text) $$,
  'logo retiré : le devis envoyé garde le sien');
reset role;
select is((select logo_path from public.artisans where id = 'b8400000-0000-4000-8000-000000000001'), null,
  'logo retiré de la fiche');

-- ---------- Décennale validée et renouvellement en attente (F-51) ----------
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, numero, assureur, couverture, status)
values ('b8400000-0000-4000-8000-000000000001', 'decennale', 'b8400000-0000-4000-8000-000000000001/decennale-2.pdf',
  'application/pdf', 1000, current_date + 565, 'DEC-2', 'Assurances Exemple', 'France métropolitaine', 'en_attente');
select is(app.quote_live_document(current_setting('test.devis')::uuid) #>> '{issuer,decennale,numero}', 'DEC-1',
  'renouvellement en attente : l''attestation validée reste celle du devis');

select * from finish();
rollback;
