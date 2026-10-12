-- F-57 et contrôle (lot 5b, ADR 0052) : listes de métiers, travaux et pièces modifiées par les
-- admins (journalisées), journal d'audit consultable et suivi de l'IA, réservés aux admins avec
-- double authentification.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('d5100000-0000-4000-8000-000000000001', 'journal.client@example.test', false, now(), '{}',
   '{"first_name":"Camille","last_name":"Journal"}'),
  ('d5200000-0000-4000-8000-000000000001', 'journal.artisan@example.test', false, now(), '{"role":"artisan"}', '{}'),
  ('d5300000-0000-4000-8000-000000000001', 'journal.admin@example.test', false, now(), '{"role":"admin"}',
   '{"first_name":"Dominique","last_name":"Contrôle"}'),
  ('d5300000-0000-4000-8000-000000000002', 'journal.support@example.test', false, now(), '{"role":"support"}', '{}');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal1') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Accès : admins avec double authentification seulement ----------
select pg_temp.connecter('d5100000-0000-4000-8000-000000000001', 'particulier');
set local role authenticated;
select throws_ok($$ select public.admin_references() $$, '42501', null, 'particulier : pas de listes');
select throws_ok($$ select public.admin_add_reference('metier', 'pirate', 'Pirate') $$, '42501', null,
  'particulier : pas d''ajout');
select throws_ok($$ select * from public.admin_audit_log() $$, '42501', null, 'particulier : pas de journal');
select throws_ok($$ select public.admin_ai_summary() $$, '42501', null, 'particulier : pas de suivi de l''IA');
reset role;

select pg_temp.connecter('d5300000-0000-4000-8000-000000000002', 'support', 'aal2');
set local role authenticated;
select throws_ok($$ select public.admin_rename_reference('metier', 'plombier', 'Pirate') $$, '42501', null,
  'support : pas de modification des listes');
select throws_ok($$ select public.admin_audit_counts() $$, '42501', null, 'support : pas de journal');
select throws_ok($$ select public.admin_ai_summary() $$, '42501', null, 'support : pas de suivi de l''IA');
reset role;

select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_set_reference_active('metier', 'plombier', false) $$, '42501', null,
  'admin sans double authentification : refusé');
reset role;
select is((select active from public.trades where code = 'plombier'), true, 'liste inchangée après les refus');

-- ---------- Listes : ajout, libellé, activation, ordre ----------
select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select lives_ok($$ select public.admin_add_reference('metier', 'poseur-test', 'Poseur test') $$, 'ajout d''un métier');
select lives_ok($$ select public.admin_add_reference('travail', 'pose-test', 'Pose test', 'poseur-test') $$,
  'ajout d''un travail rattaché au métier');
select lives_ok($$ select public.admin_add_reference('travail', 'depose-test', 'Dépose test', 'poseur-test') $$,
  'ajout d''un second travail');
select lives_ok($$ select public.admin_add_reference('piece', 'veranda-test', 'Véranda test') $$, 'ajout d''une pièce');
select throws_ok($$ select public.admin_add_reference('travail', 'orphelin-test', 'Orphelin', 'inconnu') $$,
  '22023', 'Métier introuvable.', 'travail sans métier existant : refusé');
select throws_ok($$ select public.admin_add_reference('metier', 'poseur-test', 'Doublon') $$, '23505', null,
  'code déjà pris : refusé');
select throws_ok($$ select public.admin_add_reference('piece', 'Mauvais Code', 'Pièce') $$, '23514', null,
  'code mal formé : refusé');
select throws_ok($$ select public.admin_add_reference('metier', 'vide-test', '   ') $$, '22023', 'Libellé invalide.',
  'libellé vide : refusé');
select throws_ok($$ select public.admin_add_reference('autre', 'x', 'X') $$, '22023', 'Liste inconnue.',
  'liste inconnue : refusée');
select lives_ok($$ select public.admin_rename_reference('metier', 'poseur-test', 'Poseur de test') $$,
  'nouveau libellé');
select lives_ok($$ select public.admin_set_reference_active('metier', 'poseur-test', false) $$, 'désactivation');
select lives_ok($$ select public.admin_set_reference_active('metier', 'poseur-test', false) $$,
  'désactivation répétée sans effet');
select lives_ok($$ select public.admin_move_reference('travail', 'depose-test', true) $$, 'travail remonté');
select lives_ok($$ select public.admin_move_reference('travail', 'depose-test', true) $$,
  'travail déjà en tête : sans effet');
select set_config('test.listes', public.admin_references()::text, true);
reset role;

