-- F-179 (ADR 0376) : inscription progressive. Le dossier part avec le Kbis et la pièce
-- d'identité ; les trois attestations suivent, sont relancées, et restent obligatoires pour la
-- validation. Personnes fictives.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- A : brouillon ; B : dossier envoyé il y a 4 jours, sans attestation ; C : dossier envoyé il y a
-- 4 jours, « non soumis » avec RC Pro et URSSAF déposées ; D : validé ; ADM : admin.
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1730000-0000-4000-8000-000000000001', 'prog173.a@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c1730000-0000-4000-8000-000000000002', 'prog173.b@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c1730000-0000-4000-8000-000000000003', 'prog173.c@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c1730000-0000-4000-8000-000000000004', 'prog173.d@example.test', false, now(), '{}', '{"account_type":"artisan"}'),
  ('c1730000-0000-4000-8000-000000000005', 'prog173.adm@example.test', false, now(), '{"role":"admin"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text default 'artisan_en_attente', aal text default 'aal1')
returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
create function pg_temp.artisan(n int) returns uuid language sql as $$
  select id from public.artisans where user_id = ('c1730000-0000-4000-8000-00000000000' || n)::uuid
$$;
create function pg_temp.deposer(n int, doc text, emission date, fin date, etat text default 'en_attente')
returns void language sql as $$
  insert into public.artisan_documents (artisan_id, type, storage_path, mime_type, size_bytes, date_emission, date_fin, status)
  values (pg_temp.artisan(n), doc::public.document_type, n || '/' || doc || '-' || etat || '.pdf', 'application/pdf', 1000,
          emission, fin, etat::public.document_status)
$$;
create function pg_temp.rappels(n int) returns int language sql as $$
  select count(*)::int from public.notifications
  where user_id = ('c1730000-0000-4000-8000-00000000000' || n)::uuid
    and type = 'inscription_relance' and data ->> 'phase' = 'attestations'
$$;

update public.artisans set status = 'en_verification', submitted_at = now() - interval '4 days',
  sirene_active = true, sirene_checked_at = now(), raison_sociale = 'EXEMPLE', assujetti_tva = false
where id in (pg_temp.artisan(2), pg_temp.artisan(3));
update public.artisans set decennale_non_soumis = true where id = pg_temp.artisan(3);
update public.artisans set status = 'valide' where id = pg_temp.artisan(4);

-- ---------- Documents de l'envoi : Kbis et pièce d'identité ----------
select ok('documents' = any (app.onboarding_missing_steps(pg_temp.artisan(1))), 'sans document : « documents » manque');
select pg_temp.deposer(1, 'kbis', current_date - 10, null);
select ok('documents' = any (app.onboarding_missing_steps(pg_temp.artisan(1))), 'Kbis seul : la pièce d''identité manque');
select pg_temp.deposer(1, 'identite', null, null);
select ok(not ('documents' = any (app.onboarding_missing_steps(pg_temp.artisan(1)))),
  'Kbis et pièce d''identité : l''étape documents est faite, sans aucune attestation');
select is(app.documents_complete(pg_temp.artisan(1), array['en_attente', 'valide']::public.document_status[]),
  false, 'le dossier n''est pas complet pour autant : les attestations manquent');
update public.artisan_documents set date_emission = current_date - 100
where artisan_id = pg_temp.artisan(1) and type = 'kbis';
select ok('documents' = any (app.onboarding_missing_steps(pg_temp.artisan(1))), 'Kbis de plus de 3 mois : à refaire');
select ok(not has_function_privilege('authenticated', 'app.send_documents_complete(uuid, public.document_status[])', 'execute'),
  'contrôle interne : pas appelable par les comptes');

-- ---------- Attestations manquantes pour la mise en ligne ----------
select is(app.attestations_missing(pg_temp.artisan(2)), array['decennale', 'rc_pro', 'urssaf'],
  'aucune attestation : les trois manquent');
select pg_temp.deposer(2, 'rc_pro', null, current_date + 200);
select is(app.attestations_missing(pg_temp.artisan(2)), array['decennale', 'urssaf'], 'RC Pro déposée : il en reste deux');
select pg_temp.deposer(2, 'urssaf', current_date - 200, null);
select is(app.attestations_missing(pg_temp.artisan(2)), array['decennale', 'urssaf'],
  'URSSAF de plus de 6 mois : elle manque toujours');
select pg_temp.deposer(3, 'rc_pro', null, current_date + 200);
select pg_temp.deposer(3, 'urssaf', current_date - 20, null);
select is(app.attestations_missing(pg_temp.artisan(3)), '{}'::text[], '« non soumis » avec RC Pro et URSSAF : rien ne manque');

-- ---------- « Non soumis » déclarable après l'envoi, plus une fois validé ----------
select pg_temp.connecter('c1730000-0000-4000-8000-000000000002');
set local role authenticated;
select lives_ok($$ select public.set_decennale_non_soumis(true) $$, 'dossier envoyé : « non soumis » encore déclarable');
select lives_ok($$ select public.set_decennale_non_soumis(false) $$, 'et annulable');
reset role;
select pg_temp.connecter('c1730000-0000-4000-8000-000000000004', 'artisan');
set local role authenticated;
select throws_ok($$ select public.set_decennale_non_soumis(true) $$, '22023',
  'Le dossier ne peut plus être modifié.', 'artisan validé : plus de déclaration');
reset role;

-- ---------- La validation exige toujours tous les documents ----------
update public.artisan_documents set status = 'valide' where artisan_id = pg_temp.artisan(2);
select pg_temp.deposer(2, 'kbis', current_date - 10, null, 'valide');
select pg_temp.deposer(2, 'identite', null, null, 'valide');
select pg_temp.connecter('c1730000-0000-4000-8000-000000000005', 'admin', 'aal2');
set local role authenticated;
select throws_ok(
  $$ select public.admin_decide_artisan(pg_temp.artisan(2), 'valide') $$, '22023',
  'Les 5 documents doivent être validés et en cours de validité.',
  'dossier envoyé sans décennale ni URSSAF valides : validation refusée');
reset role;

-- ---------- Relance des attestations ----------
-- (Le nombre renvoyé par la fonction compte aussi les autres dossiers de la base : on regarde
-- les rappels reçus par chaque dossier du test.)
select lives_ok($$ select app.remind_attestations() $$, 'relance lancée à J+4');
select is(pg_temp.rappels(2), 1, 'dossier B, à qui il manque deux attestations : rappelé');
select is(pg_temp.rappels(3), 0, 'dossier C, complet : jamais rappelé');
select is(pg_temp.rappels(1), 0, 'brouillon : pas de rappel d''attestations');
select is(
  (select data -> 'manque' from public.notifications
   where user_id = 'c1730000-0000-4000-8000-000000000002' and data ->> 'phase' = 'attestations'),
  '["decennale", "urssaf"]'::jsonb, 'le rappel nomme les attestations manquantes');
select app.remind_attestations();
select is(pg_temp.rappels(2), 1, 'pas de second rappel le même jour');
select app.remind_attestations(now() + interval '4 days');
select is(pg_temp.rappels(2), 2, 'J+8 : deuxième rappel');
select app.remind_attestations(now() + interval '11 days');
select is(pg_temp.rappels(2), 3, 'J+15 : troisième rappel');
select app.remind_attestations(now() + interval '27 days');
select is(pg_temp.rappels(2), 4, 'J+31 : quatrième rappel');
select app.remind_attestations(now() + interval '60 days');
select is(pg_temp.rappels(2), 4, 'jamais plus de quatre');
select is(app.notification_category('inscription_relance'), 'rappels', 'rappel désactivable (« rappels »)');
select ok(not has_function_privilege('authenticated', 'app.remind_attestations(timestamptz)', 'execute'),
  'artisans : ne lancent pas la relance');
-- La relance du brouillon ne compte pas ces rappels et ne vise pas les dossiers envoyés.
select is(
  (select count(*)::int from public.notifications
   where user_id = 'c1730000-0000-4000-8000-000000000002' and type = 'inscription_relance'
     and data ->> 'phase' is null),
  0, 'dossier envoyé : aucune relance « dossier à terminer »');

-- ---------- Back-office : dossiers en attente d'attestations ----------
select pg_temp.connecter('c1730000-0000-4000-8000-000000000005', 'admin', 'aal2');
set local role authenticated;
select results_eq(
  $$ select etat, manque, relances from public.admin_stalled_signups()
     where artisan_id in (pg_temp.artisan(2), pg_temp.artisan(3)) $$,
  $$ values ('attestations'::text, array['decennale', 'urssaf'], 4) $$,
  'équipe : le dossier B attend ses attestations ; le dossier C, complet, n''y figure pas');
reset role;

select * from finish();
rollback;
