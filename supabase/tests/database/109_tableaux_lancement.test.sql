-- Tableaux de lancement (F-66, ADR 0208) : RLS et fonctions fermées aux visiteurs, équipe et tâches
-- créées par un admin en double authentification, rattachement d'un compte (rôle, unicité, type
-- « commercial »), ce que voit chaque membre (ses tâches et celles partagées, jamais celles d'un
-- collègue ni les jalons internes, jamais l'objectif ni le compte relié), cocher ses tâches, import
-- (création, réimport sans perte du « fait », lignes invalides, limites), copie (sans les tâches
-- partagées) et retrait, dates bornées, colonnes internes illisibles, journal.
-- Données fictives ; le seed est chargé avant : on ne compte que nos lignes (titres et noms finissant
-- par « 109 », repères lan109 / LAN109, adresses lan109.*).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('c1090000-0000-4000-8000-000000000001', 'lan109.admin@example.test', false, now(), '{"role":"admin"}', '{}'),
  ('c1090000-0000-4000-8000-000000000002', 'lan109.julien@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1090000-0000-4000-8000-000000000003', 'lan109.sami@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1090000-0000-4000-8000-000000000004', 'lan109.lea@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1090000-0000-4000-8000-000000000005', 'lan109.nora@example.test', false, now(), '{"role":"commercial"}', '{}'),
  ('c1090000-0000-4000-8000-000000000006', 'lan109.associe@example.test', false, now(), '{"role":"admin"}',
   '{"first_name":"Ada","last_name":"Exemple"}'),
  ('c1090000-0000-4000-8000-000000000007', 'lan109.client@example.test', false, now(), '{"role":"particulier"}', '{}'),
  ('c1090000-0000-4000-8000-000000000008', 'lan109.artisan@example.test', false, now(), '{"role":"artisan"}', '{}');

-- Léa est suspendue ; Nora est active mais hors de l'équipe (jusqu'à l'import).
insert into public.commercials (id, user_id, code, nom, status) values
  ('c1092000-0000-4000-8000-000000000001', 'c1090000-0000-4000-8000-000000000002', 'julien-109', 'Julien Exemple', 'actif'),
  ('c1092000-0000-4000-8000-000000000002', 'c1090000-0000-4000-8000-000000000003', 'sami-109', 'Sami Exemple', 'actif'),
  ('c1092000-0000-4000-8000-000000000003', 'c1090000-0000-4000-8000-000000000004', 'lea-109', 'Léa Exemple', 'suspendu'),
  ('c1092000-0000-4000-8000-000000000004', 'c1090000-0000-4000-8000-000000000005', 'nora-109', 'Nora Exemple', 'actif');

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;

-- ---------- Structure : RLS, lecture seule, fonctions fermées aux visiteurs ----------
select is((select relrowsecurity from pg_class where oid = 'public.launch_members'::regclass), true,
  'RLS activée (membres)');
select is((select relrowsecurity from pg_class where oid = 'public.launch_tasks'::regclass), true,
  'RLS activée (tâches)');
select policies_are('public', 'launch_members',
  array['launch_members : lecture par un admin'], 'membres : une seule politique');
select policies_are('public', 'launch_tasks',
  array['launch_tasks : lecture par un admin, le membre ou l''équipe'], 'tâches : une seule politique');
select policy_cmd_is('public', 'launch_members', 'launch_members : lecture par un admin',
  'SELECT', 'membres : lecture seulement');
select policy_cmd_is('public', 'launch_tasks', 'launch_tasks : lecture par un admin, le membre ou l''équipe',
  'SELECT', 'tâches : lecture seulement');
select is_empty(
  $$ select f from unnest(array[
       'public.my_launch_plan()',
       'public.launch_set_task_status(uuid, public.launch_task_status)',
       'public.admin_launch_accounts()',
       'public.admin_save_launch_member(text, public.launch_member_kind, uuid, text, uuid, integer, integer)',
       'public.admin_delete_launch_member(uuid)',
       'public.admin_save_launch_task(text, uuid, uuid, text, public.launch_phase, text, date, date, text, boolean, boolean, public.launch_task_status)',
       'public.admin_delete_launch_task(uuid)',
       'public.admin_copy_launch_tasks(uuid, uuid)',
       'public.admin_import_launch_plan(jsonb)'
     ]) as f
     where to_regprocedure(f) is null
        or not (select p.prosecdef from pg_proc p where p.oid = to_regprocedure(f))
        or has_function_privilege('anon', to_regprocedure(f)::oid, 'execute')
        or not has_function_privilege('authenticated', to_regprocedure(f)::oid, 'execute') $$,
  'fonctions présentes, SECURITY DEFINER, fermées aux visiteurs et ouvertes aux comptes connectés');
select ok(not has_function_privilege('anon', 'app.my_launch_member_id()', 'execute'),
  'membre connecté : fonction fermée aux visiteurs');

-- ---------- Contrôles de la base ----------
select throws_ok($$ insert into public.launch_tasks (titre, echeance, statut) values ('Contrôle 109', current_date, 'fait') $$,
  '23514', null, 'tâche faite sans date : refusée par la base');
select throws_ok($$ insert into public.launch_tasks (titre) values ('Contrôle 109') $$,
  '23514', null, 'ni échéance ni fréquence : refusée par la base');
select throws_ok(
  $$ insert into public.launch_tasks (titre, debut, echeance) values ('Contrôle 109', current_date + 1, current_date) $$,
  '23514', null, 'début après l''échéance : refusé par la base');
select throws_ok($$ insert into public.launch_tasks (titre, echeance, categorie) values ('Contrôle 109', current_date, 'autre') $$,
  '23514', null, 'catégorie hors liste : refusée par la base');
select throws_ok($$ insert into public.launch_members (nom, ref) values ('Contrôle 109', 'Majuscules') $$,
  '23514', null, 'repère de membre mal formé : refusé par la base');
select throws_ok($$ insert into public.launch_members (nom, objectif_valides) values ('Contrôle 109', 0) $$,
  '23514', null, 'objectif nul : refusé par la base');
select throws_ok($$ insert into public.launch_tasks (titre, echeance) values ('Contrôle 109', '0027-01-15') $$,
  '23514', null, 'échéance avant 2020 (année mal tapée) : refusée par la base');
select throws_ok(
  $$ insert into public.launch_tasks (titre, debut, echeance) values ('Contrôle 109', '2019-12-31', '2027-01-15') $$,
  '23514', null, 'début avant 2020 : refusé par la base');
select throws_ok($$ insert into public.launch_tasks (titre, echeance) values ('Contrôle 109', '2041-01-01') $$,
  '23514', null, 'échéance après 2040 : refusée par la base');

-- ---------- Réservé aux admins en double authentification ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_save_launch_member('Membre 109', 'autre') $$, '42501', null,
  'admin sans double authentification : création d''un membre impossible');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_echeance => current_date) $$, '42501', null,
  'admin sans double authentification : création d''une tâche impossible');
