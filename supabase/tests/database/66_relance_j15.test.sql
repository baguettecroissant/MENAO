-- Relance à J-15 (ADR 0122) : une relance par seuil, J-30, J-15 puis J-7 avant l'expiration d'un
-- document ; pas de deuxième relance pour un même seuil ; l'équipe en copie à chaque seuil pour
-- les documents dont l'expiration suspend l'artisan. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6600000-0000-4000-8000-000000000001', 'relance66.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');
insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva)
values ('c6610000-0000-4000-8000-000000000001', 'c6600000-0000-4000-8000-000000000001', 'valide',
  '00000066000001', 'RELANCE EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true);
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, status, date_fin, assureur)
values ('c6610000-0000-4000-8000-000000000001', 'rc_pro', 'r66/rc.pdf', 'application/pdf', 1000, 'valide',
  current_date + 20, 'Assurances Exemple');

-- Isolement : les autres documents sont considérés comme relancés.
update public.artisan_documents set renewal_reminder_days = 7 where storage_path <> 'r66/rc.pdf';

create function pg_temp.relances() returns setof integer language sql as $$
  select (n.data ->> 'jours')::int from public.notifications n
  where n.user_id = 'c6600000-0000-4000-8000-000000000001' and n.type = 'document_a_renouveler'
  order by n.created_at, (n.data ->> 'jours')::int desc
$$;

select is(app.remind_expiring_documents(current_date), 1, 'J-20 : relance du seuil de 30 jours');
select is(app.remind_expiring_documents(current_date + 5), 1, 'J-15 : relance du seuil de 15 jours');
select is(app.remind_expiring_documents(current_date + 7), 0, 'J-13 : seuil de 15 jours déjà relancé');
select is(app.remind_expiring_documents(current_date + 13), 1, 'J-7 : relance du seuil de 7 jours');
select is(app.remind_expiring_documents(current_date + 14), 0, 'J-6 : seuil de 7 jours déjà relancé');
select results_eq($$ select * from pg_temp.relances() $$, $$ values (20), (15), (7) $$,
  'trois relances : à J-20, J-15 et J-7');
select is(
  (select renewal_reminder_days::int from public.artisan_documents where storage_path = 'r66/rc.pdf'),
  7, 'dernier seuil relancé enregistré');
select is(
  (select count(*)::int from public.notifications
   where type = 'document_a_renouveler_equipe' and data ->> 'entreprise' = 'RELANCE EXEMPLE'),
  3 * (select count(*)::int from public.profiles where role = 'admin'),
  'équipe : une copie par admin à chaque seuil');

select * from finish();
rollback;