select results_eq(
  $$ select code, label, active, sort_order > 0 from public.trades where code = 'poseur-test' $$,
  $$ values ('poseur-test', 'Poseur de test', false, true) $$,
  'métier ajouté en fin de liste, renommé puis désactivé');
select ok(
  (select sort_order from public.trades where code = 'poseur-test') > (select max(sort_order) from public.trades where code <> 'poseur-test'),
  'métier ajouté après les autres');
select results_eq(
  $$ select code from public.work_types where trade_code = 'poseur-test' order by sort_order $$,
  $$ values ('depose-test'), ('pose-test') $$,
  'travail remonté au sein de son métier');
select is_empty(
  $$ select 1 from public.work_types where trade_code = 'poseur-test' group by sort_order having count(*) > 1 $$,
  'ordre sans doublon après le déplacement');

-- Le public ne voit plus le métier désactivé ; les admins voient tout, avec l'usage.
set local role anon;
select is_empty($$ select 1 from public.trades where code = 'poseur-test' $$, 'métier désactivé : invisible du public');
reset role;
select ok(
  (select bool_and(m ->> 'active' = 'false')
   from jsonb_array_elements(current_setting('test.listes')::jsonb -> 'metiers') m
   where m ->> 'code' = 'poseur-test'),
  'listes : métier désactivé visible des admins');
select is(
  (select (m ->> 'demandes')::int from jsonb_array_elements(current_setting('test.listes')::jsonb -> 'metiers') m
   where m ->> 'code' = 'plombier'),
  (select count(*)::int from public.projects where trade_code = 'plombier'),
  'listes : nombre de demandes par métier');
select is(
  (select (m ->> 'artisans')::int from jsonb_array_elements(current_setting('test.listes')::jsonb -> 'metiers') m
   where m ->> 'code' = 'plombier'),
  (select count(*)::int from public.artisan_trades where trade_code = 'plombier'),
  'listes : nombre d''artisans par métier');
select results_eq(
  $$ select t ->> 'code', t ->> 'metier' from jsonb_array_elements(current_setting('test.listes')::jsonb -> 'travaux') t
     where t ->> 'metier' = 'poseur-test' $$,
  $$ values ('depose-test', 'poseur-test'), ('pose-test', 'poseur-test') $$,
  'listes : travaux rattachés à leur métier, dans l''ordre');

-- Chaque modification est journalisée (pas les tentatives sans effet).
select results_eq(
  $$ select action, target_type, actor_id::text from public.audit_logs
     where data ->> 'code' in ('poseur-test', 'pose-test', 'depose-test', 'veranda-test')
     order by action, target_type $$,
  $$ values ('referentiel.ajoute', 'metier', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.ajoute', 'piece', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.ajoute', 'travail', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.ajoute', 'travail', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.deplace', 'travail', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.desactive', 'metier', 'd5300000-0000-4000-8000-000000000001'),
            ('referentiel.renomme', 'metier', 'd5300000-0000-4000-8000-000000000001') $$,
  'listes : ajouts, nouveau libellé, désactivation et déplacement journalisés');

-- ---------- Journal d'audit ----------
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode) values
  ('d5400000-0000-4000-8000-000000000001', 'd5200000-0000-4000-8000-000000000001', 'suspendu', 'JOURNAL TEST', 'communes');
insert into public.audit_logs (actor_id, action, target_type, target_id, data, created_at) values
  ('d5300000-0000-4000-8000-000000000001', 'artisan.suspendu', 'artisan', 'd5400000-0000-4000-8000-000000000001',
   '{"motif":"Assurance à vérifier"}', now() - interval '2 hours'),
  (null, 'artisan.suspendu_auto', 'artisan', 'd5400000-0000-4000-8000-000000000001',
   '{"motif":"assurance expirée"}', now() - interval '1 hour'),
  ('d5300000-0000-4000-8000-000000000001', 'compte.export', 'compte', 'd5100000-0000-4000-8000-000000000001',
   '{}', now() - interval '30 minutes');

select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select results_eq(
  $$ select action, categorie, acteur, automatique, cible, lien_type, lien_id::text, data ->> 'motif'
     from public.admin_audit_log('tous', 'JOURNAL TEST') $$,
  $$ values ('artisan.suspendu_auto', 'artisans', null::text, true, 'JOURNAL TEST', 'artisan',
             'd5400000-0000-4000-8000-000000000001', 'assurance expirée'),
            ('artisan.suspendu', 'artisans', 'Dominique Contrôle', false, 'JOURNAL TEST', 'artisan',
             'd5400000-0000-4000-8000-000000000001', 'Assurance à vérifier') $$,
  'journal : auteur (ou automatique), cible et fiche à ouvrir, du plus récent au plus ancien');
