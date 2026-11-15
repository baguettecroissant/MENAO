-- Symboles corrigés par l'artisan (F-159, lot 7, PR B, ADR 0337) : la page corrigée est remplacée,
-- les autres pages restent. Données fictives (identifiants e159…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1590000-0000-4000-8000-000000000001', 'corriges159.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('e1590000-0000-4000-8000-000000000002', 'corriges159.autre@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1591000-0000-4000-8000-000000000001', 'e1590000-0000-4000-8000-000000000001', 'valide', 'CORRIGES 159', 'communes', true),
  ('e1591000-0000-4000-8000-000000000002', 'e1590000-0000-4000-8000-000000000002', 'valide', 'AUTRE 159', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1591000-0000-4000-8000-000000000001', 'entreprise', 'cus_e159a', 'sub_e159a', 'active'),
  ('e1591000-0000-4000-8000-000000000002', 'entreprise', 'cus_e159b', 'sub_e159b', 'active');

create function pg_temp.ao() returns uuid language sql as
  $$ select id from public.tenders where name = 'Maison 159' $$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1590000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 159',
  '[{"path":"e1591000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c5901.pdf","name":"plans.pdf"}]'::jsonb,
  array['electricien']) $$, 'création');
select is(public.artisan_import_plan_symbols(pg_temp.ao(),
  '[{"file":1,"page":1,"type":"prise","x":10,"y":10,"doubt":false},
    {"file":1,"page":2,"type":"interrupteur","x":20,"y":20,"doubt":true},
    {"file":1,"page":2,"type":"interrupteur","x":20,"y":40,"doubt":true}]'::jsonb), 3, 'symboles lus');

-- Page 2 corrigée : un interrupteur ajouté, le doute tranché.
select is(public.artisan_save_plan_symbols(pg_temp.ao(), 1, 2,
  '[{"file":9,"page":9,"type":"interrupteur","x":20,"y":20},
    {"type":"interrupteur","x":20,"y":40},
    {"type":"interrupteur","x":20,"y":60,"room":"Salon"}]'::jsonb), 3, 'page corrigée');
select results_eq(
  $$ select s ->> 'page', s ->> 'type', s ->> 'doubt', s ->> 'room'
     from public.tenders, jsonb_array_elements(plan_symbols) s where id = pg_temp.ao() $$,
  $$ values ('1'::text, 'prise'::text, 'false'::text, null::text),
       ('2', 'interrupteur', 'false', null), ('2', 'interrupteur', 'false', null),
       ('2', 'interrupteur', 'false', 'Salon') $$,
  'les autres pages restent, la page corrigée est remplacée');
select throws_ok($$ select public.artisan_save_plan_symbols(pg_temp.ao(), 0, 1, '[]'::jsonb) $$,
  '22023', null, 'page invalide refusée');

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1590000-0000-4000-8000-000000000002', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);
select throws_ok($$ select public.artisan_save_plan_symbols(
  (select id from public.tenders where name = 'Maison 159'), 1, 1, '[]'::jsonb) $$, '22023', null,
  'correction refusée à une autre entreprise');

select * from finish();
rollback;
