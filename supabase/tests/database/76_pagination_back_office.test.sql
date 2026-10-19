-- Pagination du back-office (ADR 0146) : l'activité se lit page par page, sans doublon ni trou
-- d'une page à l'autre, se filtre par type d'événement et reste réservée aux admins ; la liste des
-- parrainages n'est plus coupée à 200 lignes. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c7600000-0000-4000-8000-000000000001', 'pag76.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c7600000-0000-4000-8000-000000000002', 'pag76.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c7600000-0000-4000-8000-000000000003', 'pag76.parrain@example.test', false, now(), '{"role":"artisan"}', '{}');
-- Six recherches à des heures distinctes, dont deux à la même heure.
insert into public.projects (user_id, status, description, trade_code, ville_code_insee, ville_nom, created_at)
select 'c7600000-0000-4000-8000-000000000002', 'demande_envoyee', 'Projet ' || n, 'plombier', '06088', 'Nice',
  now() + make_interval(mins => least(n, 5))
from generate_series(1, 6) n;

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Réservé aux admins ----------
select pg_temp.connecter('c7600000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select throws_ok($$ select * from public.admin_activity(10, 10, array['recherche']) $$, '42501', null,
  'particulier : pas d''activité, même paginée');
reset role;

-- ---------- Pages successives ----------
select pg_temp.connecter('c7600000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq(
  $$ (select occurred_at, kind, details from public.admin_activity(3, 0, array['recherche']))
     union all
     (select occurred_at, kind, details from public.admin_activity(3, 3, array['recherche'])) $$,
  $$ select occurred_at, kind, details from public.admin_activity(6, 0, array['recherche']) $$,
  'deux pages de 3 = la première page de 6, dans le même ordre (heures égales comprises)');
select ok(
  (select bool_and(kind = 'recherche') from public.admin_activity(50, 0, array['recherche'])),
  'filtre : seulement les types demandés');
select ok(
  (select count(*) from public.admin_activity(50, 0, array['avis', 'abonnement'])
   where kind not in ('avis', 'abonnement')) = 0,
  'filtre à plusieurs types');
select is((select count(*)::int from public.admin_activity(100, 999999)), 0,
  'décalage borné : au-delà de 5 000 événements, page vide sans erreur');
reset role;

-- ---------- Parrainages : plus de limite à 200 ----------
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c7610000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'pag76.filleul' || n || '@example.test',
  false, now(), '{"role":"artisan"}', '{}'
from generate_series(1, 205) n;
insert into public.artisans (id, user_id, status, zone_mode, assujetti_tva) values
  ('c7620000-0000-4000-8000-000000000000', 'c7600000-0000-4000-8000-000000000003', 'valide', 'communes', true);
insert into public.artisans (id, user_id, status, zone_mode, assujetti_tva)
select ('c7620000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('c7610000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'brouillon', 'communes', true
from generate_series(1, 205) n;
insert into public.artisan_referrals (referrer_artisan_id, referred_artisan_id, status)
select 'c7620000-0000-4000-8000-000000000000', ('c7620000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'en_attente'
from generate_series(1, 205) n;
select pg_temp.connecter('c7600000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  (select count(*)::int from public.admin_referrals() where referrer_id = 'c7620000-0000-4000-8000-000000000000'),
  205, 'les 205 parrainages sont listés (pagination par l''interface)');
reset role;

select * from finish();
rollback;