select results_eq(
  $$ select action, cible, lien_type, lien_id::text from public.admin_audit_log('comptes', 'Camille Journal') $$,
  $$ values ('compte.export', 'Camille Journal', 'personne', 'd5100000-0000-4000-8000-000000000001') $$,
  'journal : action sur un compte, reliée à la fiche de la personne');
select results_eq(
  $$ select action from public.admin_audit_log('automatique', 'JOURNAL TEST') $$,
  $$ values ('artisan.suspendu_auto') $$,
  'journal : actions automatiques');
select ok(
  (select bool_and(lien_type = 'listes' and categorie = 'listes') from public.admin_audit_log('listes', 'test')
   where data ->> 'code' in ('poseur-test', 'pose-test', 'depose-test', 'veranda-test')),
  'journal : modifications des listes');
select is(public.admin_audit_counts('JOURNAL TEST'),
  '{"tous": 2, "artisans": 2, "comptes": 0, "moderation": 0, "litiges": 0, "listes": 0, "automatique": 1}'::jsonb,
  'journal : pastilles par catégorie');
select is((select count(*)::int from public.admin_audit_log('tous', 'JOURNAL TEST', 1, 0)), 1, 'journal : pagination');

-- ---------- Suivi de l'IA ----------
reset role;
insert into public.ai_runs (function_name, model, outcome, latency_ms, input_tokens, output_tokens, audio_seconds, created_at) values
  ('analyze-need', 'modele-test-ia', 'ok', 1000, 100, 50, null, now() - interval '1 hour'),
  ('analyze-need', 'modele-test-ia', 'peu_sur', 2000, 120, 60, null, now() - interval '1 hour'),
  ('analyze-need', 'modele-test-ia', 'erreur', 3000, null, null, null, now() - interval '30 minutes'),
  ('transcribe', 'modele-test-voix', 'ok', 800, null, null, 30.5, now() - interval '2 hours'),
  ('analyze-need', 'modele-test-ia', 'refus', 500, 10, 0, null, now() - interval '40 days');

select pg_temp.connecter('d5300000-0000-4000-8000-000000000001', 'admin', 'aal2');
set local role authenticated;
select set_config('test.ia', public.admin_ai_summary(7)::text, true);
select set_config('test.ia_max', public.admin_ai_summary(1000)::text, true);
reset role;

select results_eq(
  $$ select m ->> 'modele', (m ->> 'appels')::int, (m ->> 'echecs')::int, (m ->> 'latence_mediane')::int
     from jsonb_array_elements(current_setting('test.ia')::jsonb -> 'modeles') m
     where m ->> 'modele' like 'modele-test-%' order by 1 $$,
  $$ values ('modele-test-ia', 3, 1, 2000), ('modele-test-voix', 1, 0, 800) $$,
  'IA : appels, échecs et latence médiane par modèle, sur la période');
select ok(
  (select (f ->> 'appels')::int >= 3 and (f ->> 'peu_sur')::int >= 1 and (f ->> 'erreur')::int >= 1
     and (f ->> 'jetons_entree')::int >= 220
   from jsonb_array_elements(current_setting('test.ia')::jsonb -> 'fonctions') f
   where f ->> 'fonction' = 'analyze-need'),
  'IA : résultats et jetons par fonction');
select ok(
  (select (f ->> 'secondes_audio')::int >= 30
   from jsonb_array_elements(current_setting('test.ia')::jsonb -> 'fonctions') f
   where f ->> 'fonction' = 'transcribe'),
  'IA : audio transcrit');
select is(jsonb_array_length(current_setting('test.ia')::jsonb -> 'par_jour'), 7, 'IA : un point par jour');
select ok(
  (current_setting('test.ia')::jsonb -> 'par_jour' -> 6 ->> 'jour')::date = (now() at time zone 'Europe/Paris')::date,
  'IA : la série se termine aujourd''hui (heure de Paris)');
select ok(
  exists (select 1 from jsonb_array_elements(current_setting('test.ia')::jsonb -> 'echecs_recents') e
          where e ->> 'modele' = 'modele-test-ia' and e ->> 'resultat' = 'refus'),
  'IA : derniers échecs, hors période comprise');
select is((current_setting('test.ia_max')::jsonb ->> 'jours')::int, 90, 'IA : période limitée à 90 jours');

select * from finish();
rollback;