select throws_ok($$ select * from public.admin_launch_accounts() $$, '42501', null,
  'admin sans double authentification : comptes illisibles');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1}') $$, '42501', null,
  'admin sans double authentification : import impossible');
select throws_ok($$ select public.admin_delete_launch_member('c1099999-0000-4000-8000-000000000000') $$, '42501', null,
  'admin sans double authentification : retrait d''un membre impossible');
select throws_ok($$ select public.admin_delete_launch_task('c1099999-0000-4000-8000-000000000000') $$, '42501', null,
  'admin sans double authentification : suppression d''une tâche impossible');
select throws_ok(
  $$ select public.admin_copy_launch_tasks('c1099999-0000-4000-8000-000000000000', 'c1099999-0000-4000-8000-000000000001') $$,
  '42501', null, 'admin sans double authentification : copie impossible');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_save_launch_member('Membre 109', 'autre') $$, '42501', null,
  'commercial : création d''un membre impossible');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_echeance => current_date) $$, '42501', null,
  'commercial : création d''une tâche impossible');
reset role;

-- ---------- Équipe : comptes reliables et membres ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select results_eq(
  $$ select email, nom, role, member_id from public.admin_launch_accounts()
     where email like 'lan109.%' order by email collate "C" $$,
  $$ values ('lan109.admin@example.test'::text, 'lan109.admin@example.test'::text, 'admin'::text, null::uuid),
            ('lan109.associe@example.test', 'Ada Exemple', 'admin', null),
            ('lan109.julien@example.test', 'Julien Exemple', 'commercial', null),
            ('lan109.lea@example.test', 'Léa Exemple', 'commercial', null),
            ('lan109.nora@example.test', 'Nora Exemple', 'commercial', null),
            ('lan109.sami@example.test', 'Sami Exemple', 'commercial', null) $$,
  'comptes reliables : admins et commerciaux (nom de la fiche, sinon du profil, sinon e-mail)');

select set_config('test.julien', public.admin_save_launch_member('Julien Exemple 109', 'commercial',
  p_mission => 'Tournées fictives', p_user_id => 'c1090000-0000-4000-8000-000000000002',
  p_objectif_valides => 25, p_ordre => 1)::text, true);
select set_config('test.sami', public.admin_save_launch_member('Sami Exemple 109', 'commercial',
  p_user_id => 'c1090000-0000-4000-8000-000000000003', p_ordre => 2)::text, true);
select set_config('test.lea', public.admin_save_launch_member('Léa Exemple 109', 'commercial',
  p_user_id => 'c1090000-0000-4000-8000-000000000004', p_ordre => 3)::text, true);
select set_config('test.associe', public.admin_save_launch_member('Ada Exemple 109', 'associe',
  p_user_id => 'c1090000-0000-4000-8000-000000000006', p_ordre => 4)::text, true);
select set_config('test.validation', public.admin_save_launch_member(' Validation 109 ', 'validation')::text, true);

select throws_ok($$ select public.admin_save_launch_member('   ', 'autre') $$,
  '22023', 'Indiquez le nom (80 caractères au plus).', 'nom vide refusé');
select throws_ok($$ select public.admin_save_launch_member(repeat('x', 81), 'autre') $$,
  '22023', 'Indiquez le nom (80 caractères au plus).', 'nom trop long refusé');
select throws_ok($$ select public.admin_save_launch_member('Membre 109', 'autre', p_mission => repeat('x', 301)) $$,
  '22023', 'Mission trop longue : 300 caractères au plus.', 'mission trop longue refusée');
select throws_ok($$ select public.admin_save_launch_member('Membre 109', null) $$,
  '22023', 'Choisissez le type de membre.', 'type absent refusé');
select throws_ok($$ select public.admin_save_launch_member('Membre 109', 'autre', p_objectif_valides => 0) $$,
  '22023', 'Objectif : entre 1 et 10 000 artisans validés, ou vide.', 'objectif nul refusé');
select throws_ok($$ select public.admin_save_launch_member('Membre 109', 'autre', p_objectif_valides => 10001) $$,
  '22023', 'Objectif : entre 1 et 10 000 artisans validés, ou vide.', 'objectif trop élevé refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Client 109', 'autre', p_user_id => 'c1090000-0000-4000-8000-000000000007') $$,
  '22023', 'Seul le compte d''un admin ou d''un commercial peut être relié.', 'compte d''un particulier : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Artisan 109', 'autre', p_user_id => 'c1090000-0000-4000-8000-000000000008') $$,
  '22023', 'Seul le compte d''un admin ou d''un commercial peut être relié.', 'compte d''un artisan : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Inconnu 109', 'autre', p_user_id => 'c1099999-0000-4000-8000-000000000000') $$,
  '22023', 'Seul le compte d''un admin ou d''un commercial peut être relié.', 'compte inconnu : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Admin 109', 'commercial', p_user_id => 'c1090000-0000-4000-8000-000000000001') $$,
  '22023', 'Un membre « commercial » se relie au compte d''un commercial.', 'membre commercial relié à un admin : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Nora 109', 'associe', p_user_id => 'c1090000-0000-4000-8000-000000000005') $$,
  '22023', 'Le compte d''un commercial se relie à un membre « commercial ».', 'compte commercial sur un associé : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Julien bis 109', 'commercial', p_user_id => 'c1090000-0000-4000-8000-000000000002') $$,
  '22023', 'Ce compte est déjà dans l''équipe.', 'compte déjà relié à un autre membre : refusé');
