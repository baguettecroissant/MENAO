-- Décennale et métiers (ADR 0116) : « non soumis » déclaré par l'artisan tant que le dossier
-- n'est pas envoyé ; décennale alors ni exigée à l'envoi, ni pour rester actif ; métiers couverts
-- enregistrés avec l'attestation ; documents incomplets toujours détectés.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c6000000-0000-4000-8000-000000000001', 'dec60.exempt@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c6000000-0000-4000-8000-000000000002', 'dec60.normal@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c6000000-0000-4000-8000-000000000003', 'dec60.envoye@example.test', false, now(), '{}', '{"account_type":"artisan"}');

create function pg_temp.connecter(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', 'aal1',
    'app_metadata', jsonb_build_object('role', 'artisan_en_attente')
  )::text, true);
$$;
create function pg_temp.artisan(uid uuid) returns uuid language sql as $$
  select id from public.artisans where user_id = uid
$$;

update public.artisans set status = 'en_verification', submitted_at = now()
where user_id = 'c6000000-0000-4000-8000-000000000003';

-- ---------- Documents incomplets : toujours « faux », jamais « inconnu » ----------
select is(app.documents_complete(pg_temp.artisan('c6000000-0000-4000-8000-000000000002'),
  array['en_attente', 'valide']::public.document_status[]), false, 'sans document : incomplet');

-- ---------- Déclaration « non soumis » ----------
select pg_temp.connecter('c6000000-0000-4000-8000-000000000001');
set local role authenticated;
select lives_ok($$ select public.set_decennale_non_soumis(true) $$, 'déclaration « non soumis »');
reset role;
select is((select decennale_non_soumis from public.artisans where user_id = 'c6000000-0000-4000-8000-000000000001'),
  true, 'déclaration enregistrée');

select pg_temp.connecter('c6000000-0000-4000-8000-000000000003');
set local role authenticated;
select throws_ok($$ select public.set_decennale_non_soumis(true) $$, '22023',
  'Le dossier ne peut plus être modifié.', 'impossible une fois le dossier envoyé');
reset role;

-- ---------- Quatre documents sans décennale ----------
insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin)
select pg_temp.artisan(u.id), d.type::public.document_type, u.n || '/' || d.type || '.pdf', 'application/pdf', 1000, d.emission, d.fin
from (values ('c6000000-0000-4000-8000-000000000001'::uuid, 'exempt'), ('c6000000-0000-4000-8000-000000000002'::uuid, 'normal'))
       as u (id, n),
     (values ('kbis', current_date - 10, null::date), ('rc_pro', null, current_date + 200),
             ('identite', null, null), ('urssaf', current_date - 20, null)) as d (type, emission, fin);

select is(app.documents_complete(pg_temp.artisan('c6000000-0000-4000-8000-000000000001'),
  array['en_attente', 'valide']::public.document_status[]), true, '« non soumis » : complet sans décennale');
select is(app.documents_complete(pg_temp.artisan('c6000000-0000-4000-8000-000000000002'),
  array['en_attente', 'valide']::public.document_status[]), false, 'sinon, la décennale manque');
select ok(not ('documents' = any (app.onboarding_missing_steps(pg_temp.artisan('c6000000-0000-4000-8000-000000000001')))),
  '« non soumis » : l''étape documents est terminée');

-- ---------- Rester actif sans décennale ----------
update public.artisan_documents set status = 'valide'
where artisan_id in (pg_temp.artisan('c6000000-0000-4000-8000-000000000001'), pg_temp.artisan('c6000000-0000-4000-8000-000000000002'));
select ok(app.artisan_insurances_valid(pg_temp.artisan('c6000000-0000-4000-8000-000000000001')),
  '« non soumis » : RC Pro à jour suffit');
select ok(not app.artisan_insurances_valid(pg_temp.artisan('c6000000-0000-4000-8000-000000000002')),
  'sinon, décennale exigée');

-- ---------- Métiers couverts par l'attestation ----------
select lives_ok($$
  insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_fin, covered_trades)
  values (pg_temp.artisan('c6000000-0000-4000-8000-000000000002'), 'decennale', 'normal/decennale.pdf',
          'application/pdf', 1000, current_date + 200, array['plombier', 'chauffagiste']) $$,
  'métiers couverts enregistrés avec la décennale');
select is(app.documents_complete(pg_temp.artisan('c6000000-0000-4000-8000-000000000002'),
  array['en_attente', 'valide']::public.document_status[]), true, 'avec la décennale : complet');

select * from finish();
rollback;
