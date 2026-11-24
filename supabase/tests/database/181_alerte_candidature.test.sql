-- F-188 (ADR 0389) : chaque nouvelle candidature de commercial prévient les administrateurs
-- (e-mail et cloche), pas le support ni les autres comptes. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1810000-0000-4000-8000-000000000001', 'cand.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1810000-0000-4000-8000-000000000002', 'cand.support@example.test', false, now(), '{"role":"support"}', '{}');

insert into public.commercial_candidates (id, first_name, last_name, email, phone, sector, legal_status,
  sees_artisans, experience, availability, source)
values ('c1820000-0000-4000-8000-000000000001', 'Marc', 'Exemple', 'marc.exemple@example.test',
  '+33700000181', 'Cannes', 'auto_entrepreneur', false, 'aucune', 'temps_partiel', 'facebook');

select results_eq(
  $$ select data ->> 'prenom', data ->> 'nom', data ->> 'secteur', (data ->> 'cv')::boolean
     from public.notifications
     where type = 'equipe_nouvelle_candidature' and user_id = 'c1810000-0000-4000-8000-000000000001'
       and data ->> 'candidate_id' = 'c1820000-0000-4000-8000-000000000001' $$,
  $$ values ('Marc', 'Exemple', 'Cannes', false) $$,
  'nouvelle candidature : admin prévenu, sans CV');
select is_empty(
  $$ select 1 from public.notifications
     where type = 'equipe_nouvelle_candidature' and user_id = 'c1810000-0000-4000-8000-000000000002' $$,
  'nouvelle candidature : pas le support');
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_nouvelle_candidature'
     and data ->> 'candidate_id' = 'c1820000-0000-4000-8000-000000000001'),
  (select count(*)::int from public.profiles where role = 'admin'),
  'nouvelle candidature : une alerte par administrateur');

-- Le suivi de la candidature (changement d'étape) ne relance pas l'alerte.
update public.commercial_candidates set stage = 'a_appeler'
where id = 'c1820000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.notifications
   where type = 'equipe_nouvelle_candidature' and user_id = 'c1810000-0000-4000-8000-000000000001'),
  1, 'changement d''étape : pas de seconde alerte');

select * from finish();
rollback;