select throws_ok(
  $$ select public.admin_save_launch_member('Inconnu 109', 'autre', p_id => 'c1099999-0000-4000-8000-000000000000') $$,
  '22023', 'Membre introuvable.', 'membre inconnu : modification refusée');
select is(
  public.admin_save_launch_member('Julien Exemple 109', 'commercial', p_id => current_setting('test.julien')::uuid,
    p_mission => '  Tournées fictives autour de Nice  ', p_user_id => 'c1090000-0000-4000-8000-000000000002',
    p_objectif_valides => 25),
  current_setting('test.julien')::uuid, 'membre modifié avec son propre compte : même identifiant');
select results_eq(
  $$ select email, member_id from public.admin_launch_accounts()
     where email like 'lan109.%' and member_id is not null order by email collate "C" $$,
  $$ values ('lan109.associe@example.test'::text, current_setting('test.associe')::uuid),
            ('lan109.julien@example.test', current_setting('test.julien')::uuid),
            ('lan109.lea@example.test', current_setting('test.lea')::uuid),
            ('lan109.sami@example.test', current_setting('test.sami')::uuid) $$,
  'comptes reliables : membre déjà relié indiqué');
select is((select objectif_valides from public.launch_members where id = current_setting('test.julien')::uuid), 25,
  'admin en double authentification : membres lisibles en direct, objectif compris');
reset role;

select results_eq(
  $$ select nom, mission, kind::text, user_id, objectif_valides, ordre, ref, active from public.launch_members
     where nom like '% 109' order by ordre, nom collate "C" $$,
  $$ values ('Validation 109'::text, null::text, 'validation'::text, null::uuid, null::int, 0, null::text, true),
            ('Julien Exemple 109', 'Tournées fictives autour de Nice', 'commercial', 'c1090000-0000-4000-8000-000000000002'::uuid,
             25, 1, null, true),
            ('Sami Exemple 109', null, 'commercial', 'c1090000-0000-4000-8000-000000000003', null, 2, null, true),
            ('Léa Exemple 109', null, 'commercial', 'c1090000-0000-4000-8000-000000000004', null, 3, null, true),
            ('Ada Exemple 109', null, 'associe', 'c1090000-0000-4000-8000-000000000006', null, 4, null, true) $$,
  'membres enregistrés : espaces retirés, ordre 0 à la création, gardé quand il est absent');

-- ---------- Tâches et jalons ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select set_config('test.t_tournee', public.admin_save_launch_task('Tournée fictive 109',
  p_member_id => current_setting('test.julien')::uuid, p_phase => 'pre_ouverture', p_categorie => 'terrain',
  p_debut => current_date, p_echeance => current_date + 3)::text, true);
select set_config('test.t_relance', public.admin_save_launch_task('Relance fictive 109',
  p_member_id => current_setting('test.julien')::uuid, p_categorie => 'terrain', p_echeance => current_date - 2)::text, true);
select set_config('test.t_fait', public.admin_save_launch_task('Tâche déjà faite 109',
  p_member_id => current_setting('test.julien')::uuid, p_echeance => current_date - 5, p_statut => 'fait')::text, true);
select set_config('test.t_sami', public.admin_save_launch_task('Appels fictifs Sami 109',
  p_member_id => current_setting('test.sami')::uuid, p_echeance => current_date + 1)::text, true);
select set_config('test.t_reunion', public.admin_save_launch_task('Réunion fictive 109',
  p_member_id => current_setting('test.sami')::uuid, p_categorie => 'equipe', p_recurrence => ' Chaque lundi à 9 h ',
  p_partage => true)::text, true);
select set_config('test.t_lea', public.admin_save_launch_task('Tâche fictive Léa 109',
  p_member_id => current_setting('test.lea')::uuid, p_echeance => current_date + 4)::text, true);
select set_config('test.t_associe', public.admin_save_launch_task('Tâche fictive associé 109',
  p_member_id => current_setting('test.associe')::uuid, p_categorie => 'juridique', p_echeance => current_date + 10)::text, true);
select set_config('test.j_partage', public.admin_save_launch_task('Jalon partagé 109', p_categorie => 'evenement',
  p_echeance => current_date + 30, p_jalon => true, p_partage => true)::text, true);
select set_config('test.j_interne', public.admin_save_launch_task('Jalon interne 109',
  p_echeance => current_date + 20, p_jalon => true)::text, true);

select throws_ok($$ select public.admin_save_launch_task('  ', p_echeance => current_date) $$,
  '22023', 'Indiquez le titre (140 caractères au plus).', 'titre vide refusé');
select throws_ok($$ select public.admin_save_launch_task(repeat('x', 141), p_echeance => current_date) $$,
  '22023', 'Indiquez le titre (140 caractères au plus).', 'titre trop long refusé');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_detail => repeat('x', 1001), p_echeance => current_date) $$,
  '22023', 'Détail trop long : 1 000 caractères au plus.', 'détail trop long refusé');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_recurrence => repeat('x', 81)) $$,
  '22023', 'Fréquence trop longue : 80 caractères au plus.', 'fréquence trop longue refusée');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_categorie => 'inconnue', p_echeance => current_date) $$,
  '22023', 'Catégorie inconnue.', 'catégorie inconnue refusée');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_recurrence => '   ') $$,
  '22023', 'Indiquez une échéance ou une fréquence.', 'ni échéance ni fréquence : refusé');
