-- Budget minimum de l'artisan (ADR 0164) : réglage par l'artisan (tranches à partir de 1 000 €) ;
-- une demande au budget inférieur ne lui est pas proposée ni envoyable ; sans budget, elle reste
-- proposée à tous. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8700000-0000-4000-8000-000000000001', 'lot87.client@example.test', false, now(), '{"role":"particulier"}', '{}');
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('e8700000-0000-4000-8000-00000000001' || n)::uuid, 'lot87.a' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, 2) n;

create function pg_temp.connecter(uid uuid, app_role text) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select ('e8710000-0000-4000-8000-00000000000' || n)::uuid
$$;
create function pg_temp.propose(n int) returns boolean language sql as $$
  select exists (
    select 1 from public.match_artisans('e8720000-0000-4000-8000-000000000001', 20) m where m.artisan_id = pg_temp.artisan(n)
  )
$$;

-- Deux plombiers visibles à Nice.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, connect_charges_enabled)
select pg_temp.artisan(n), ('e8700000-0000-4000-8000-00000000001' || n)::uuid, 'valide', 'BUDGET ' || n, 'communes', true
from generate_series(1, 2) n;
insert into public.artisan_trades (artisan_id, trade_code) select pg_temp.artisan(n), 'plombier' from generate_series(1, 2) n;
insert into public.artisan_zones (artisan_id, code_insee, nom) select pg_temp.artisan(n), '06088', 'Nice' from generate_series(1, 2) n;
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select pg_temp.artisan(n), 'base', 'cus_l87_' || n, 'sub_l87_' || n, 'trialing', now() + interval '30 days'
from generate_series(1, 2) n;
insert into public.projects (id, user_id, status, description, trade_code, ville_code_insee, ville_nom, budget,
  criteria_validated_at) values
  ('e8720000-0000-4000-8000-000000000001', 'e8700000-0000-4000-8000-000000000001', 'criteres_valides',
   'Fuite sous l''évier', 'plombier', '06088', 'Nice', '1000_5000', now());

-- ---------- Réglage ----------
select pg_temp.connecter('e8700000-0000-4000-8000-000000000011', 'artisan');
set local role authenticated;
select lives_ok($$ select public.set_artisan_budget_minimum('5000_15000') $$, 'l''artisan règle son budget minimum');
select is((select budget_minimum::text from public.artisans where id = pg_temp.artisan(1)), '5000_15000', 'minimum enregistré');
select throws_ok($$ select public.set_artisan_budget_minimum('moins_1000') $$, '22023', 'Budget minimum inconnu.',
  'moins de 1 000 € n''est pas un minimum');
select throws_ok($$ select public.set_artisan_budget_minimum('beaucoup') $$, '22023', 'Budget minimum inconnu.',
  'tranche inconnue refusée');
select pg_temp.connecter('e8700000-0000-4000-8000-000000000001', 'particulier');
select throws_ok($$ select public.set_artisan_budget_minimum('5000_15000') $$, '42501', null, 'réservé aux artisans');
reset role;

-- ---------- Recherche d'artisans ----------
select pg_temp.connecter('e8700000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select ok(not pg_temp.propose(1), 'budget de 1 000 à 5 000 € : l''artisan qui veut 5 000 € et plus n''est pas proposé');
select ok(pg_temp.propose(2), 'l''artisan sans minimum est proposé');
select throws_ok(
  $$ select public.send_project_requests('e8720000-0000-4000-8000-000000000001',
       array[pg_temp.artisan(1)], null, '+33612345678', 'des_que_possible', null, null) $$,
  '22023', 'Un des artisans choisis n''est plus disponible pour ce projet',
  'demande impossible à envoyer à l''artisan écarté');
reset role;

update public.projects set budget = '15000_50000' where id = 'e8720000-0000-4000-8000-000000000001';
select pg_temp.connecter('e8700000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select ok(pg_temp.propose(1), 'budget de 15 000 à 50 000 € : proposé');
reset role;

update public.projects set budget = null where id = 'e8720000-0000-4000-8000-000000000001';
select pg_temp.connecter('e8700000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select ok(pg_temp.propose(1), 'sans budget annoncé : proposé à tous');
reset role;

select throws_ok($$ update public.artisans set budget_minimum = 'moins_1000' where id = pg_temp.artisan(2) $$,
  '23514', null, 'contrainte en base');

select * from finish();
rollback;
