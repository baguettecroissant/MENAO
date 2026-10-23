-- Notification « mois offert » (ADR 0166) : l'artisan qui reçoit son mois offert de démarrage est
-- prévenu (e-mail et espace web), jamais en push ; un mois de parrainage ne déclenche rien.
-- Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('e8900000-0000-4000-8000-000000000001', 'lot89.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('e8910000-0000-4000-8000-000000000001', 'e8900000-0000-4000-8000-000000000001', 'valide', 'OFFERT 89', 'communes');
insert into public.push_tokens (user_id, token, platform) values
  ('e8900000-0000-4000-8000-000000000001', 'ExponentPushToken[lot89-fictif]', 'ios');

insert into public.artisan_free_months (artisan_id, reason) values ('e8910000-0000-4000-8000-000000000001', 'parrainage');
select is_empty($$ select 1 from public.notifications where type = 'mois_offert' $$,
  'mois de parrainage : pas de notification « mois offert »');

insert into public.artisan_free_months (artisan_id, reason) values ('e8910000-0000-4000-8000-000000000001', 'demarrage');
select results_eq(
  $$ select user_id, data ->> 'raison' from public.notifications where type = 'mois_offert' $$,
  $$ values ('e8900000-0000-4000-8000-000000000001'::uuid, 'demarrage') $$,
  'mois offert de démarrage : l''artisan est prévenu');
select is_empty(
  $$ select 1 from public.notifications where type = 'mois_offert' and push_status is not null $$,
  'jamais en push (règle 10)');

select * from finish();
rollback;