select throws_ok(
  $$ select public.admin_save_launch_task('Tâche 109', p_debut => current_date + 1, p_echeance => current_date) $$,
  '22023', 'Le début doit précéder l''échéance.', 'début après l''échéance : refusé');
select throws_ok($$ select public.admin_save_launch_task('Tâche 109', p_echeance => '2207-01-15') $$,
  '22023', 'Indiquez des dates entre 2020 et 2040.', 'échéance hors de 2020-2040 : refusée');
select throws_ok(
  $$ select public.admin_save_launch_task('Tâche 109', p_debut => '0027-01-15', p_echeance => current_date) $$,
  '22023', 'Indiquez des dates entre 2020 et 2040.', 'début hors de 2020-2040 : refusé');
select throws_ok(
  $$ select public.admin_save_launch_task('Tâche 109', p_member_id => 'c1099999-0000-4000-8000-000000000000',
       p_echeance => current_date) $$,
  '22023', 'Membre introuvable.', 'membre inconnu : refusé');
select throws_ok(
  $$ select public.admin_save_launch_task('Tâche 109', p_id => 'c1099999-0000-4000-8000-000000000000',
       p_echeance => current_date) $$,
  '22023', 'Tâche introuvable.', 'tâche inconnue : modification refusée');
reset role;

select results_eq(
  $$ select titre, member_id is null, phase::text, categorie, recurrence, jalon, partage, statut::text,
       fait_le is not null, created_by, ref
     from public.launch_tasks where titre like '% 109' order by titre collate "C" $$,
  $$ values
       ('Appels fictifs Sami 109'::text, false, 'preparation'::text, 'pilotage'::text, null::text, false, false,
        'a_faire'::text, false, 'c1090000-0000-4000-8000-000000000001'::uuid, null::text),
       ('Jalon interne 109', true, 'preparation', 'pilotage', null, true, false, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Jalon partagé 109', true, 'preparation', 'evenement', null, true, true, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Relance fictive 109', false, 'preparation', 'terrain', null, false, false, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Réunion fictive 109', false, 'preparation', 'equipe', 'Chaque lundi à 9 h', false, true, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Tournée fictive 109', false, 'pre_ouverture', 'terrain', null, false, false, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Tâche déjà faite 109', false, 'preparation', 'pilotage', null, false, false, 'fait', true,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Tâche fictive Léa 109', false, 'preparation', 'pilotage', null, false, false, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null),
       ('Tâche fictive associé 109', false, 'preparation', 'juridique', null, false, false, 'a_faire', false,
        'c1090000-0000-4000-8000-000000000001', null) $$,
  'tâches enregistrées : valeurs par défaut, fréquence sans espaces, auteur');
select results_eq(
  $$ select statut::text, fait_le = now(), fait_par from public.launch_tasks where id = current_setting('test.t_fait')::uuid $$,
  $$ values ('fait'::text, true, 'c1090000-0000-4000-8000-000000000001'::uuid) $$,
  'tâche créée faite : date et auteur posés');

-- Remplacement d'une tâche déjà faite : la date du « fait » est gardée.
update public.launch_tasks set fait_le = now() - interval '1 day' where id = current_setting('test.t_fait')::uuid;
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_save_launch_task('Tâche déjà faite 109', p_id => current_setting('test.t_fait')::uuid,
       p_member_id => current_setting('test.julien')::uuid, p_detail => 'Détail fictif', p_echeance => current_date - 5,
       p_statut => 'fait') $$,
  'tâche faite modifiée');
reset role;
select results_eq(
  $$ select statut::text, fait_le = now() - interval '1 day', fait_par, detail from public.launch_tasks
     where id = current_setting('test.t_fait')::uuid $$,
  $$ values ('fait'::text, true, 'c1090000-0000-4000-8000-000000000001'::uuid, 'Détail fictif'::text) $$,
  'tâche déjà faite modifiée : date et auteur du « fait » gardés');

select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select is_empty($$ select 1 from public.launch_tasks $$, 'admin sans double authentification : aucune tâche lisible');
select is_empty($$ select 1 from public.launch_members $$, 'admin sans double authentification : aucun membre lisible');
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb,
  'admin hors de l''équipe : aucun planning');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_sami')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'admin sans double authentification : ne change le statut d''aucune tâche');
reset role;

-- ---------- Ce que voit un commercial membre ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select results_eq(
  $$ select titre from public.launch_tasks where titre like '% 109' order by titre collate "C" $$,
  $$ values ('Jalon partagé 109'::text), ('Relance fictive 109'), ('Réunion fictive 109'), ('Tournée fictive 109'),
            ('Tâche déjà faite 109') $$,
  'commercial : ses tâches et celles partagées, jamais celles d''un collègue ni les jalons internes');
select is_empty($$ select 1 from public.launch_members $$,
  'commercial : aucune fiche de membre en lecture directe, pas même la sienne (objectif interne)');
select throws_ok($$ select fait_par from public.launch_tasks $$, '42501', null,
  'commercial : auteur du « fait » illisible en direct');
select throws_ok($$ select created_by from public.launch_tasks $$, '42501', null,
  'commercial : auteur de la tâche illisible en direct');
select throws_ok($$ select ref from public.launch_tasks $$, '42501', null,
  'commercial : repère du fichier d''import illisible en direct');
select is(
  public.my_launch_plan() -> 'member',
  jsonb_build_object('id', current_setting('test.julien'), 'nom', 'Julien Exemple 109',
    'mission', 'Tournées fictives autour de Nice', 'kind', 'commercial'),
  'mon planning : nom, mission et type du membre');
select ok(public.my_launch_plan()::text !~ '(objectif_valides|user_id)',
  'mon planning : jamais l''objectif ni le compte relié');
