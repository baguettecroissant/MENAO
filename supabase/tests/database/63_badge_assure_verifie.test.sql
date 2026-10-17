-- Badge « Assuré et vérifié » (ADR 0119) : artisan validé, entreprise active, décennale (ou
-- métiers non soumis), RC Pro et attestation URSSAF validées et à jour ; exposé par la fiche
-- publique, les résultats de recherche et les pages publiques. Données fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6300000-0000-4000-8000-000000000001', 'badge63.complet@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6300000-0000-4000-8000-000000000002', 'badge63.exempt@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6300000-0000-4000-8000-000000000003', 'badge63.ferme@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('c6300000-0000-4000-8000-000000000004', 'badge63.brouillon@example.test', false, now(), '{}', '{"account_type":"artisan"}');

insert into public.artisans (id, user_id, status, siret, raison_sociale, forme_juridique_code, adresse_ligne,
  adresse_code_postal, adresse_commune, zone_mode, assujetti_tva, sirene_checked_at, sirene_active, decennale_non_soumis)
values
  ('c6310000-0000-4000-8000-000000000001', 'c6300000-0000-4000-8000-000000000001', 'valide',
   '00000063000004', 'COMPLET EXEMPLE', '5710', '1 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true, false),
  ('c6310000-0000-4000-8000-000000000002', 'c6300000-0000-4000-8000-000000000002', 'valide',
   '00000063000012', 'NETTOYAGE EXEMPLE', '5710', '2 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), true, true),
  ('c6310000-0000-4000-8000-000000000003', 'c6300000-0000-4000-8000-000000000003', 'valide',
   '00000063000020', 'FERMEE EXEMPLE', '5710', '3 RUE DE L''EXEMPLE', '06000', 'NICE', 'communes', true, now(), false, false);

create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid
$$;
create function pg_temp.deposer(p_artisan uuid, p_types text[]) returns void language sql as $$
  insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, status,
    date_emission, date_fin, assureur)
  select p_artisan, t::public.document_type, p_artisan || '/' || t || '.pdf', 'application/pdf', 1000, 'valide',
    case when t = 'urssaf' then current_date - 10 end,
    case when t in ('decennale', 'rc_pro') then current_date + 200 end,
    case when t in ('decennale', 'rc_pro') then 'Assurances Exemple' end
  from unnest(p_types) as t
$$;

select pg_temp.deposer('c6310000-0000-4000-8000-000000000001', array['decennale', 'rc_pro', 'urssaf']);
select pg_temp.deposer('c6310000-0000-4000-8000-000000000002', array['rc_pro', 'urssaf']);
select pg_temp.deposer('c6310000-0000-4000-8000-000000000003', array['decennale', 'rc_pro', 'urssaf']);
select pg_temp.deposer(pg_temp.artisan('c6300000-0000-4000-8000-000000000004'), array['decennale', 'rc_pro', 'urssaf']);

-- ---------- Règle du badge ----------
select ok(app.artisan_verified_badge('c6310000-0000-4000-8000-000000000001'),
  'décennale, RC Pro, URSSAF et entreprise active : badge');
select ok(app.artisan_verified_badge('c6310000-0000-4000-8000-000000000002'),
  'métiers non soumis : badge sans décennale');
select ok(not app.artisan_verified_badge('c6310000-0000-4000-8000-000000000003'),
  'entreprise fermée selon l''INSEE : pas de badge');
select ok(not app.artisan_verified_badge(pg_temp.artisan('c6300000-0000-4000-8000-000000000004')),
  'dossier non validé : pas de badge');
select ok(not app.artisan_verified_badge('00000000-0000-4000-8000-000000000000'),
  'artisan inconnu : pas de badge (jamais « inconnu »)');

update public.artisan_documents set status = 'en_attente'
where artisan_id = 'c6310000-0000-4000-8000-000000000001' and type = 'urssaf';
select ok(not app.artisan_verified_badge('c6310000-0000-4000-8000-000000000001'),
  'attestation URSSAF pas encore validée : pas de badge');
update public.artisan_documents set status = 'valide'
where artisan_id = 'c6310000-0000-4000-8000-000000000001' and type = 'urssaf';
update public.artisan_documents set date_fin = current_date - 1
where artisan_id = 'c6310000-0000-4000-8000-000000000001' and type = 'rc_pro';
select ok(not app.artisan_verified_badge('c6310000-0000-4000-8000-000000000001'),
  'RC Pro expirée : pas de badge');
update public.artisan_documents set date_fin = current_date + 200
where artisan_id = 'c6310000-0000-4000-8000-000000000001' and type = 'rc_pro';

-- ---------- Fiche publique ----------
select is(
  (select jsonb_build_object('verified', j -> 'verified', 'exempt', j -> 'decennale_exempt',
     'rc_insurer', j -> 'rc_pro' -> 'insurer')
   from app.artisan_profile_json('c6310000-0000-4000-8000-000000000001') j),
  '{"verified": true, "exempt": false, "rc_insurer": "Assurances Exemple"}'::jsonb,
  'fiche publique : badge, décennale exigée, RC Pro');
select is(
  (select jsonb_build_object('verified', j -> 'verified', 'exempt', j -> 'decennale_exempt',
     'decennale', j -> 'decennale')
   from app.artisan_profile_json('c6310000-0000-4000-8000-000000000002') j),
  '{"verified": true, "exempt": true, "decennale": null}'::jsonb,
  'fiche publique : métiers non soumis, sans décennale');

-- ---------- Recherche et pages publiques : colonne du badge ----------
select ok('verified' = any (select unnest(proargnames) from pg_proc where proname = 'match_artisans'),
  'résultats de recherche : badge renvoyé');
set local role anon;
select lives_ok($$ select artisan_id, verified from public.public_artisans_for_commune('plombier', '06088') $$,
  'pages publiques : badge renvoyé, lisibles par les visiteurs');
select throws_ok($$ select app.artisan_verified_badge('c6310000-0000-4000-8000-000000000001') $$,
  '42501', null, 'visiteur : fonction interne inaccessible');
reset role;

select * from finish();
rollback;
