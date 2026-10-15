-- Rappel hebdomadaire du planning (ADR 0107) : artisans visibles et hors pause dont le planning n'a
-- ni changé ni été confirmé depuis 7 jours ; une relance par semaine au plus ; préférence
-- « rappels » ; tâche réservée à la base.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c5400000-0000-4000-8000-00000000000' || n)::uuid, 'planning.' || n || '@example.test', false, now(),
  '{"role":"artisan"}', jsonb_build_object('first_name', 'Artisan ' || n)
from generate_series(1, 5) n;

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1', 'app_metadata', jsonb_build_object('role', 'artisan')
  )::text, true);
$$;

-- A : planning de 10 jours ; B : de 2 jours ; C : jamais confirmé ; D : en pause ; E : sans
-- abonnement, donc invisible des clients.
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, connect_charges_enabled, stripe_account_id, assujetti_tva,
  paused, planning_updated_at) values
  ('c5410000-0000-4000-8000-000000000001', 'c5400000-0000-4000-8000-000000000001', 'valide', '00000001800010',
   'ARTISAN A', '5710', '1 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_planning_1', true,
   false, now() - interval '10 days'),
  ('c5410000-0000-4000-8000-000000000002', 'c5400000-0000-4000-8000-000000000002', 'valide', '00000002600013',
   'ARTISAN B', '5710', '2 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_planning_2', true,
   false, now() - interval '2 days'),
  ('c5410000-0000-4000-8000-000000000003', 'c5400000-0000-4000-8000-000000000003', 'valide', '00000004200010',
   'ARTISAN C', '5710', '3 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_planning_3', true,
   false, null),
  ('c5410000-0000-4000-8000-000000000004', 'c5400000-0000-4000-8000-000000000004', 'valide', '00000005900014',
   'ARTISAN D', '5710', '4 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_planning_4', true,
   true, now() - interval '30 days'),
  ('c5410000-0000-4000-8000-000000000005', 'c5400000-0000-4000-8000-000000000005', 'valide', null,
   'ARTISAN E', '5710', '5 RUE DE LA PAIX', '06000', 'NICE', 'communes', true, 'acct_planning_5', true,
   false, now() - interval '30 days');
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end)
select ('c5410000-0000-4000-8000-00000000000' || n)::uuid, 'base', 'cus_planning_' || n, 'sub_planning_' || n,
  'trialing', now() + interval '30 days'
from generate_series(1, 4) n;

-- ---------- Lundi : A (10 jours) et C (jamais) ----------
select is(app.remind_planning(), 2, 'A et C relancés ; B à jour, D en pause, E invisible');
select results_eq(
  $$ select user_id, data ->> 'jours' from public.notifications where type = 'planning_relance' order by user_id $$,
  $$ values ('c5400000-0000-4000-8000-000000000001'::uuid, '10'::text),
            ('c5400000-0000-4000-8000-000000000003'::uuid, null) $$,
  'A : jours écoulés ; C : jamais confirmé (aucun nombre)');
select is(app.remind_planning(now() + interval '1 day'), 0, 'pas deux relances la même semaine');

-- ---------- Une semaine plus tard : B n'a pas touché à son planning ----------
select is(app.remind_planning(now() + interval '7 days'), 3, 'semaine suivante : A, B et C relancés');
select is((select count(*)::int from public.notifications where type = 'planning_relance'
  and user_id in ('c5400000-0000-4000-8000-000000000004', 'c5400000-0000-4000-8000-000000000005')), 0,
  'jamais de relance en pause ni sans être visible');

-- ---------- Planning confirmé : plus de relance ----------
select pg_temp.connecter('c5400000-0000-4000-8000-000000000001');
set local role authenticated;
select isnt(public.artisan_confirm_planning(), null, 'A confirme son planning');
select is((select count(*)::int from public.notifications where type = 'planning_relance'), 2,
  'A ne voit que ses propres relances');
reset role;
select is(app.remind_planning(now() + interval '6 days'), 2,
  'six jours après la confirmation : B et C relancés, pas A');
select is((select count(*)::int from public.notifications where type = 'planning_relance'
  and user_id = 'c5400000-0000-4000-8000-000000000001'), 2, 'A : pas de nouvelle relance');

-- ---------- Préférences et droits ----------
select is(app.notification_category('planning_relance'), 'rappels', 'relance désactivable (« rappels »)');
select ok(not has_function_privilege('authenticated', 'app.remind_planning(timestamptz)', 'execute'),
  'artisans : ne lancent pas la relance');
select ok(not has_function_privilege('anon', 'app.remind_planning(timestamptz)', 'execute'),
  'visiteurs : pas de relance');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-planning' and schedule = '0 7 * * 1'),
  'tâche planifiée chaque lundi');

select * from finish();
rollback;