select results_eq(
  $$ select k from jsonb_object_keys(public.my_launch_plan() -> 'tasks' -> 0) as k order by k collate "C" $$,
  $$ values ('categorie'::text), ('debut'), ('detail'), ('echeance'), ('fait_le'), ('id'), ('jalon'), ('own'),
            ('partage'), ('phase'), ('recurrence'), ('statut'), ('titre') $$,
  'mon planning : champs de chaque tâche');
select results_eq(
  $$ select e ->> 'titre', (e ->> 'own')::boolean, e ->> 'echeance', e ->> 'statut', e ->> 'detail'
     from jsonb_array_elements(public.my_launch_plan() -> 'tasks') with ordinality as x (e, n)
     where e ->> 'titre' like '% 109' order by n $$,
  $$ values ('Tâche déjà faite 109'::text, true, to_char(current_date - 5, 'YYYY-MM-DD'), 'fait'::text, 'Détail fictif'::text),
            ('Relance fictive 109', true, to_char(current_date - 2, 'YYYY-MM-DD'), 'a_faire', null),
            ('Tournée fictive 109', true, to_char(current_date + 3, 'YYYY-MM-DD'), 'a_faire', null),
            ('Jalon partagé 109', false, to_char(current_date + 30, 'YYYY-MM-DD'), 'a_faire', null),
            ('Réunion fictive 109', false, null, 'a_faire', null) $$,
  'mon planning : mes tâches et celles partagées, échéance la plus proche d''abord, rendez-vous réguliers à la fin');

select lives_ok($$ select public.launch_set_task_status(current_setting('test.t_tournee')::uuid, 'fait') $$,
  'commercial : coche sa tâche');
select lives_ok($$ select public.launch_set_task_status(current_setting('test.t_fait')::uuid, 'fait') $$,
  'commercial : coche de nouveau une tâche déjà faite');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_sami')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'commercial : jamais la tâche d''un collègue');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_reunion')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'commercial : jamais la tâche partagée d''un collègue');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.j_partage')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'commercial : jamais un jalon de toute l''équipe');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_relance')::uuid, null) $$,
  '22023', 'Statut inconnu.', 'statut absent refusé');
select throws_ok($$ update public.launch_tasks set statut = 'fait' where id = current_setting('test.t_relance')::uuid $$,
  '42501', null, 'commercial : aucune écriture directe des tâches');
select throws_ok($$ insert into public.launch_tasks (titre, echeance) values ('Intrus 109', current_date) $$,
  '42501', null, 'commercial : aucune création directe de tâche');
select throws_ok($$ delete from public.launch_members $$, '42501', null, 'commercial : aucune écriture directe des membres');
select throws_ok($$ select * from public.admin_launch_accounts() $$, '42501', null, 'commercial : comptes illisibles');
select throws_ok($$ select public.admin_delete_launch_task(current_setting('test.t_relance')::uuid) $$, '42501', null,
  'commercial : suppression impossible');
select throws_ok(
  $$ select public.admin_copy_launch_tasks(current_setting('test.sami')::uuid, current_setting('test.julien')::uuid) $$,
  '42501', null, 'commercial : copie impossible');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1}') $$, '42501', null,
  'commercial : import impossible');
reset role;
select results_eq(
  $$ select statut::text, fait_le = now(), fait_par from public.launch_tasks where id = current_setting('test.t_tournee')::uuid $$,
  $$ values ('fait'::text, true, 'c1090000-0000-4000-8000-000000000002'::uuid) $$,
  'tâche cochée : date et auteur');
select results_eq(
  $$ select fait_le = now() - interval '1 day', fait_par from public.launch_tasks where id = current_setting('test.t_fait')::uuid $$,
  $$ values (true, 'c1090000-0000-4000-8000-000000000001'::uuid) $$,
  'tâche déjà faite cochée de nouveau : date et auteur d''origine gardés');
select is((select statut::text from public.launch_tasks where id = current_setting('test.t_sami')::uuid), 'a_faire',
  'tâche du collègue inchangée');

select pg_temp.connecter('c1090000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select lives_ok($$ select public.launch_set_task_status(current_setting('test.t_tournee')::uuid, 'en_cours') $$,
  'commercial : remet sa tâche en cours');
reset role;
select results_eq(
  $$ select statut::text, fait_le, fait_par from public.launch_tasks where id = current_setting('test.t_tournee')::uuid $$,
  $$ values ('en_cours'::text, null::timestamptz, null::uuid) $$,
  'tâche en cours : date et auteur du « fait » effacés');

-- ---------- Un collègue ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000003', 'commercial');
set local role authenticated;
select results_eq(
  $$ select e ->> 'titre', (e ->> 'own')::boolean
     from jsonb_array_elements(public.my_launch_plan() -> 'tasks') with ordinality as x (e, n)
     where e ->> 'titre' like '% 109' order by n $$,
  $$ values ('Appels fictifs Sami 109'::text, true), ('Jalon partagé 109', false), ('Réunion fictive 109', true) $$,
  'collègue : ses tâches (dont la réunion qu''il partage) et le jalon commun');
select results_eq(
  $$ select titre from public.launch_tasks where titre like '% 109' order by titre collate "C" $$,
  $$ values ('Appels fictifs Sami 109'::text), ('Jalon partagé 109'), ('Réunion fictive 109') $$,
  'collègue : même chose en lecture directe');
reset role;

-- ---------- Accès coupé ou absent ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000004', 'commercial');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'commercial suspendu : plus de planning');
select is_empty($$ select 1 from public.launch_tasks $$, 'commercial suspendu : aucune tâche lisible');
select is_empty($$ select 1 from public.launch_members $$, 'commercial suspendu : aucun membre lisible');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_lea')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'commercial suspendu : ne coche plus ses tâches');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000005', 'commercial');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'commercial hors de l''équipe : member null');
select is_empty($$ select 1 from public.launch_tasks $$, 'commercial hors de l''équipe : aucune tâche lisible');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000002', 'particulier');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'jeton sans le rôle commercial : member null');
select is_empty($$ select 1 from public.launch_tasks $$, 'jeton sans le rôle commercial : aucune tâche lisible');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000008', 'artisan');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'artisan : member null');
select is_empty($$ select 1 from public.launch_tasks $$, 'artisan : aucune tâche lisible');
select is_empty($$ select 1 from public.launch_members $$, 'artisan : aucun membre lisible');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000007', 'particulier');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'particulier : member null');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_relance')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'particulier : ne coche rien');
reset role;

