-- Entreprise déjà inscrite (ADR 0175) : siret_registered répond oui pour un SIRET déjà rattaché à
-- un compte, non sinon (inconnu ou mal formé), y compris pour un visiteur. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e9400000-0000-4000-8000-000000000001', 'siret94.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, siret, zone_mode) values
  ('e9410000-0000-4000-8000-000000000001', 'e9400000-0000-4000-8000-000000000001', 'brouillon', '00000940000003', 'communes');

set local role anon;
select is(public.siret_registered('00000940000003'), true, 'SIRET déjà rattaché : oui, même pour un visiteur');
select is(public.siret_registered('00000940100001'), false, 'SIRET libre : non');
select is(public.siret_registered('123'), false, 'SIRET mal formé : non');
select is(public.siret_registered(null), false, 'sans SIRET : non');
reset role;

select * from finish();
rollback;
