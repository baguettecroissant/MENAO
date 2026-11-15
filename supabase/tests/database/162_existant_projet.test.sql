-- Existant et projet (F-159, ADR 0340) : type et rôle de chaque plan gardés. Données fictives
-- (identifiants e162…).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e1620000-0000-4000-8000-000000000001', 'existant162.entreprise@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, assujetti_tva) values
  ('e1621000-0000-4000-8000-000000000001', 'e1620000-0000-4000-8000-000000000001', 'valide', 'EXISTANT 162', 'communes', true);
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status) values
  ('e1621000-0000-4000-8000-000000000001', 'entreprise', 'cus_e162a', 'sub_e162a', 'active');

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', 'e1620000-0000-4000-8000-000000000001', 'role', 'authenticated', 'aal', 'aal1',
  'app_metadata', jsonb_build_object('role', 'artisan'))::text, true);

select lives_ok($$ select public.artisan_create_plan_tender('Maison 162',
  '[{"path":"e1621000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6201.jpg","name":"demolition.jpg"},
    {"path":"e1621000-0000-4000-8000-000000000001/0b6f3c4e-1d2a-4b5c-8d9e-0f1a2b3c6202.jpg","name":"cloisons.jpg"}]'::jsonb,
  array['plaquiste']) $$, 'création');
select is(public.artisan_import_plan_symbols((select id from public.tenders where name = 'Maison 162'),
  '[]'::jsonb, '[]'::jsonb, '{}'::jsonb,
  '[{"file":1,"page":1,"label":" démolition ","role":"existant"},
    {"file":2,"page":1,"label":"cloisons et menuiseries","role":"projet"},
    {"file":3,"page":1,"label":"inconnu","role":"autre"}]'::jsonb), 0, 'types de plans envoyés');
select is((select plan_page_labels from public.tenders where name = 'Maison 162'),
  '[{"file":1,"page":1,"label":"démolition","role":"existant"},
    {"file":2,"page":1,"label":"cloisons et menuiseries","role":"projet"}]'::jsonb,
  'type nettoyé et rôle gardés, rôle inconnu écarté');

select * from finish();
rollback;