set local role anon;
select throws_ok($$ select 1 from public.launch_tasks $$, '42501', null, 'visiteur : aucun accès aux tâches');
select throws_ok($$ select 1 from public.launch_members $$, '42501', null, 'visiteur : aucun accès aux membres');
select throws_ok($$ select public.my_launch_plan() $$, '42501', null, 'visiteur : planning inaccessible');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_relance')::uuid, 'fait') $$,
  '42501', null, 'visiteur : statut inaccessible');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1}') $$, '42501', null,
  'visiteur : import inaccessible');
reset role;

-- ---------- Un associé relié à son compte d'admin ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000006', 'admin');
set local role authenticated;
select is(public.my_launch_plan() -> 'member' ->> 'kind', 'associe', 'associé (admin en double authentification) : son planning');
select results_eq(
  $$ select e ->> 'titre', (e ->> 'own')::boolean
     from jsonb_array_elements(public.my_launch_plan() -> 'tasks') with ordinality as x (e, n)
     where e ->> 'titre' like '% 109' order by n $$,
  $$ values ('Tâche fictive associé 109'::text, true), ('Jalon partagé 109', false), ('Réunion fictive 109', false) $$,
  'associé : ses tâches et celles partagées dans son planning');
select is((select count(*)::int from public.launch_tasks where titre like '% 109'), 9,
  'admin : toutes les tâches en lecture directe');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000006', 'admin', 'aal1');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb,
  'associé sans double authentification : member null');
select throws_ok($$ select public.launch_set_task_status(current_setting('test.t_associe')::uuid, 'fait') $$,
  '22023', 'Tâche introuvable.', 'associé sans double authentification : ne coche plus sa tâche');
reset role;

select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.launch_set_task_status(current_setting('test.t_sami')::uuid, 'en_cours') $$,
  'admin : change le statut de toute tâche');
select throws_ok($$ select public.launch_set_task_status('c1099999-0000-4000-8000-000000000000', 'fait') $$,
  '22023', 'Tâche introuvable.', 'tâche inconnue');
reset role;
select is((select statut::text from public.launch_tasks where id = current_setting('test.t_sami')::uuid), 'en_cours',
  'statut changé par un admin');

-- ---------- Import ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  public.admin_import_launch_plan($plan$ {
    "version": 1,
    "members": [
      {"ref": "lan109-alpha", "nom": "Alpha 109", "mission": "Mission fictive", "kind": "associe", "ordre": 5},
      {"ref": "lan109-beta", "nom": "Beta 109", "kind": "commercial", "ordre": 6, "objectif_valides": 40},
      {"ref": "lan109-faux", "nom": "Faux 109", "kind": "inconnu"},
      {"ref": "Lan 109", "nom": "Repère faux 109"}
    ],
    "tasks": [
      {"ref": "LAN109.t1", "member": "lan109-alpha", "titre": "Import un 109", "phase": "pre_ouverture",
       "categorie": "terrain", "debut": "2027-01-04", "echeance": "2027-01-08"},
      {"ref": "LAN109.t2", "member": "lan109-beta", "titre": "Import deux 109", "categorie": "digital",
       "echeance": "2027-01-15", "detail": "Détail fictif"},
      {"ref": "LAN109.t3", "member": null, "titre": "Import jalon 109", "categorie": "evenement",
       "echeance": "2027-03-01", "jalon": true, "partage": true},
      {"ref": "LAN109.t4", "member": "lan109-inconnu", "titre": "Import régulier 109",
       "recurrence": "Chaque lundi à 9 h"},
      {"ref": "LAN109.x1", "titre": "Sans date 109"},
      {"ref": "LAN109.x2", "titre": "Date impossible 109", "echeance": "2027-02-30"},
      {"ref": "LAN109.x3", "titre": "Date en lettres 109", "echeance": "tomorrow"},
      {"ref": "LAN109.x4", "titre": "Catégorie inconnue 109", "categorie": "inconnue", "echeance": "2027-01-01"},
      {"ref": "LAN109.x5", "titre": "Dates inversées 109", "debut": "2027-02-01", "echeance": "2027-01-01"},
      {"ref": "LAN109.x6", "titre": "Phase inconnue 109", "phase": "demain", "echeance": "2027-01-01"},
      {"ref": "LAN109.x7", "titre": "  ", "echeance": "2027-01-01"},
      {"ref": "LAN109.x8", "titre": "Année mal tapée 109", "echeance": "2207-01-15"}
    ]
  } $plan$::jsonb),
  '{"members_created": 2, "members_updated": 0, "tasks_created": 4, "tasks_updated": 0, "skipped": 10,
    "targets_created": 0, "targets_deleted": 0, "targets_updated": 0, "settings_updated": false}'::jsonb,
  'import : membres et tâches créés, lignes invalides ignorées et comptées');
reset role;
select results_eq(
  $$ select ref, nom, mission, kind::text, ordre, objectif_valides, user_id from public.launch_members
     where ref like 'lan109-%' order by ref collate "C" $$,
  $$ values ('lan109-alpha'::text, 'Alpha 109'::text, 'Mission fictive'::text, 'associe'::text, 5, null::int, null::uuid),
            ('lan109-beta', 'Beta 109', null, 'commercial', 6, 40, null) $$,
  'import : membres créés');
