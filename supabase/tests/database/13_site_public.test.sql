-- F-01 à F-03 : communes pilotes, artisans d'une commune (public), chiffres, page Contact.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('e9000000-0000-4000-8000-000000000001', 'pub.a1@example.test', '{"role":"artisan"}', '{"first_name":"Agathe"}'),
  ('e9000000-0000-4000-8000-000000000002', 'pub.a2@example.test', '{"role":"artisan"}', '{"first_name":"Bruno"}'),
  ('e9000000-0000-4000-8000-000000000003', 'pub.a3@example.test', '{"role":"artisan"}', '{}'),
  ('e9000000-0000-4000-8000-000000000004', 'pub.support@example.test', '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- Isolement : artisans du seed hors visibilité pendant le test.
update public.artisans set connect_charges_enabled = false;

-- A1 : peintre, 20 km autour de Nice ; A2 : peintre à Antibes ; A3 : peintre sans abonnement.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, base_label, base_location, radius_km,
  connect_charges_enabled) values
  ('e9100000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000001', 'valide', 'AGATHE PEINTURE', 'rayon',
   '1 Rue de l''Exemple 06000 Nice', 'SRID=4326;POINT(7.26 43.70)', 20, true),
  ('e9100000-0000-4000-8000-000000000002', 'e9000000-0000-4000-8000-000000000002', 'valide', 'BRUNO PEINTURE', 'communes',
   null, null, null, true),
  ('e9100000-0000-4000-8000-000000000003', 'e9000000-0000-4000-8000-000000000003', 'valide', 'SANS ABONNEMENT', 'communes',
   null, null, null, true);
insert into public.artisan_trades (artisan_id, trade_code) values
  ('e9100000-0000-4000-8000-000000000001', 'peintre'), ('e9100000-0000-4000-8000-000000000002', 'peintre'),
  ('e9100000-0000-4000-8000-000000000003', 'peintre');
insert into public.artisan_zones (artisan_id, code_insee, nom) values
  ('e9100000-0000-4000-8000-000000000002', '06004', 'Antibes'), ('e9100000-0000-4000-8000-000000000003', '06004', 'Antibes');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end) values
  ('e9100000-0000-4000-8000-000000000001', 'base', 'cus_pub_1', 'sub_pub_1', 'trialing', now() + interval '30 days'),
  ('e9100000-0000-4000-8000-000000000002', 'base', 'cus_pub_2', 'sub_pub_2', 'trialing', now() + interval '30 days');

-- ---------- Sans session ----------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select is((select count(*)::int from public.communes where pilote), 15, '15 communes pilotes lisibles');
select results_eq(
  $$ select display_name from public.public_artisans_for_commune('peintre', '06088') $$,
  $$ values ('Agathe'::text) $$, 'Nice : artisan dont le rayon couvre la commune');
select results_eq(
  $$ select display_name from public.public_artisans_for_commune('peintre', '06027') $$,
  $$ values ('Agathe'::text) $$, 'Cagnes-sur-Mer : dans le rayon de 20 km');
select is_empty($$ select * from public.public_artisans_for_commune('peintre', '06069') $$, 'Grasse : hors rayon');
select results_eq(
  $$ select display_name from public.public_artisans_for_commune('peintre', '06004') order by 1 $$,
  $$ values ('Agathe'::text), ('Bruno'::text) $$,
  'Antibes (18 km de Nice) : rayon et communes, sans l''artisan non abonné');
select is_empty($$ select * from public.public_artisans_for_commune('plombier', '06004') $$, 'autre métier : aucun');
select ok((public.public_stats() ->> 'artisans')::int >= 2, 'chiffres réels lisibles sans session');

select throws_ok($$ select public.send_contact_message('pas-un-email', 'Sujet', 'Bonjour') $$,
  '22023', 'Adresse e-mail invalide', 'e-mail obligatoire et valide');
select throws_ok($$ select public.send_contact_message('contact@example.test', 'Sujet', '  ') $$,
  '22023', 'Message obligatoire', 'message obligatoire');
select lives_ok($$ select public.send_contact_message('Contact@Example.test', 'Question', 'Bonjour MENAO') $$,
  'message envoyé sans compte');
select lives_ok($$ select public.send_contact_message('contact@example.test', null, 'Deuxième') $$, 'deuxième message');
select lives_ok($$ select public.send_contact_message('contact@example.test', null, 'Troisième') $$, 'troisième message');
select throws_ok($$ select public.send_contact_message('contact@example.test', null, 'Quatrième') $$,
  '22023', 'Trop de messages envoyés. Réessayez demain.', '3 messages par e-mail et par 24 h');
select is((select count(*)::int from public.tickets), 0, 'tickets invisibles sans session');
select throws_ok($$ insert into public.communes (code_insee, slug, nom, departement, location)
  values ('06001', 'test', 'Test', '06', 'SRID=4326;POINT(7 43)') $$, '42501', null, 'référentiel en lecture seule');

-- ---------- Équipe ----------
reset role;
select pg_temp.connecter('e9000000-0000-4000-8000-000000000004', 'support');
set local role authenticated;
select results_eq(
  $$ select contact_email, subject, user_id is null from public.tickets where type = 'contact' order by created_at limit 1 $$,
  $$ values ('contact@example.test'::text, 'Question'::text, true) $$, 'message reçu par l''équipe');

select * from finish();
rollback;
