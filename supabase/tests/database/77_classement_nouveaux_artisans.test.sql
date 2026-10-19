-- ADR 0151 : classement des artisans proposés. Disponibles tout de suite d'abord, puis le score ;
-- place réservée à un nouvel artisan (3e place) quand aucun ne figure parmi les 5 premiers.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data) values
  ('e7000000-0000-4000-8000-000000000001', null, true, '{}', '{}');
insert into auth.users (id, email, is_anonymous, raw_app_meta_data, raw_user_meta_data)
select ('e7100000-0000-4000-8000-00000000000' || n)::uuid, 'classement.a' || n || '@example.test', false,
  '{"role":"artisan"}', '{}'
from generate_series(1, 7) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e7200000-0000-4000-8000-00000000000' || n)::uuid
$$;

-- Sept plombiers à Nice, tous visibles. 1 à 6 : anciens (validés il y a 200 jours, 3 chantiers
-- réceptionnés, très bien notés). 7 : nouveau (aucun chantier, pas d'avis).
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled, paused)
select pg_temp.artisan(n), ('e7100000-0000-4000-8000-00000000000' || n)::uuid, 'valide',
  'CLASSEMENT ' || n, 'communes', true, false
from generate_series(1, 7) n;
insert into public.artisan_trades (artisan_id, trade_code) select pg_temp.artisan(n), 'plombier' from generate_series(1, 7) n;
insert into public.artisan_zones (artisan_id, code_insee, nom) select pg_temp.artisan(n), '06088', 'Nice' from generate_series(1, 7) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_cl_' || n, 'sub_cl_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 7) n;
insert into public.artisan_reviews (artisan_id, decision, created_at)
select pg_temp.artisan(n), 'valide', now() - interval '200 days' from generate_series(1, 6) n;
insert into public.artisan_scores (artisan_id, review_count, quality, delays, communication, value_for_money, global_score)
select pg_temp.artisan(n), 10, 95, 95, 95, 95, 95 from generate_series(1, 6) n;

-- Trois chantiers réceptionnés par ancien (un projet et une demande chacun).
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom)
select ('e7300000-0000-4000-8000-0000000000' || lpad((n * 10 + k)::text, 2, '0'))::uuid,
  'e7000000-0000-4000-8000-000000000001', 'Chantier passé', 'plombier', '06088', 'Nice'
from generate_series(1, 6) n, generate_series(1, 3) k;
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone)
select ('e7400000-0000-4000-8000-0000000000' || lpad((n * 10 + k)::text, 2, '0'))::uuid,
  ('e7300000-0000-4000-8000-0000000000' || lpad((n * 10 + k)::text, 2, '0'))::uuid,
  pg_temp.artisan(n), 'e7000000-0000-4000-8000-000000000001', '+33612345678'
from generate_series(1, 6) n, generate_series(1, 3) k;
insert into public.chantiers (project_id, request_id, artisan_id, particulier_id, title)
select ('e7300000-0000-4000-8000-0000000000' || lpad((n * 10 + k)::text, 2, '0'))::uuid,
  ('e7400000-0000-4000-8000-0000000000' || lpad((n * 10 + k)::text, 2, '0'))::uuid,
  pg_temp.artisan(n), 'e7000000-0000-4000-8000-000000000001', 'Chantier passé'
from generate_series(1, 6) n, generate_series(1, 3) k;
-- État final posé directement, comme le test du score de la charte (garde-fou levé le temps de l'écriture).
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'receptionne' where artisan_id::text like 'e7200000-%';
select set_config('menao.transition_chantier', '', true);

-- Le projet du client.
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom, ville_location) values
  ('e7500000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000001', 'Fuite sous l''évier',
   'plombier', '06088', 'Nice', 'SRID=4326;POINT(7.262 43.71)');

-- Isolement : les autres artisans (seed, autres tests) sont mis en pause le temps du test.
update public.artisans set paused = true where id::text not like 'e7200000-%';

-- ---------- Nouvel artisan ----------
select ok(app.artisan_is_newcomer(pg_temp.artisan(7)), 'sans validation ni chantier : nouveau');
select ok(not app.artisan_is_newcomer(pg_temp.artisan(1)), 'validé il y a 200 jours, 3 chantiers : ancien');
select set_config('menao.transition_chantier', 'on', true);
update public.chantiers set status = 'annule' where request_id = 'e7400000-0000-4000-8000-000000000061';
select ok(app.artisan_is_newcomer(pg_temp.artisan(6)), 'moins de 3 chantiers menés à terme : encore nouveau');
update public.chantiers set status = 'receptionne' where request_id = 'e7400000-0000-4000-8000-000000000061';
select set_config('menao.transition_chantier', '', true);
select ok(
  (select score from app.artisan_charter_score(pg_temp.artisan(7)))
    < (select min(s.score) from generate_series(1, 6) n cross join lateral app.artisan_charter_score(pg_temp.artisan(n)) s),
  'le nouveau a le score le plus bas');

-- ---------- Place réservée ----------
select pg_temp.connecter('e7000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(
  (select artisan_id from public.match_artisans('e7500000-0000-4000-8000-000000000001') offset 2 limit 1),
  pg_temp.artisan(7), 'aucun nouveau parmi les 5 premiers : le nouveau prend la 3e place');
select is((select count(*)::int from public.match_artisans('e7500000-0000-4000-8000-000000000001')), 5,
  'toujours 5 artisans proposés');
select is((select count(*)::int from public.match_artisans('e7500000-0000-4000-8000-000000000001', 20)), 7,
  'liste complète : tous les candidats, une seule fois');
reset role;

-- ---------- Disponibilité avant le score ----------
update public.artisans set available_from = current_date + 10 where id = pg_temp.artisan(1);
update public.artisan_scores set global_score = 100 where artisan_id = pg_temp.artisan(1);
select pg_temp.connecter('e7000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(
  (select artisan_id from public.match_artisans('e7500000-0000-4000-8000-000000000001', 20) offset 6 limit 1),
  pg_temp.artisan(1), 'le mieux noté, mais complet pour 10 jours : après tous les artisans disponibles');
select is(
  (select artisan_id from public.match_artisans('e7500000-0000-4000-8000-000000000001') offset 2 limit 1),
  pg_temp.artisan(7), 'le nouveau garde la 3e place');
reset role;

-- ---------- Nouveau déjà parmi les 5 premiers : ordre au mérite inchangé ----------
update public.artisans set available_from = null where id = pg_temp.artisan(1);
update public.artisans set paused = true where id in (pg_temp.artisan(4), pg_temp.artisan(5), pg_temp.artisan(6));
select pg_temp.connecter('e7000000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select is(
  (select artisan_id from public.match_artisans('e7500000-0000-4000-8000-000000000001') offset 3 limit 1),
  pg_temp.artisan(7), 'quatre candidats : le nouveau reste à sa place, la 4e');
reset role;

select * from finish();
rollback;