select results_eq(
  $$ select t.ref, m.ref, t.titre, t.phase::text, t.categorie, t.debut, t.echeance, t.recurrence, t.jalon, t.partage,
       t.statut::text, t.detail, t.created_by
     from public.launch_tasks t left join public.launch_members m on m.id = t.member_id
     where t.ref like 'LAN109.%' order by t.ref collate "C" $$,
  $$ values
       ('LAN109.t1'::text, 'lan109-alpha'::text, 'Import un 109'::text, 'pre_ouverture'::text, 'terrain'::text,
        '2027-01-04'::date, '2027-01-08'::date, null::text, false, false, 'a_faire'::text, null::text,
        'c1090000-0000-4000-8000-000000000001'::uuid),
       ('LAN109.t2', 'lan109-beta', 'Import deux 109', 'preparation', 'digital', null, '2027-01-15', null, false, false,
        'a_faire', 'Détail fictif', 'c1090000-0000-4000-8000-000000000001'),
       ('LAN109.t3', null, 'Import jalon 109', 'preparation', 'evenement', null, '2027-03-01', null, true, true,
        'a_faire', null, 'c1090000-0000-4000-8000-000000000001'),
       ('LAN109.t4', null, 'Import régulier 109', 'preparation', 'pilotage', null, null, 'Chaque lundi à 9 h', false,
        false, 'a_faire', null, 'c1090000-0000-4000-8000-000000000001') $$,
  'import : tâches créées ; membre inconnu : tâche de toute l''équipe');

-- Entre deux imports, l'admin renomme un membre, en relie un autre à un compte et coche une tâche.
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok(
  $$ select public.admin_save_launch_member('Alpha renommé 109', 'associe',
       p_id => (select id from public.launch_members where ref = 'lan109-alpha'), p_mission => 'Mission fictive') $$,
  'membre importé renommé');
select lives_ok(
  $$ select public.admin_save_launch_member('Beta 109', 'commercial',
       p_id => (select id from public.launch_members where ref = 'lan109-beta'),
       p_user_id => 'c1090000-0000-4000-8000-000000000005', p_objectif_valides => 40) $$,
  'membre importé relié au compte d''une commerciale');
select lives_ok(
  $$ select public.launch_set_task_status((select id from public.launch_tasks where titre = 'Import un 109'), 'fait') $$,
  'tâche importée faite');
select is(
  public.admin_import_launch_plan($plan$ {
    "version": 1,
    "members": [
      {"ref": "lan109-alpha", "nom": "Alpha 109", "mission": "Mission changée", "kind": "associe", "ordre": 7},
      {"ref": "lan109-beta", "nom": "Beta 109", "kind": "associe", "objectif_valides": 50}
    ],
    "tasks": [
      {"ref": "LAN109.t1", "member": "lan109-alpha", "titre": "Import un modifié 109", "phase": "lancement",
       "categorie": "terrain", "echeance": "2027-01-09"},
      {"ref": "LAN109.t2", "member": "lan109-alpha", "titre": "Import deux 109", "categorie": "digital",
       "echeance": "2027-01-15"},
      {"ref": "LAN109.t5", "member": "lan109-beta", "titre": "Import cinq 109", "echeance": "2027-01-20"}
    ]
  } $plan$::jsonb),
  '{"members_created": 0, "members_updated": 2, "tasks_created": 1, "tasks_updated": 2, "skipped": 0,
    "targets_created": 0, "targets_deleted": 0, "targets_updated": 0, "settings_updated": false}'::jsonb,
  'réimport : mises à jour par repère');
reset role;
select results_eq(
  $$ select ref, nom, mission, kind::text, ordre, objectif_valides, user_id from public.launch_members
     where ref like 'lan109-%' order by ref collate "C" $$,
  $$ values ('lan109-alpha'::text, 'Alpha renommé 109'::text, 'Mission changée'::text, 'associe'::text, 7, null::int,
             null::uuid),
            ('lan109-beta', 'Beta 109', null, 'commercial', 6, 50, 'c1090000-0000-4000-8000-000000000005') $$,
  'réimport : nom et compte relié gardés, type gardé s''il ne va plus avec le compte, ordre absent gardé');
select results_eq(
  $$ select t.ref, m.ref, t.titre, t.phase::text, t.debut, t.echeance, t.detail, t.statut::text, t.fait_le = now(),
       t.fait_par
     from public.launch_tasks t left join public.launch_members m on m.id = t.member_id
     where t.ref like 'LAN109.%' order by t.ref collate "C" $$,
  $$ values
       ('LAN109.t1'::text, 'lan109-alpha'::text, 'Import un modifié 109'::text, 'lancement'::text, null::date,
        '2027-01-09'::date, null::text, 'fait'::text, true, 'c1090000-0000-4000-8000-000000000001'::uuid),
       ('LAN109.t2', 'lan109-alpha', 'Import deux 109', 'preparation', null, '2027-01-15', null, 'a_faire', null, null),
       ('LAN109.t3', null, 'Import jalon 109', 'preparation', null, '2027-03-01', null, 'a_faire', null, null),
       ('LAN109.t4', null, 'Import régulier 109', 'preparation', null, null, null, 'a_faire', null, null),
       ('LAN109.t5', 'lan109-beta', 'Import cinq 109', 'preparation', null, '2027-01-20', null, 'a_faire', null, null) $$,
  'réimport : tâches mises à jour sans perdre le « fait », tâches absentes du fichier gardées');

select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_import_launch_plan(jsonb_build_object('version', 1, 'members',
       (select jsonb_agg(jsonb_build_object('ref', 'lan109-m' || g, 'nom', 'Membre ' || g)) from generate_series(1, 51) g))) $$,
  '22023', 'Trop de membres : 50 au plus.', 'import : plus de 50 membres refusé');
select throws_ok(
  $$ select public.admin_import_launch_plan(jsonb_build_object('version', 1, 'tasks',
       (select jsonb_agg(jsonb_build_object('titre', 'Tâche ' || g, 'echeance', '2027-01-01'))
        from generate_series(1, 2001) g))) $$,
  '22023', 'Trop de tâches : 2 000 au plus.', 'import : plus de 2 000 tâches refusé');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 2, "members": [], "tasks": []}') $$,
  '22023', 'Fichier non reconnu : version 1 attendue.', 'import : autre version refusée');
