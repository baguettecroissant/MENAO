-- Un seul envoi pour plusieurs métiers (ADR 0170) : demandes envoyées d'un coup dans le chantier
-- et ses lots, avec les mêmes coordonnées ; tout ou rien, le métier qui bloque est nommé ; projets
-- d'un autre chantier, doublons et autre particulier refusés. Données fictives (Nice).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9200000-0000-4000-8000-000000000001', 'envoi92.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('e9200000-0000-4000-8000-000000000002', 'envoi92.autre@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e9200000-0000-4000-8000-00000000001' || n)::uuid, 'envoi92.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 5) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e9210000-0000-4000-8000-00000000000' || n)::uuid
$$;
create function pg_temp.lot(p_trade text) returns uuid language sql as $$
  select id from public.projects where parent_project_id = 'e9220000-0000-4000-8000-000000000001' and trade_code = p_trade
$$;
create function pg_temp.choix(p_project uuid, variadic p_artisans int[]) returns jsonb language sql as $$
  select jsonb_build_object('project_id', p_project,
    'artisan_ids', (select jsonb_agg(pg_temp.artisan(n)) from unnest(p_artisans) n))
$$;

-- 1, 2 : plombiers ; 3, 4 : carreleurs ; 5 : peintre. Rayon de 10 km autour de Nice.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, radius_km, base_location, connect_charges_enabled)
select pg_temp.artisan(n), ('e9200000-0000-4000-8000-00000000001' || n)::uuid, 'valide', 'ENVOI ' || n, 'rayon', 10,
  extensions.st_setsrid(extensions.st_makepoint(7.27, 43.70), 4326)::extensions.geography, true
from generate_series(1, 5) n;
insert into public.artisan_trades (artisan_id, trade_code)
select pg_temp.artisan(n), case when n <= 2 then 'plombier' when n <= 4 then 'carreleur' else 'peintre' end
from generate_series(1, 5) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_e92_' || n, 'sub_e92_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 5) n;
insert into public.projects (id, user_id, description, summary, trade_code, ville_code_insee, ville_nom, ville_location,
  room_codes, budget) values
  ('e9220000-0000-4000-8000-000000000001', 'e9200000-0000-4000-8000-000000000001',
   'Refaire entièrement la salle de bains', 'Rénovation de salle de bains', 'plombier', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography,
   '{salle-de-bain}', '5000_15000'),
  ('e9220000-0000-4000-8000-000000000002', 'e9200000-0000-4000-8000-000000000001',
   'Peinture du salon', null, 'peintre', '06088', 'Nice',
   extensions.st_setsrid(extensions.st_makepoint(7.26, 43.70), 4326)::extensions.geography,
   '{salon}', '1000_5000');

select pg_temp.connecter('e9200000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select public.set_project_lot_trades('e9220000-0000-4000-8000-000000000001', array['carreleur', 'peintre']);
select public.validate_project_criteria('e9220000-0000-4000-8000-000000000001');
select public.validate_project_criteria('e9220000-0000-4000-8000-000000000002');

-- ---------- Contrôles ----------
select throws_ok($$ select public.send_chantier_requests('e9220000-0000-4000-8000-000000000001', '[]',
  null, '+33612345678', 'des_que_possible', null, null) $$, '22023', 'Sélectionnez au moins un artisan', 'sélection vide');
select throws_ok(format('select public.send_chantier_requests(%L, %L, null, ''+33612345678'', ''des_que_possible'', null, null)',
  'e9220000-0000-4000-8000-000000000001', jsonb_build_array(pg_temp.choix('e9220000-0000-4000-8000-000000000002', 5))),
  '42501', 'Projet introuvable', 'projet d''un autre chantier refusé');
select throws_ok(format('select public.send_chantier_requests(%L, %L, null, ''+33612345678'', ''des_que_possible'', null, null)',
  'e9220000-0000-4000-8000-000000000001', jsonb_build_array(pg_temp.choix(pg_temp.lot('carreleur'), 3), pg_temp.choix(pg_temp.lot('carreleur'), 4))),
  '42501', 'Projet introuvable', 'un lot une seule fois');
select throws_ok(format('select public.send_chantier_requests(%L, %L, null, ''+33612345678'', ''des_que_possible'', null, null)',
  pg_temp.lot('carreleur'), jsonb_build_array(pg_temp.choix(pg_temp.lot('carreleur'), 3))),
  '42501', 'Projet introuvable', 'l''envoi part du chantier, pas d''un lot');
select pg_temp.connecter('e9200000-0000-4000-8000-000000000002', 'particulier');
select throws_ok(format('select public.send_chantier_requests(%L, %L, null, ''+33612345678'', ''des_que_possible'', null, null)',
  'e9220000-0000-4000-8000-000000000001', jsonb_build_array(pg_temp.choix('e9220000-0000-4000-8000-000000000001', 1))),
  '42501', 'Projet introuvable', 'chantier d''un autre particulier');
select pg_temp.connecter('e9200000-0000-4000-8000-000000000001', 'particulier');

-- ---------- Envoi au plombier et aux carreleurs d'un coup ----------
select is(public.send_chantier_requests('e9220000-0000-4000-8000-000000000001',
  jsonb_build_array(pg_temp.choix('e9220000-0000-4000-8000-000000000001', 1), pg_temp.choix(pg_temp.lot('carreleur'), 3, 4)),
  'Bonjour, salle de bains à refaire.', '+33612345678', 'plage', '09:00', '12:00'), 3,
  '3 demandes envoyées en une fois');
reset role;
select results_eq(
  $$ select p.trade_code, count(*)::int, min(q.message), min(q.contact_phone), min(q.callback_from)::text
     from public.requests q join public.projects p on p.id = q.project_id
     where p.id = 'e9220000-0000-4000-8000-000000000001' or p.parent_project_id = 'e9220000-0000-4000-8000-000000000001'
     group by p.trade_code order by p.trade_code $$,
  $$ values ('carreleur', 2, 'Bonjour, salle de bains à refaire.', '+33612345678', '09:00:00'),
            ('plombier', 1, 'Bonjour, salle de bains à refaire.', '+33612345678', '09:00:00') $$,
  'chaque métier reçoit ses demandes, avec les mêmes coordonnées');
select is((select status::text from public.projects where id = pg_temp.lot('carreleur')), 'demande_envoyee',
  'le lot passe en demande envoyée');

-- ---------- Tout ou rien ----------
select pg_temp.connecter('e9200000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok(format('select public.send_chantier_requests(%L, %L, null, ''+33612345678'', ''des_que_possible'', null, null)',
  'e9220000-0000-4000-8000-000000000001', jsonb_build_array(pg_temp.choix(pg_temp.lot('peintre'), 5), pg_temp.choix(pg_temp.lot('carreleur'), 3))),
  '22023', 'Carreleur : Demande déjà envoyée à cet artisan', 'le métier qui bloque est nommé');
reset role;
select is((select count(*)::int from public.requests where project_id = pg_temp.lot('peintre')), 0,
  'refus d''un métier : aucune demande ne part');

-- Le chantier compte pour un seul projet ouvert : un autre de ses lots peut encore être contacté.
select pg_temp.connecter('e9200000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(public.send_chantier_requests('e9220000-0000-4000-8000-000000000001',
  jsonb_build_array(pg_temp.choix(pg_temp.lot('peintre'), 5)), null, '+33612345678', 'des_que_possible', null, null), 1,
  'le lot peinture contacté ensuite');
reset role;

select * from finish();
rollback;
