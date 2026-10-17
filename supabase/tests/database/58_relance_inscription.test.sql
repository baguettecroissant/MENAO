-- Relances de l'inscription artisan abandonnée (ADR 0112) : fiche en brouillon et adresse
-- confirmée ; relance n°1 à J+1, n°2 à J+3, n°3 à J+7, jamais deux le même jour ni plus de trois ;
-- préférence « rappels » ; tâche réservée à la base.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- A : fiche de 2 jours ; B : de 12 heures ; C : adresse non confirmée ; D : dossier envoyé ;
-- E : compléments demandés par l'équipe (fiche ancienne).
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c5800000-0000-4000-8000-00000000000' || n)::uuid, 'relance58.' || n || '@example.test', false,
  case when n = 3 then null else now() end, '{}', '{"account_type":"artisan"}'
from generate_series(1, 5) n;

update public.artisans set created_at = case user_id
    when 'c5800000-0000-4000-8000-000000000001' then now() - interval '2 days'
    when 'c5800000-0000-4000-8000-000000000002' then now() - interval '12 hours'
    when 'c5800000-0000-4000-8000-000000000003' then now() - interval '2 days'
    when 'c5800000-0000-4000-8000-000000000004' then now() - interval '2 days'
    when 'c5800000-0000-4000-8000-000000000005' then now() - interval '40 days'
  end
where user_id::text like 'c5800000%';
update public.artisans set status = 'en_verification', submitted_at = now()
where user_id = 'c5800000-0000-4000-8000-000000000004';
update public.artisans set refusal_reason = 'Attestation de RC Pro illisible'
where user_id = 'c5800000-0000-4000-8000-000000000005';

-- Fiches du jeu de données de base : hors du test.
update public.artisans set created_at = now() + interval '1 year' where user_id::text not like 'c5800000%';

-- ---------- Premier passage : A et E ----------
select is(app.remind_signup(), 2, 'A et E relancés ; B trop récent, C non confirmé, D envoyé');
select results_eq(
  $$ select user_id, data ->> 'etape', data ->> 'pret', data ->> 'complement'
     from public.notifications where type = 'inscription_relance' order by user_id $$,
  $$ values ('c5800000-0000-4000-8000-000000000001'::uuid, '1'::text, 'false'::text, 'false'::text),
            ('c5800000-0000-4000-8000-000000000005'::uuid, '1', 'false', 'true') $$,
  'relance n°1 : dossier incomplet ; compléments demandés pour E');
select is(app.remind_signup(), 0, 'pas deux relances le même jour');
select is(app.remind_signup(now() + interval '1 day'), 0, 'deuxième relance pas avant J+3');

-- ---------- J+3 puis J+7 ----------
select is(app.remind_signup(now() + interval '2 days'), 2, 'J+3 (fiche de 2 jours + 2) : A et E');
select is(app.remind_signup(now() + interval '6 days'), 2, 'J+7 : A et E, troisième relance');
select is(app.remind_signup(now() + interval '30 days'), 1, 'B relancé une première fois, mais plus A ni E');
select results_eq(
  $$ select user_id, count(*)::int from public.notifications where type = 'inscription_relance'
     group by user_id order by user_id $$,
  $$ values ('c5800000-0000-4000-8000-000000000001'::uuid, 3),
            ('c5800000-0000-4000-8000-000000000002'::uuid, 1),
            ('c5800000-0000-4000-8000-000000000005'::uuid, 3) $$,
  'trois relances au plus ; jamais pour une adresse non confirmée ni un dossier envoyé');

-- ---------- Étapes manquantes (même calcul que l'envoi du dossier) ----------
select is(
  app.onboarding_missing_steps((select id from public.artisans where user_id = 'c5800000-0000-4000-8000-000000000001')),
  array['entreprise', 'metiers', 'zone', 'charte', 'documents', 'profil'],
  'fiche vide : toutes les étapes manquent');

-- ---------- Préférences et droits ----------
select is(app.notification_category('inscription_relance'), 'rappels', 'relance désactivable (« rappels »)');
select ok(not has_function_privilege('authenticated', 'app.remind_signup(timestamptz)', 'execute'),
  'artisans : ne lancent pas la relance');
select ok(not has_function_privilege('authenticated', 'app.onboarding_missing_steps(uuid)', 'execute'),
  'étapes manquantes : calcul réservé à la base');
select ok(exists (select 1 from cron.job where jobname = 'menao-relance-inscription' and schedule = '0 8 * * *'),
  'tâche planifiée chaque jour');

select * from finish();
rollback;