select throws_ok($$ select public.admin_import_launch_plan('[]') $$,
  '22023', 'Fichier non reconnu : version 1 attendue.', 'import : fichier qui n''est pas un objet refusé');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1, "tasks": {}}') $$,
  '22023', 'Fichier non reconnu : listes des membres et des tâches attendues.', 'import : liste des tâches attendue');
select is(public.admin_import_launch_plan('{"version": 1}'),
  '{"members_created": 0, "members_updated": 0, "tasks_created": 0, "tasks_updated": 0, "skipped": 0,
    "targets_created": 0, "targets_deleted": 0, "targets_updated": 0, "settings_updated": false}'::jsonb,
  'import sans membre ni tâche : rien à faire');
reset role;
select is_empty($$ select 1 from public.launch_members where ref like 'lan109-m%' $$,
  'import refusé : rien n''est enregistré');

-- ---------- Copie et retrait ----------
select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok(
  $$ select public.admin_copy_launch_tasks(current_setting('test.julien')::uuid, current_setting('test.julien')::uuid) $$,
  '22023', 'Choisissez un autre membre.', 'copie vers le même membre refusée');
select throws_ok(
  $$ select public.admin_copy_launch_tasks(current_setting('test.julien')::uuid, 'c1099999-0000-4000-8000-000000000000') $$,
  '22023', 'Membre introuvable.', 'copie vers un membre inconnu refusée');
select is(
  public.admin_copy_launch_tasks(current_setting('test.julien')::uuid,
    (select id from public.launch_members where ref = 'lan109-alpha')),
  3, 'copie : toutes les tâches du membre');
select is(
  public.admin_copy_launch_tasks(current_setting('test.sami')::uuid,
    (select id from public.launch_members where ref = 'lan109-beta')),
  1, 'copie : jamais les tâches partagées du membre');
reset role;
select results_eq(
  $$ select titre, count(*)::int from public.launch_tasks
     where titre in ('Appels fictifs Sami 109', 'Réunion fictive 109') group by titre order by titre collate "C" $$,
  $$ values ('Appels fictifs Sami 109'::text, 2), ('Réunion fictive 109', 1) $$,
  'copie : la réunion partagée n''est pas en double');
select results_eq(
  $$ select t.titre, t.statut::text, t.fait_le, t.fait_par, t.echeance, t.created_by
     from public.launch_tasks t join public.launch_members m on m.id = t.member_id
     where m.ref = 'lan109-alpha' and t.ref is null order by t.echeance $$,
  $$ values ('Tâche déjà faite 109'::text, 'a_faire'::text, null::timestamptz, null::uuid, current_date - 5,
             'c1090000-0000-4000-8000-000000000001'::uuid),
            ('Relance fictive 109', 'a_faire', null, null, current_date - 2, 'c1090000-0000-4000-8000-000000000001'),
            ('Tournée fictive 109', 'a_faire', null, null, current_date + 3, 'c1090000-0000-4000-8000-000000000001') $$,
  'copie : tâches à faire, sans repère ni « fait »');

select pg_temp.connecter('c1090000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_delete_launch_member(current_setting('test.julien')::uuid) $$, 'membre retiré');
select throws_ok($$ select public.admin_delete_launch_member(current_setting('test.julien')::uuid) $$,
  '22023', 'Membre introuvable.', 'membre déjà retiré');
select lives_ok($$ select public.admin_delete_launch_task(current_setting('test.t_relance')::uuid) $$, 'tâche supprimée');
select throws_ok($$ select public.admin_delete_launch_task(current_setting('test.t_relance')::uuid) $$,
  '22023', 'Tâche introuvable.', 'tâche déjà supprimée');
reset role;
select results_eq(
  $$ select titre, member_id from public.launch_tasks
     where id in (current_setting('test.t_tournee')::uuid, current_setting('test.t_fait')::uuid)
     order by titre collate "C" $$,
  $$ values ('Tournée fictive 109'::text, null::uuid), ('Tâche déjà faite 109', null) $$,
  'membre retiré : ses tâches passent à toute l''équipe');
select is_empty($$ select 1 from public.launch_tasks where id = current_setting('test.t_relance')::uuid $$,
  'tâche supprimée : disparue');

select pg_temp.connecter('c1090000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select is(public.my_launch_plan(), '{"member": null, "tasks": []}'::jsonb, 'commercial retiré de l''équipe : plus de planning');
reset role;

-- ---------- Journal ----------
select results_eq(
  $$ select action from public.audit_logs where action like 'lancement.%' group by action order by action collate "C" $$,
  $$ values ('lancement.import'::text), ('lancement.membre_enregistre'), ('lancement.membre_supprime'),
            ('lancement.statut'), ('lancement.tache_enregistree'), ('lancement.tache_supprimee'),
            ('lancement.taches_copiees') $$,
  'opérations du back-office journalisées');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'lancement.import' and data @> '{"tasks_created": 4, "skipped": 10}'::jsonb),
  'import journalisé avec ses compteurs');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'lancement.statut' and target_id = current_setting('test.t_sami')::uuid
            and data @> '{"statut": "en_cours"}'::jsonb and actor_id = 'c1090000-0000-4000-8000-000000000001'),
  'statut changé par un admin : journalisé avec son auteur');
select ok(
  not exists (select 1 from public.audit_logs
              where action = 'lancement.statut' and actor_id = 'c1090000-0000-4000-8000-000000000002'),
  'statut changé par un commercial : pas dans le journal d''administration');
select ok(
  exists (select 1 from public.audit_logs
          where action = 'lancement.taches_copiees' and data @> '{"nombre": 3}'::jsonb
            and actor_id = 'c1090000-0000-4000-8000-000000000001'),
  'copie journalisée avec son auteur et le nombre de tâches');

select * from finish();
rollback;
