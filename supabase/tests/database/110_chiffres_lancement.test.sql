-- Chiffres du lancement (F-66, lot 2, ADR 0209) : RLS et fonctions fermées aux visiteurs, refusées
-- sans double authentification et aux commerciaux ; codes de suivi (création, normalisation, code
-- définitif, espace /p/<code> unique dans les deux sens) ; attribution à l'inscription (partenaire,
-- commercial, code de suivi actif, parrain) ; réglages et import des cibles ; chiffres : courbe et
-- cumuls (semaines vides comprises), canaux, réalisé des membres (code commercial et code de suivi),
-- dossiers sous 48 h, qualité, activité (exclusions des demandes, médiane) ; couverture métier ×
-- commune (rayon, communes choisies, sans zone élargie, validés seulement) ; jauge de « Mon profil »
-- sur les mêmes cas que le test de profileStrength (@menao/core).
-- Données fictives (adresses lan110.*, codes finissant par 110). Le seed est chargé avant : les
-- chiffres globaux sont comparés à un relevé pris avant nos données (écarts), la courbe porte sur
-- mars 2021 (aucune autre fiche), et les membres et les codes sont lus par leur identifiant.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, 'lan110.' || u.nom || '@example.test', false, now(), jsonb_build_object('role', u.role), '{}'
from (values
  ('c1100000-0000-4000-8000-000000000001', 'admin', 'admin'),
  ('c1100000-0000-4000-8000-000000000002', 'julien', 'commercial'),
  ('c1100000-0000-4000-8000-000000000003', 'valideur', 'admin'),
  ('c1100000-0000-4000-8000-000000000004', 'client', 'particulier'),
  ('c1100000-0000-4000-8000-000000000005', 'sami', 'commercial'),
  ('c1100000-0000-4000-8000-000000000006', 'parrain', 'artisan'),
  ('c1100000-0000-4000-8000-000000000010', 'x0', 'artisan'),
  ('c1100000-0000-4000-8000-000000000011', 'x1', 'artisan'),
  ('c1100000-0000-4000-8000-000000000012', 'x2', 'artisan'),
  ('c1100000-0000-4000-8000-000000000013', 'x3', 'artisan'),
  ('c1100000-0000-4000-8000-000000000014', 'x4', 'artisan'),
  ('c1100000-0000-4000-8000-000000000015', 'x5', 'artisan'),
  ('c1100000-0000-4000-8000-000000000016', 'x6', 'artisan'),
  ('c1100000-0000-4000-8000-000000000021', 's1', 'artisan'),
  ('c1100000-0000-4000-8000-000000000022', 's2', 'artisan'),
  ('c1100000-0000-4000-8000-000000000023', 's3', 'artisan'),
  ('c1100000-0000-4000-8000-000000000024', 's4', 'artisan'),
  ('c1100000-0000-4000-8000-000000000025', 's5', 'artisan'),
  ('c1100000-0000-4000-8000-000000000030', 'm0', 'artisan'),
  ('c1100000-0000-4000-8000-000000000041', 'c1', 'artisan'),
  ('c1100000-0000-4000-8000-000000000042', 'c2', 'artisan'),
  ('c1100000-0000-4000-8000-000000000043', 'c3', 'artisan'),
  ('c1100000-0000-4000-8000-000000000044', 'c4', 'artisan'),
  ('c1100000-0000-4000-8000-000000000045', 'c5', 'artisan'),
  ('c1100000-0000-4000-8000-000000000051', 'g', 'artisan'),
  ('c1100000-0000-4000-8000-000000000052', 'g0', 'artisan')
) as u (id, nom, role);

-- Julien : commercial actif, membre de l'équipe ; Sami : compte commercial sans fiche.
insert into public.commercials (id, user_id, code, nom, status) values
  ('c1102000-0000-4000-8000-000000000001', 'c1100000-0000-4000-8000-000000000002', 'julien-110', 'Julien Exemple', 'actif');

-- Équipe : Julien (commercial), les associés (sans compte), la personne qui valide les dossiers,
-- un membre retiré (inactif).
insert into public.launch_members (id, user_id, nom, kind, objectif_valides, ordre, active) values
  ('c1105000-0000-4000-8000-000000000001', 'c1100000-0000-4000-8000-000000000002', 'Julien Exemple 110', 'commercial', 25, 101, true),
  ('c1105000-0000-4000-8000-000000000002', null, 'Associés 110', 'associe', null, 102, true),
  ('c1105000-0000-4000-8000-000000000003', 'c1100000-0000-4000-8000-000000000003', 'Validation 110', 'validation', null, 103, true),
  ('c1105000-0000-4000-8000-000000000004', null, 'Ancien membre 110', 'autre', null, 104, false);

create function pg_temp.connecter(uid uuid, app_role text, aal text default 'aal2') returns void language sql as $$
  select set_config('request.jwt.claims', jsonb_build_object(
    'sub', uid, 'role', 'authenticated', 'aal', aal, 'app_metadata', jsonb_build_object('role', app_role)
  )::text, true);
$$;
-- Relevé des chiffres gardé dans un réglage de la transaction.
create function pg_temp.chiffres(nom text) returns jsonb language sql as $$
  select current_setting('test.' || nom)::jsonb
$$;
-- Écart d'un chiffre entre deux relevés : le seed et les données d'avant ne comptent pas.
create function pg_temp.ecart(avant text, apres text, variadic chemin text[]) returns numeric language sql as $$
  select (pg_temp.chiffres(apres) #>> chemin)::numeric - (pg_temp.chiffres(avant) #>> chemin)::numeric
$$;
create function pg_temp.canal(nom text, p_canal text, champ text) returns int language sql as $$
  select coalesce((
    select (c ->> champ)::int from jsonb_array_elements(pg_temp.chiffres(nom) -> 'channels') c
    where c ->> 'canal' = p_canal
  ), 0)
$$;
create function pg_temp.membre(nom text, p_id uuid) returns jsonb language sql as $$
  select m from jsonb_array_elements(pg_temp.chiffres(nom) -> 'members') m where m ->> 'member_id' = p_id::text
$$;
create function pg_temp.case_couverture(p_trade text, p_insee text) returns int language sql as $$
  select coalesce((
    select (c ->> 'n')::int from jsonb_array_elements(pg_temp.chiffres('couverture') -> 'cells') c
    where c ->> 'trade' = p_trade and c ->> 'code_insee' = p_insee
  ), 0)
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
create function pg_temp.photos(p_artisan uuid, p_count int) returns void language sql as $$
  delete from public.artisan_photos where artisan_id = p_artisan;
  insert into public.artisan_photos (artisan_id, storage_path, sort_order)
  select p_artisan, p_artisan || '/realisation-' || n || '.jpg', n from generate_series(1, p_count) n;
$$;

-- ---------- Structure : RLS, lecture seule, fonctions fermées aux visiteurs ----------
select is_empty(
  $$ select t from unnest(array['acquisition_codes', 'acquisition_code_attributions', 'launch_settings',
       'launch_targets']) as t
     where not (select c.relrowsecurity from pg_class c where c.oid = ('public.' || t)::regclass) $$,
  'RLS activée sur les 4 nouvelles tables');
select policies_are('public', 'acquisition_codes', array['acquisition_codes : lecture par un admin'],
  'codes de suivi : une seule politique');
select policies_are('public', 'acquisition_code_attributions',
  array['acquisition_code_attributions : lecture par un admin'], 'attributions : une seule politique');
select policies_are('public', 'launch_settings', array['launch_settings : lecture par un admin'],
  'réglages : une seule politique');
select policies_are('public', 'launch_targets', array['launch_targets : lecture par un admin'],
  'cibles : une seule politique');
select policy_cmd_is('public', 'acquisition_codes', 'acquisition_codes : lecture par un admin', 'SELECT',
  'codes de suivi : lecture seulement');
select policy_cmd_is('public', 'acquisition_code_attributions', 'acquisition_code_attributions : lecture par un admin',
  'SELECT', 'attributions : lecture seulement');
select policy_cmd_is('public', 'launch_settings', 'launch_settings : lecture par un admin', 'SELECT',
  'réglages : lecture seulement');
select policy_cmd_is('public', 'launch_targets', 'launch_targets : lecture par un admin', 'SELECT',
  'cibles : lecture seulement');
select is_empty(
  $$ select t from unnest(array['acquisition_codes', 'acquisition_code_attributions', 'launch_settings',
       'launch_targets']) as t
     where has_table_privilege('authenticated', 'public.' || t, 'INSERT, UPDATE, DELETE, TRUNCATE')
        or has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE') $$,
  'aucune écriture directe, aucun accès des visiteurs');
select is_empty(
  $$ select f from unnest(array[
       'public.admin_launch_figures()',
       'public.admin_launch_coverage()',
       'public.admin_acquisition_codes()',
       'public.admin_save_acquisition_code(text, text, public.acquisition_channel, uuid, uuid, boolean)',
       'public.admin_save_launch_settings(date, date, integer, integer)',
       'public.admin_import_launch_plan(jsonb)'
     ]) as f
     where to_regprocedure(f) is null
        or not (select p.prosecdef from pg_proc p where p.oid = to_regprocedure(f))
        or has_function_privilege('anon', to_regprocedure(f)::oid, 'execute')
        or not has_function_privilege('authenticated', to_regprocedure(f)::oid, 'execute') $$,
  'fonctions présentes, SECURITY DEFINER, fermées aux visiteurs et ouvertes aux comptes connectés');
select is_empty(
  $$ select f from unnest(array['app.launch_artisans()', 'app.artisan_profile_strength(uuid)',
       'app.link_code_taken(text)']) as f
     where has_function_privilege('anon', to_regprocedure(f)::oid, 'execute')
        or has_function_privilege('authenticated', to_regprocedure(f)::oid, 'execute') $$,
  'fonctions internes fermées aux navigateurs');
select is((select count(*)::int from public.launch_settings), 1, 'réglages : une ligne créée par la migration');

-- ---------- Contrôles de la base ----------
select throws_ok($$ insert into public.acquisition_codes (code, libelle, canal) values ('Majuscules', 'Code 110', 'flyer') $$,
  '23514', null, 'code mal formé : refusé par la base');
select throws_ok($$ insert into public.acquisition_codes (code, libelle, canal) values ('vide-110', '   ', 'flyer') $$,
  '23514', null, 'libellé vide : refusé par la base');
select throws_ok($$ insert into public.launch_settings (id) values (false) $$,
  '23514', null, 'réglages : une seule ligne possible');
select throws_ok($$ insert into public.launch_settings default values $$,
  '23505', null, 'réglages : pas de seconde ligne');
select throws_ok($$ update public.launch_settings set seuil_couverture = 0 $$,
  '23514', null, 'seuil de couverture nul : refusé par la base');
select throws_ok($$ update public.launch_settings set seuil_fiche_complete = 40 $$,
  '23514', null, 'seuil de fiche complète sous 50 : refusé par la base');
select throws_ok($$ update public.launch_settings set debut_recrutement = '2027-02-01', fin_recrutement = '2027-01-01' $$,
  '23514', null, 'début du recrutement après sa fin : refusé par la base');
select throws_ok($$ update public.launch_settings set debut_recrutement = '0027-01-01' $$,
  '23514', null, 'année mal tapée : refusée par la base');
select throws_ok($$ insert into public.launch_targets (indicateur, valeur) values ('inconnu', 1) $$,
  '23514', null, 'indicateur inconnu : refusé par la base');
select throws_ok($$ insert into public.launch_targets (indicateur, jour, valeur) values ('valides_cumul', '2019-12-30', 1) $$,
  '23514', null, 'cible avant 2020 : refusée par la base');
select throws_ok($$ insert into public.launch_targets (indicateur, valeur) values ('valides_cumul', -1) $$,
  '23514', null, 'valeur négative : refusée par la base');
insert into public.launch_targets (indicateur, member_id, valeur)
values ('abonnes_pct', 'c1105000-0000-4000-8000-000000000004', 110110);
select throws_ok(
  $$ insert into public.launch_targets (indicateur, member_id, valeur)
     values ('abonnes_pct', 'c1105000-0000-4000-8000-000000000004', 1) $$,
  '23505', null, 'deux cibles permanentes pour le même indicateur et le même membre : refusées');
delete from public.launch_targets where valeur = 110110;

-- ---------- Réservé aux admins en double authentification ----------
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin', 'aal1');
set local role authenticated;
select throws_ok($$ select public.admin_launch_figures() $$, '42501', null,
  'admin sans double authentification : chiffres illisibles');
select throws_ok($$ select public.admin_launch_coverage() $$, '42501', null,
  'admin sans double authentification : couverture illisible');
select throws_ok($$ select * from public.admin_acquisition_codes() $$, '42501', null,
  'admin sans double authentification : codes illisibles');
select throws_ok($$ select public.admin_save_acquisition_code('aal1-110', 'Code 110', 'flyer') $$, '42501', null,
  'admin sans double authentification : création d''un code impossible');
select throws_ok($$ select public.admin_save_launch_settings() $$, '42501', null,
  'admin sans double authentification : réglages impossibles');
select is_empty($$ select 1 from public.launch_settings $$, 'admin sans double authentification : réglages masqués');
reset role;

select pg_temp.connecter('c1100000-0000-4000-8000-000000000002', 'commercial');
set local role authenticated;
select throws_ok($$ select public.admin_launch_figures() $$, '42501', null, 'commercial : chiffres illisibles');
select throws_ok($$ select public.admin_launch_coverage() $$, '42501', null, 'commercial : couverture illisible');
select throws_ok($$ select * from public.admin_acquisition_codes() $$, '42501', null, 'commercial : codes illisibles');
select throws_ok($$ select public.admin_save_acquisition_code('julien-perso', 'Code 110', 'flyer') $$, '42501', null,
  'commercial : création d''un code impossible');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1, "cibles": []}') $$, '42501', null,
  'commercial : import impossible');
select is_empty($$ select 1 from public.launch_settings $$, 'commercial : réglages masqués');
select is_empty($$ select 1 from public.acquisition_codes $$, 'commercial : codes de suivi masqués');
reset role;

select pg_temp.connecter('c1100000-0000-4000-8000-000000000004', 'particulier');
set local role authenticated;
select throws_ok($$ select public.admin_launch_figures() $$, '42501', null, 'particulier : chiffres illisibles');
select is_empty($$ select 1 from public.launch_targets $$, 'particulier : cibles masquées');
reset role;

set local role anon;
select throws_ok($$ select public.admin_launch_figures() $$, '42501', null, 'visiteur : fonction inaccessible');
select throws_ok($$ select public.admin_launch_coverage() $$, '42501', null, 'visiteur : couverture inaccessible');
select throws_ok($$ select 1 from public.acquisition_codes $$, '42501', null, 'visiteur : aucun accès aux codes');
reset role;

-- ---------- Réglages ----------
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select lives_ok($$ select public.admin_save_launch_settings() $$, 'réglages par défaut enregistrés');
select set_config('test.defaut', public.admin_launch_figures()::text, true);
select throws_ok($$ select public.admin_save_launch_settings('2021-03-24', '2021-03-03') $$,
  '22023', 'Le début du recrutement doit précéder sa fin.', 'début après la fin : refusé');
select throws_ok($$ select public.admin_save_launch_settings('2019-12-30') $$,
  '22023', 'Indiquez des dates entre 2020 et 2040.', 'date avant 2020 : refusée');
select throws_ok($$ select public.admin_save_launch_settings(p_seuil_couverture => 0) $$,
  '22023', 'Seuil de couverture : entre 1 et 20 artisans.', 'seuil de couverture nul : refusé');
select throws_ok($$ select public.admin_save_launch_settings(p_seuil_couverture => 21) $$,
  '22023', 'Seuil de couverture : entre 1 et 20 artisans.', 'seuil de couverture trop haut : refusé');
select throws_ok($$ select public.admin_save_launch_settings(p_seuil_fiche_complete => 49) $$,
  '22023', 'Seuil d''une fiche complète : entre 50 et 100 %.', 'seuil de fiche complète trop bas : refusé');
select throws_ok($$ select public.admin_save_launch_settings(p_seuil_fiche_complete => 101) $$,
  '22023', 'Seuil d''une fiche complète : entre 50 et 100 %.', 'seuil de fiche complète trop haut : refusé');
-- Début seul (un mercredi, trois semaines avant la semaine en cours) : jusqu'à la semaine en cours.
select lives_ok(
  $$ select public.admin_save_launch_settings(date_trunc('week', now() at time zone 'Europe/Paris')::date - 19) $$,
  'début du recrutement seul');
select set_config('test.debut', public.admin_launch_figures()::text, true);
reset role;

select is(pg_temp.chiffres('defaut') -> 'settings',
  '{"debut_recrutement": null, "fin_recrutement": null, "seuil_couverture": 3, "seuil_fiche_complete": 100}'::jsonb,
  'réglages par défaut : sans période, 3 artisans par case, fiche complète à 100 %');
select is(pg_temp.chiffres('defaut') ->> 'today', (now() at time zone 'Europe/Paris')::date::text,
  'jour du relevé, à l''heure de Paris');
select is(jsonb_array_length(pg_temp.chiffres('defaut') -> 'weeks'), 12, 'sans période : les 12 dernières semaines');
select is(pg_temp.chiffres('defaut') -> 'weeks' -> 0 ->> 'semaine',
  (date_trunc('week', now() at time zone 'Europe/Paris')::date - 77)::text,
  'sans période : 11 semaines avant la semaine en cours…');
select is(pg_temp.chiffres('defaut') -> 'weeks' -> 11 ->> 'semaine',
  date_trunc('week', now() at time zone 'Europe/Paris')::date::text, '… jusqu''à la semaine en cours (lundi)');
select is(
  (select array_agg(w ->> 'semaine' order by i)
   from jsonb_array_elements(pg_temp.chiffres('debut') -> 'weeks') with ordinality as x (w, i)),
  (select array_agg((date_trunc('week', now() at time zone 'Europe/Paris')::date - 7 * i)::text order by i desc)
   from generate_series(0, 3) i),
  'début seul : de la semaine du début (son lundi) à la semaine en cours');
select is((select count(*)::int from public.audit_logs where action = 'lancement.reglages'), 2,
  'réglages journalisés');

-- ---------- Import des réglages et des cibles ----------
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select is(
  public.admin_import_launch_plan($j${
    "version": 1,
    "members": [{"ref": "lan110-equipe", "nom": "Équipe 110", "kind": "associe"}],
    "tasks": [],
    "reglages": {"debut_recrutement": "2021-03-03", "fin_recrutement": "2021-03-24",
                 "seuil_couverture": 2, "seuil_fiche_complete": 50},
    "cibles": [
      {"indicateur": "valides_cumul", "member": null, "jour": "2021-03-22", "valeur": 5},
      {"indicateur": "valides_cumul", "member": "lan110-equipe", "jour": null, "valeur": 3},
      {"indicateur": "inconnu", "member": null, "jour": null, "valeur": 1},
      {"indicateur": "demandes_semaine", "member": "inconnu-110", "jour": null, "valeur": 1},
      {"indicateur": "reponse_72h_pct", "member": null, "jour": "2019-12-30", "valeur": 90},
      {"indicateur": "reponse_72h_pct", "member": null, "jour": "demain", "valeur": 90},
      {"indicateur": "abonnes_pct", "member": null, "jour": null, "valeur": -1}
    ]}$j$::jsonb),
  '{"members_created": 1, "members_updated": 0, "tasks_created": 0, "tasks_updated": 0,
    "targets_created": 2, "targets_updated": 0, "targets_deleted": 0, "settings_updated": true, "skipped": 5}'::jsonb,
  'import : réglages appliqués, 2 cibles créées, 5 lignes invalides ignorées (indicateur, membre, date, valeur)');
select results_eq(
  $$ select t.indicateur, m.ref, t.jour::text, t.valeur
     from public.launch_targets t
     left join public.launch_members m on m.id = t.member_id
     where t.jour = '2021-03-22' or m.ref = 'lan110-equipe'
     order by m.ref nulls first $$,
  $$ values ('valides_cumul'::text, null::text, '2021-03-22'::text, 5::numeric),
            ('valides_cumul', 'lan110-equipe', null, 3) $$,
  'cibles : celle de l''équipe (datée) et celle du membre (permanente)');
select results_eq(
  $$ select debut_recrutement::text, fin_recrutement::text, seuil_couverture, seuil_fiche_complete
     from public.launch_settings $$,
  $$ values ('2021-03-03'::text, '2021-03-24'::text, 2, 50) $$,
  'réglages remplacés par ceux du fichier');
select is(
  public.admin_import_launch_plan($j${
    "version": 1,
    "members": [{"ref": "lan110-equipe", "nom": "Équipe 110", "kind": "associe"}],
    "reglages": {"debut_recrutement": "2021-03-03", "fin_recrutement": "2021-03-24",
                 "seuil_couverture": 2, "seuil_fiche_complete": 50},
    "cibles": [
      {"indicateur": "valides_cumul", "member": null, "jour": "2021-03-22", "valeur": 6},
      {"indicateur": "valides_cumul", "member": "lan110-equipe", "valeur": 4}
    ]}$j$::jsonb),
  '{"members_created": 0, "members_updated": 1, "tasks_created": 0, "tasks_updated": 0,
    "targets_created": 0, "targets_updated": 2, "targets_deleted": 0, "settings_updated": true, "skipped": 0}'::jsonb,
  'réimport : cibles mises à jour par indicateur, membre et jour');
select is(
  (select array_agg(t.valeur order by t.member_id nulls first) from public.launch_targets t
   left join public.launch_members m on m.id = t.member_id
   where t.jour = '2021-03-22' or m.ref = 'lan110-equipe'),
  array[6, 4]::numeric[], 'réimport : nouvelles valeurs, sans doublon');
-- Plan revu : l'échéance de l'équipe passe au 29 mars ; celle du 22 mars n'est plus dans le fichier.
select is(
  public.admin_import_launch_plan($j${
    "version": 1,
    "cibles": [
      {"indicateur": "valides_cumul", "member": null, "jour": "2021-03-29", "valeur": 6},
      {"indicateur": "valides_cumul", "member": "lan110-equipe", "jour": null, "valeur": 4}
    ]}$j$::jsonb),
  '{"members_created": 0, "members_updated": 0, "tasks_created": 0, "tasks_updated": 0,
    "targets_created": 1, "targets_updated": 1, "targets_deleted": 1, "settings_updated": false, "skipped": 0}'::jsonb,
  'réimport : les cibles absentes du fichier sont retirées (remplacement complet)');
select results_eq(
  $$ select t.jour::text, t.valeur from public.launch_targets t where t.member_id is null order by t.jour $$,
  $$ values ('2021-03-29'::text, 6::numeric) $$,
  'réimport : seule l''échéance du nouveau plan reste');
select is(
  public.admin_import_launch_plan($j${
    "version": 1,
    "cibles": [
      {"indicateur": "valides_cumul", "member": null, "jour": "2021-03-22", "valeur": 6},
      {"indicateur": "valides_cumul", "member": "lan110-equipe", "jour": null, "valeur": 4}
    ]}$j$::jsonb) ->> 'targets_deleted',
  '1', 'cibles du test remises');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": {"debut_recrutement": "2021-03-03",
    "fin_recrutement": "2021-03-24", "seuil_couverture": 50}}$j$::jsonb) ->> 'settings_updated',
  'false', 'réglages : seuil hors bornes, réglages ignorés');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": {"debut_recrutement": "2021-03-24",
    "fin_recrutement": "2021-03-03"}}$j$::jsonb) ->> 'settings_updated',
  'false', 'réglages : début après la fin, réglages ignorés');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": {"debut_recrutement": "2021-3-3"}}$j$::jsonb)
    ->> 'settings_updated',
  'false', 'réglages : date mal écrite, réglages ignorés');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": []}$j$::jsonb) ->> 'settings_updated',
  'false', 'réglages : autre chose qu''un objet, ignorés');
select is(
  public.admin_import_launch_plan('{"version": 1, "members": [], "tasks": []}'::jsonb),
  '{"members_created": 0, "members_updated": 0, "tasks_created": 0, "tasks_updated": 0,
    "targets_created": 0, "targets_updated": 0, "targets_deleted": 0, "settings_updated": false, "skipped": 0}'::jsonb,
  'fichier du lot 1 (sans réglages ni cibles) : rien d''autre ne change');
select results_eq(
  $$ select debut_recrutement::text, fin_recrutement::text, seuil_couverture, seuil_fiche_complete
     from public.launch_settings $$,
  $$ values ('2021-03-03'::text, '2021-03-24'::text, 2, 50) $$,
  'réglages invalides ou absents : réglages en place gardés');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": {"debut_recrutement": "2021-03-03",
    "fin_recrutement": "2021-03-24"}}$j$::jsonb) ->> 'settings_updated',
  'true', 'réglages sans seuils : appliqués…');
select results_eq(
  $$ select seuil_couverture, seuil_fiche_complete from public.launch_settings $$,
  $$ values (3, 100) $$, '… seuils remis à leur valeur par défaut (remplacement complet)');
select is(
  public.admin_import_launch_plan($j${"version": 1, "reglages": {"debut_recrutement": "2021-03-03",
    "fin_recrutement": "2021-03-24", "seuil_couverture": 2, "seuil_fiche_complete": 50}}$j$::jsonb)
    ->> 'settings_updated',
  'true', 'réglages du test remis');
select throws_ok($$ select public.admin_import_launch_plan('{"version": 1, "cibles": {}}') $$,
  '22023', 'Fichier non reconnu : liste des cibles attendue.', 'cibles : liste attendue');
select throws_ok(
  $$ select public.admin_import_launch_plan(jsonb_build_object('version', 1, 'cibles', (
       select jsonb_agg(jsonb_build_object('indicateur', 'valides_cumul', 'valeur', n)) from generate_series(1, 2001) n))) $$,
  '22023', 'Trop de cibles : 2 000 au plus.', 'plus de 2 000 cibles : refusé');
reset role;
select is((select count(*)::int from public.launch_targets), 2, 'fichiers sans clé « cibles » : cibles en place gardées');
select is((select count(*)::int from public.audit_logs where action = 'lancement.import'), 11, 'imports journalisés');

-- ---------- Codes de suivi : création, code définitif, espace /p/<code> unique ----------
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select set_config('test.flyer', public.admin_save_acquisition_code(' Flyer-110 ', ' Flyers 110 ', 'flyer',
  p_member_id => 'c1105000-0000-4000-8000-000000000002')::text, true);
select set_config('test.salon', public.admin_save_acquisition_code('salon110', 'Salon 110', 'salon',
  p_member_id => 'c1105000-0000-4000-8000-000000000001')::text, true);
select set_config('test.off', public.admin_save_acquisition_code('off-110', 'Code inactif 110', 'autre',
  p_active => false)::text, true);
select results_eq(
  $$ select code, libelle, canal::text, active from public.acquisition_codes
     where id = current_setting('test.flyer')::uuid $$,
  $$ values ('flyer-110'::text, 'Flyers 110'::text, 'flyer'::text, true) $$,
  'code normalisé (minuscules, sans espaces), libellé sans espaces autour');
select lives_ok(
  $$ select public.admin_save_partner('part-110', 'Agence Exemple 110', '73282932000074',
       'lan110.agence@example.test', 'actif') $$,
  'partenaire créé');
select throws_ok($$ select public.admin_save_acquisition_code('Julien-110', 'Doublon 110', 'flyer') $$,
  '22023', 'Ce code est déjà pris.', 'code d''un commercial : déjà pris');
select throws_ok($$ select public.admin_save_acquisition_code('part-110', 'Doublon 110', 'flyer') $$,
  '22023', 'Ce code est déjà pris.', 'code d''un partenaire : déjà pris');
select throws_ok($$ select public.admin_save_acquisition_code('flyer-110', 'Doublon 110', 'salon') $$,
  '22023', 'Ce code est déjà pris.', 'code de suivi existant : déjà pris');
select throws_ok($$ select public.admin_save_acquisition_code('ab', 'Court 110', 'flyer') $$,
  '22023', 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.', 'code trop court : refusé');
select throws_ok($$ select public.admin_save_acquisition_code('flyer_110', 'Souligné 110', 'flyer') $$,
  '22023', 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.', 'caractère interdit : refusé');
select throws_ok($$ select public.admin_save_acquisition_code('vide-110', '  ', 'flyer') $$,
  '22023', 'Indiquez le libellé (80 caractères au plus).', 'libellé vide : refusé');
select throws_ok($$ select public.admin_save_acquisition_code('long-110', repeat('x', 81), 'flyer') $$,
  '22023', 'Indiquez le libellé (80 caractères au plus).', 'libellé trop long : refusé');
select throws_ok($$ select public.admin_save_acquisition_code('canal-110', 'Sans canal 110', null) $$,
  '22023', 'Choisissez le canal.', 'canal absent : refusé');
select throws_ok(
  $$ select public.admin_save_acquisition_code('membre-110', 'Membre 110', 'flyer',
       p_member_id => 'c1109999-0000-4000-8000-000000000000') $$,
  '22023', 'Membre introuvable.', 'membre inconnu : refusé');
-- Code définitif : libellé, canal, membre et état modifiables, jamais le code.
select throws_ok(
  $$ select public.admin_save_acquisition_code('autre-110', 'Flyers 110', 'flyer',
       p_id => current_setting('test.flyer')::uuid) $$,
  '22023', 'Un code ne change jamais : créez-en un nouveau.', 'modification du code : refusée');
select is(
  public.admin_save_acquisition_code(' FLYER-110 ', 'Flyers du marché 110', 'flyer',
    p_id => current_setting('test.flyer')::uuid, p_member_id => 'c1105000-0000-4000-8000-000000000002'),
  current_setting('test.flyer')::uuid, 'même code (casse et espaces ignorés) : libellé modifié');
select lives_ok(
  $$ select public.admin_save_acquisition_code(null, 'Flyers du marché 110', 'flyer',
       p_id => current_setting('test.flyer')::uuid, p_member_id => 'c1105000-0000-4000-8000-000000000002') $$,
  'code absent en modification : ignoré');
select throws_ok(
  $$ select public.admin_save_acquisition_code(null, 'Fantôme 110', 'flyer', p_id => 'c1109999-0000-4000-8000-000000000000') $$,
  '22023', 'Code introuvable.', 'code inconnu : refusé');
select results_eq(
  $$ select code, libelle, member_id from public.acquisition_codes where id = current_setting('test.flyer')::uuid $$,
  $$ values ('flyer-110'::text, 'Flyers du marché 110'::text, 'c1105000-0000-4000-8000-000000000002'::uuid) $$,
  'code inchangé, libellé et responsable à jour');
-- Dans l'autre sens : aucun partenaire ni commercial ne prend un code de suivi.
select throws_ok(
  $$ select public.admin_save_partner('flyer-110', 'Agence Exemple 110', '73282932000074',
       'lan110.agence2@example.test', 'actif') $$,
  '22023', 'Ce code est déjà utilisé.', 'un partenaire ne peut pas prendre un code de suivi');
select throws_ok(
  $$ select public.admin_register_commercial('c1100000-0000-4000-8000-000000000005', 'Sami Exemple', 'Salon110') $$,
  '22023', 'Ce code est déjà utilisé.', 'un commercial ne peut pas prendre un code de suivi');
select ok(not public.admin_commercial_code_available('flyer-110'), 'code de suivi : indisponible pour un commercial');
reset role;

select throws_ok(
  $$ insert into public.commercials (user_id, code, nom) values ('c1100000-0000-4000-8000-000000000005', 'salon110', 'Sami') $$,
  '22023', 'Ce code est déjà utilisé.', 'écriture directe d''un commercial sur un code de suivi : refusée');
select throws_ok(
  $$ insert into public.acquisition_codes (code, libelle, canal) values ('julien-110', 'Direct 110', 'flyer') $$,
  '22023', 'Ce code est déjà pris.', 'écriture directe d''un code de suivi déjà pris : refusée');
select throws_ok(
  $$ update public.acquisition_codes set code = 'autre-110' where id = current_setting('test.flyer')::uuid $$,
  '22023', 'Un code ne change jamais : créez-en un nouveau.', 'écriture directe d''un autre code : refusée');
select ok(app.link_code_taken('flyer-110'), 'espace /p/<code> : codes de suivi compris');
select is((select count(*)::int from public.audit_logs where action = 'lancement.code_enregistre'), 5,
  'créations et modifications de codes journalisées');

-- ---------- Relevé avant nos artisans ----------
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select set_config('test.avant', public.admin_launch_figures()::text, true);
reset role;

-- ---------- Artisans du lancement (mars 2021) et inscriptions ----------
-- X0 : validé avant la courbe (arrivée directe) ; X1 : flyer, validé la 1re semaine ; X2 : code du
-- commercial, validé la 3e ; X3 : salon, jamais envoyé ; X4 : invité par un particulier, validé la
-- 3e semaine puis suspendu ; X5 : renvoyé après une demande de complément, en vérification depuis
-- 2021 ; X6 : en vérification depuis une heure ; R : parrain validé (sans décision enregistrée) ;
-- S1 à S5 : inscriptions du jour avec un code.
insert into public.artisans (id, user_id, status, raison_sociale, created_at, submitted_at, sirene_active,
  decennale_non_soumis)
values
  ('c1101000-0000-4000-8000-000000000010', 'c1100000-0000-4000-8000-000000000010', 'valide', 'TOITURE ZERO 110',
   '2021-02-10 10:00+00', '2021-02-14 10:00+00', true, true),
  ('c1101000-0000-4000-8000-000000000011', 'c1100000-0000-4000-8000-000000000011', 'valide', 'TOITURE UN 110',
   '2021-03-02 09:00+00', '2021-03-02 10:00+00', null, false),
  ('c1101000-0000-4000-8000-000000000012', 'c1100000-0000-4000-8000-000000000012', 'valide', 'TOITURE DEUX 110',
   '2021-03-02 09:00+00', '2021-03-02 10:00+00', null, false),
  ('c1101000-0000-4000-8000-000000000013', 'c1100000-0000-4000-8000-000000000013', 'brouillon', 'TOITURE TROIS 110',
   '2021-03-09 09:00+00', null, null, false),
  ('c1101000-0000-4000-8000-000000000014', 'c1100000-0000-4000-8000-000000000014', 'suspendu', 'TOITURE QUATRE 110',
   '2021-03-16 08:00+00', '2021-03-16 09:00+00', null, false),
  ('c1101000-0000-4000-8000-000000000015', 'c1100000-0000-4000-8000-000000000015', 'en_verification', 'TOITURE CINQ 110',
   '2021-03-09 10:00+00', '2021-03-20 10:00+00', null, false),
  ('c1101000-0000-4000-8000-000000000016', 'c1100000-0000-4000-8000-000000000016', 'en_verification', 'TOITURE SIX 110',
   now(), now() - interval '1 hour', null, false),
  ('c1101000-0000-4000-8000-000000000006', 'c1100000-0000-4000-8000-000000000006', 'valide', 'PARRAIN 110',
   now(), null, null, false);
insert into public.artisans (id, user_id, raison_sociale)
select ('c1101000-0000-4000-8000-0000000000' || n)::uuid, ('c1100000-0000-4000-8000-0000000000' || n)::uuid,
  'INSCRIPTION ' || n || ' 110'
from generate_series(21, 25) n;

insert into public.artisan_reviews (artisan_id, admin_id, decision, created_at) values
  ('c1101000-0000-4000-8000-000000000010', 'c1100000-0000-4000-8000-000000000001', 'valide', '2021-02-15 09:00+00'),
  ('c1101000-0000-4000-8000-000000000011', 'c1100000-0000-4000-8000-000000000003', 'valide', '2021-03-03 09:00+00'),
  ('c1101000-0000-4000-8000-000000000012', 'c1100000-0000-4000-8000-000000000003', 'valide', '2021-03-16 09:00+00'),
  ('c1101000-0000-4000-8000-000000000014', 'c1100000-0000-4000-8000-000000000003', 'valide', '2021-03-17 09:00+00'),
  ('c1101000-0000-4000-8000-000000000015', 'c1100000-0000-4000-8000-000000000003', 'complement', '2021-03-10 09:00+00');
insert into public.acquisition_code_attributions (artisan_id, code_id) values
  ('c1101000-0000-4000-8000-000000000011', current_setting('test.flyer')::uuid),
  ('c1101000-0000-4000-8000-000000000013', current_setting('test.salon')::uuid);
insert into public.commercial_attributions (artisan_id, commercial_id) values
  ('c1101000-0000-4000-8000-000000000012', 'c1102000-0000-4000-8000-000000000001');
insert into public.artisan_invitations (particulier_id, company, phone, status, artisan_id, joined_at) values
  ('c1100000-0000-4000-8000-000000000004', 'Toiture Quatre 110', '+33600000110', 'inscrit',
   'c1101000-0000-4000-8000-000000000014', now());
insert into public.artisan_referral_codes (artisan_id, code) values ('c1101000-0000-4000-8000-000000000006', 'ref11000');

-- X0 : fiche à 55 % (badge, photo de profil, une spécialité) ; X1 : application installée ; X0 et X2 :
-- un devis envoyé, celui de X2 à un client apporté par lui (demande directe).
select pg_temp.deposer('c1101000-0000-4000-8000-000000000010', array['rc_pro', 'urssaf']);
update public.profiles set avatar_path = 'c1100000-0000-4000-8000-000000000010/avatar.jpg'
where user_id = 'c1100000-0000-4000-8000-000000000010';
insert into public.artisan_trades (artisan_id, trade_code) values ('c1101000-0000-4000-8000-000000000010', 'carreleur');
insert into public.artisan_work_types (artisan_id, work_type_code) values ('c1101000-0000-4000-8000-000000000010', 'faience');
insert into public.push_tokens (user_id, token, platform)
values ('c1100000-0000-4000-8000-000000000011', 'ExponentPushToken[lan110x1]', 'ios');
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom, preferred_artisan_id, created_at)
values
  ('c1106000-0000-4000-8000-000000000010', 'c1100000-0000-4000-8000-000000000004', 'Toiture fictive 110', 'couvreur',
   '06088', 'Nice', null, '2021-02-20 10:00+00'),
  ('c1106000-0000-4000-8000-000000000012', 'c1100000-0000-4000-8000-000000000004', 'Toiture fictive 110', 'couvreur',
   '06088', 'Nice', 'c1101000-0000-4000-8000-000000000012', '2021-03-17 10:00+00');
insert into public.requests (id, project_id, artisan_id, particulier_id, contact_phone, status, created_at, responded_at)
values
  ('c1107000-0000-4000-8000-000000000010', 'c1106000-0000-4000-8000-000000000010', 'c1101000-0000-4000-8000-000000000010',
   'c1100000-0000-4000-8000-000000000004', '+33612345678', 'acceptee', '2021-02-20 10:00+00', '2021-02-20 12:00+00'),
  ('c1107000-0000-4000-8000-000000000012', 'c1106000-0000-4000-8000-000000000012', 'c1101000-0000-4000-8000-000000000012',
   'c1100000-0000-4000-8000-000000000004', '+33612345678', 'acceptee', '2021-03-17 10:00+00', '2021-03-17 12:00+00');
insert into public.chantiers (id, project_id, request_id, artisan_id, particulier_id, title)
select ('c1108000-0000-4000-8000-0000000000' || n)::uuid, ('c1106000-0000-4000-8000-0000000000' || n)::uuid,
  ('c1107000-0000-4000-8000-0000000000' || n)::uuid, ('c1101000-0000-4000-8000-0000000000' || n)::uuid,
  'c1100000-0000-4000-8000-000000000004', 'Toiture ' || n
from unnest(array['10', '12']) n;
insert into public.quotes (chantier_id, artisan_id, status, numero, sent_at, valid_until, start_date, duration_days,
  payment_schedule, document)
select ('c1108000-0000-4000-8000-0000000000' || n)::uuid, ('c1101000-0000-4000-8000-0000000000' || n)::uuid, 'envoye',
  'DEVIS-2021-01' || n, '2021-03-18 10:00+00', '2021-04-18', '2021-05-03', 5, '[]'::jsonb, '{}'::jsonb
from unnest(array['10', '12']) n;

-- Inscriptions du jour : partenaire, commercial, code de suivi, parrain, code de suivi inactif.
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000021', '{"partner_code": " Flyer-110 "}'::jsonb) $$,
  'inscription avec un code de suivi');
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000021', '{"partner_code": "salon110"}'::jsonb) $$,
  'second code de suivi reçu : sans erreur');
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000022', '{"partner_code": "julien-110"}'::jsonb) $$,
  'inscription avec le code d''un commercial');
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000023', '{"partner_code": "part-110"}'::jsonb) $$,
  'inscription avec le code d''un partenaire');
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000024', '{"partner_code": "ref11000"}'::jsonb) $$,
  'inscription avec le code d''un parrain');
select lives_ok(
  $$ select app.apply_artisan_signup('c1101000-0000-4000-8000-000000000025', '{"partner_code": "off-110"}'::jsonb) $$,
  'inscription avec un code de suivi inactif');
select results_eq(
  $$ select a.artisan_id::text, k.code from public.acquisition_code_attributions a
     join public.acquisition_codes k on k.id = a.code_id
     where a.artisan_id::text between 'c1101000-0000-4000-8000-000000000021' and 'c1101000-0000-4000-8000-000000000025'
     order by 1 $$,
  $$ values ('c1101000-0000-4000-8000-000000000021'::text, 'flyer-110'::text) $$,
  'code de suivi actif : attribution gardée (le premier code reçu l''emporte) ; code inactif, commercial, partenaire et parrain : aucune');
select is(
  (select c.code from public.commercial_attributions ca join public.commercials c on c.id = ca.commercial_id
   where ca.artisan_id = 'c1101000-0000-4000-8000-000000000022'),
  'julien-110', 'code d''un commercial : attribué au commercial');
select is(
  (select p.code from public.partner_attributions pa join public.partners p on p.id = pa.partner_id
   where pa.artisan_id = 'c1101000-0000-4000-8000-000000000023'),
  'part-110', 'code d''un partenaire : attribué au partenaire');
select is(
  (select r.referrer_artisan_id from public.artisan_referrals r
   where r.referred_artisan_id = 'c1101000-0000-4000-8000-000000000024'),
  'c1101000-0000-4000-8000-000000000006'::uuid, 'code d''un parrain : parrainage');
select is_empty(
  $$ select 1 from public.partner_attributions where artisan_id = 'c1101000-0000-4000-8000-000000000025'
     union all select 1 from public.commercial_attributions where artisan_id = 'c1101000-0000-4000-8000-000000000025'
     union all select 1 from public.acquisition_code_attributions where artisan_id = 'c1101000-0000-4000-8000-000000000025'
     union all select 1 from public.artisan_referrals where referred_artisan_id = 'c1101000-0000-4000-8000-000000000025' $$,
  'code de suivi inactif : aucune attribution');

-- Codes de parrainage dans l'espace /p/<code>, dans les deux sens.
select throws_ok(
  $$ insert into public.artisan_referral_codes (artisan_id, code) values ('c1101000-0000-4000-8000-000000000021', 'salon110') $$,
  '22023', 'Ce code est déjà utilisé.', 'code de parrainage pris sur un code de suivi : refusé');
select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select throws_ok($$ select public.admin_save_acquisition_code('ref11000', 'Doublon 110', 'flyer') $$,
  '22023', 'Ce code est déjà pris.', 'code d''un parrain : déjà pris');
select set_config('test.apres', public.admin_launch_figures()::text, true);
select results_eq(
  $$ select code, libelle, canal::text, member_nom, active, inscrits, valides
     from public.admin_acquisition_codes()
     where code in ('flyer-110', 'off-110', 'salon110') order by code collate "C" $$,
  $$ values ('flyer-110'::text, 'Flyers du marché 110'::text, 'flyer'::text, 'Associés 110'::text, true, 2, 1),
            ('off-110', 'Code inactif 110', 'autre', null, false, 0, 0),
            ('salon110', 'Salon 110', 'salon', 'Julien Exemple 110', true, 1, 0) $$,
  'codes de suivi : responsable, état, inscrits et validés (première validation)');
reset role;

-- ---------- Courbe : mars 2021, semaines vides comprises ----------
select is(pg_temp.chiffres('apres') -> 'settings',
  '{"debut_recrutement": "2021-03-03", "fin_recrutement": "2021-03-24", "seuil_couverture": 2, "seuil_fiche_complete": 50}'::jsonb,
  'réglages lus avec les chiffres');
select ok((pg_temp.chiffres('apres') -> 'targets')
    @> '[{"indicateur": "valides_cumul", "member_id": null, "jour": "2021-03-22", "valeur": 6}]'::jsonb,
  'cibles lues avec les chiffres');
select results_eq(
  $$ select w ->> 'semaine', (w ->> 'inscrits')::int, (w ->> 'valides')::int, (w ->> 'inscrits_cumul')::int,
       (w ->> 'valides_cumul')::int
     from jsonb_array_elements(pg_temp.chiffres('apres') -> 'weeks') with ordinality as x (w, i) order by i $$,
  $$ values ('2021-03-01'::text, 2, 1, 3, 2), ('2021-03-08', 2, 0, 5, 2), ('2021-03-15', 1, 2, 6, 4),
            ('2021-03-22', 0, 0, 6, 4) $$,
  'courbe : une ligne par semaine du recrutement, validés à leur première validation (suspendu compris), cumuls depuis le premier inscrit');

-- ---------- Canaux d'arrivée ----------
select results_eq(
  $$ select c, pg_temp.canal('apres', c, 'inscrits') - pg_temp.canal('avant', c, 'inscrits'),
       pg_temp.canal('apres', c, 'valides') - pg_temp.canal('avant', c, 'valides'),
       pg_temp.canal('apres', c, 'valides_semaine') - pg_temp.canal('avant', c, 'valides_semaine')
     from unnest(array['commercial', 'partenaire', 'flyer', 'salon', 'parrainage', 'invitation', 'direct']) c $$,
  $$ values ('commercial'::text, 2, 1, 0), ('partenaire', 1, 0, 0), ('flyer', 2, 1, 0), ('salon', 1, 0, 0),
            ('parrainage', 1, 0, 0), ('invitation', 1, 1, 0), ('direct', 5, 2, 1) $$,
  'canaux : un seul par inscription, dans l''ordre d''attribution (validé sans décision : à l''envoi, sinon à l''inscription)');
select is(
  (select array_agg(c ->> 'canal' order by i) from jsonb_array_elements(pg_temp.chiffres('apres') -> 'channels')
     with ordinality as x (c, i)
   where c ->> 'canal' in ('commercial', 'partenaire', 'flyer', 'salon', 'parrainage', 'invitation')),
  array['commercial', 'partenaire', 'flyer', 'salon', 'parrainage', 'invitation'],
  'canaux dans l''ordre d''affichage');

-- ---------- Membres ----------
select is(
  (select array_agg((m ->> 'member_id')::uuid order by i)
   from jsonb_array_elements(pg_temp.chiffres('apres') -> 'members') with ordinality as x (m, i)
   where m ->> 'member_id' like 'c1105000-%'),
  array['c1105000-0000-4000-8000-000000000001', 'c1105000-0000-4000-8000-000000000002',
        'c1105000-0000-4000-8000-000000000003']::uuid[],
  'membres actifs seulement, dans l''ordre de l''équipe');
select is(
  pg_temp.membre('apres', 'c1105000-0000-4000-8000-000000000001') - 'weeks',
  '{"member_id": "c1105000-0000-4000-8000-000000000001", "nom": "Julien Exemple 110", "kind": "commercial",
    "objectif": 25, "inscrits": 3, "valides": 1, "valides_semaine": 0, "dossiers_traites": 0, "dossiers_mesurables": 0,
    "dossiers_48h": 0}'::jsonb,
  'commercial : réalisé par son code commercial et par le code de suivi dont il est responsable');
select results_eq(
  $$ select w ->> 'semaine', (w ->> 'valides')::int
     from jsonb_array_elements(pg_temp.membre('apres', 'c1105000-0000-4000-8000-000000000001') -> 'weeks')
       with ordinality as x (w, i) order by i $$,
  $$ values ('2021-02-01'::text, 0), ('2021-02-08', 0), ('2021-02-15', 0), ('2021-02-22', 0), ('2021-03-01', 0),
            ('2021-03-08', 0), ('2021-03-15', 1), ('2021-03-22', 0) $$,
  'membre : 8 semaines jusqu''à la fin du recrutement terminé');
select is(
  pg_temp.membre('apres', 'c1105000-0000-4000-8000-000000000002') - 'weeks',
  '{"member_id": "c1105000-0000-4000-8000-000000000002", "nom": "Associés 110", "kind": "associe",
    "objectif": null, "inscrits": 2, "valides": 1, "valides_semaine": 0, "dossiers_traites": 0, "dossiers_mesurables": 0,
    "dossiers_48h": 0}'::jsonb,
  'associés : réalisé par leur code de suivi');
select is(
  pg_temp.membre('apres', 'c1105000-0000-4000-8000-000000000002') -> 'weeks' -> 4,
  '{"semaine": "2021-03-01", "valides": 1}'::jsonb, 'associés : validé la semaine du 1er mars');
select is(
  pg_temp.membre('apres', 'c1105000-0000-4000-8000-000000000003') - 'weeks',
  '{"member_id": "c1105000-0000-4000-8000-000000000003", "nom": "Validation 110", "kind": "validation",
    "objectif": null, "inscrits": 0, "valides": 0, "valides_semaine": 0, "dossiers_traites": 4, "dossiers_mesurables": 3,
    "dossiers_48h": 2}'::jsonb,
  'validation : toutes les décisions de son compte, 3 mesurables (complément suivi d''un renvoi exclu), 2 sous 48 h');

-- ---------- Totaux, qualité et activité (écarts : le seed ne compte pas) ----------
select results_eq(
  $$ select c, pg_temp.ecart('avant', 'apres', 'totals', c)::int
     from unnest(array['inscrits', 'dossiers_envoyes', 'valides', 'fiches_completes', 'en_essai', 'abonnes']) c $$,
  $$ values ('inscrits'::text, 13), ('dossiers_envoyes', 7), ('valides', 4), ('fiches_completes', 1),
            ('en_essai', 0), ('abonnes', 0) $$,
  'totaux : inscrits (radiés et suspendus compris), dossiers envoyés, validés actuels, fiches complètes');
select results_eq(
  $$ select c, pg_temp.ecart('avant', 'apres', 'quality', c)::int
     from unnest(array['dossiers_decides', 'dossiers_48h', 'en_attente', 'en_attente_48h', 'fiches_completes',
       'valides', 'app_installee', 'premier_devis_perso']) c $$,
  $$ values ('dossiers_decides'::text, 4), ('dossiers_48h', 3), ('en_attente', 2), ('en_attente_48h', 1),
            ('fiches_completes', 1), ('valides', 4), ('app_installee', 1), ('premier_devis_perso', 1) $$,
  'qualité : décisions sous 48 h, dossiers en attente, fiche complète au seuil, application, premier devis à ses clients');
select results_eq(
  $$ select c, pg_temp.ecart('avant', 'apres', 'activity', c)::int
     from unnest(array['demandes_semaine', 'artisans_actifs', 'artisans_4_demandes', 'demandes_72h',
       'artisans_devis_envoye', 'essais']) c $$,
  $$ values ('demandes_semaine'::text, 0), ('artisans_actifs', 4), ('artisans_4_demandes', 0), ('demandes_72h', 0),
            ('artisans_devis_envoye', 2), ('essais', 0) $$,
  'activité : demandes de 2021 hors des fenêtres, artisans avec un devis envoyé');
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000010'), 55,
  'fiche à 55 % : complète au seuil de 50 %');

-- ---------- Activité d'avril-mai : demandes, médiane, réponses, essais ----------
-- Autant d'artisans à 4 demandes que d'autres validés, plus deux : la médiane vaut 4 quel que soit
-- le reste. M0 : 3 demandes comptées et 5 exclues (à vérifier, bloquée, directe, de plus de 30 jours,
-- annulée par le client avant d'être transmise) ; parmi les comptées, une annulée par le client au
-- bout d'un jour sans réponse, hors de la réponse sous 72 h.
select set_config('test.k', ((select count(*) from public.artisans where status = 'valide') + 2)::text, true);
insert into auth.users (id, email, is_anonymous, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
select ('c1103000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'lan110.m' || n || '@example.test', false, now(),
  '{"role":"artisan"}', '{}'
from generate_series(1, current_setting('test.k')::int) n;
insert into public.artisans (id, user_id, status, raison_sociale)
select ('c1104000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('c1103000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, 'valide', 'ACTIVITE ' || n || ' 110'
from generate_series(1, current_setting('test.k')::int) n;
insert into public.artisans (id, user_id, status, raison_sociale) values
  ('c1101000-0000-4000-8000-000000000030', 'c1100000-0000-4000-8000-000000000030', 'valide', 'ACTIVITE ZERO 110');
insert into public.projects (id, user_id, description, trade_code, ville_code_insee, ville_nom, preferred_artisan_id, created_at)
select ('c1106000-0000-4000-8000-00000000010' || n)::uuid, 'c1100000-0000-4000-8000-000000000004', 'Demande fictive 110',
  'couvreur', '06088', 'Nice',
  case when n = 6 then 'c1101000-0000-4000-8000-000000000030'::uuid end, now() - interval '40 days'
from generate_series(1, 8) n;
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, created_at, responded_at)
select ('c1106000-0000-4000-8000-00000000010' || d.p)::uuid, ('c1104000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'c1100000-0000-4000-8000-000000000004', '+33612345678', d.statut::public.request_status,
  now() - interval '20 days', now() - interval '20 days' + d.delai
from generate_series(1, current_setting('test.k')::int) n
cross join (values (1, 'acceptee', interval '1 hour'), (2, 'acceptee', interval '1 day'),
  (3, 'acceptee', interval '4 days'), (4, 'envoyee', null::interval)) as d (p, statut, delai);
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, created_at, responded_at,
  cancelled_at, cancellation_reason)
select ('c1106000-0000-4000-8000-00000000010' || d.p)::uuid, 'c1101000-0000-4000-8000-000000000030',
  'c1100000-0000-4000-8000-000000000004', '+33612345678', d.statut::public.request_status, now() - d.age,
  now() - d.age + d.delai, d.annulee, d.motif::public.client_cancel_reason
from (values
  -- Comptées : envoyée, annulée par le client (sans réponse : hors de la réponse sous 72 h),
  -- annulée après acceptation (chantier annulé).
  (1, 'envoyee', interval '20 days', null::interval, null::timestamptz, null::text),
  (2, 'annulee', interval '20 days', null, now() - interval '19 days', 'plus_besoin'),
  (3, 'annulee', interval '20 days', interval '2 hours', null, null),
  -- Exclues : à vérifier, bloquée par l'équipe, directe, de plus de 30 jours, annulée par le client
  -- avant d'être transmise (ticket de vérification au même horodatage, ci-dessous).
  (4, 'a_verifier', interval '20 days', null, null, null),
  (5, 'annulee', interval '20 days', null, now() - interval '19 days', null),
  (6, 'envoyee', interval '20 days', null, null, null),
  (7, 'envoyee', interval '40 days', null, null, null),
  (8, 'annulee', interval '20 days', null, now() - interval '19 days', 'plus_besoin')
) as d (p, statut, age, delai, annulee, motif);
insert into public.tickets (type, user_id, project_id, contact_email, subject, created_at)
values ('particulier_a_verifier', 'c1100000-0000-4000-8000-000000000004', 'c1106000-0000-4000-8000-000000000108',
  'lan110.client@example.test', 'Demande à vérifier', now() - interval '20 days');
-- Le parrain : une demande d'hier (délai de 72 h pas encore écoulé).
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, created_at)
values ('c1106000-0000-4000-8000-000000000101', 'c1101000-0000-4000-8000-000000000006',
  'c1100000-0000-4000-8000-000000000004', '+33612345678', 'envoyee', now() - interval '1 day');
-- Demandes de la semaine : W1 et son lot cette semaine, W3 la semaine précédente (directes, à un
-- artisan en brouillon : hors des autres chiffres) ; W4 à vérifier et W5 bloquée : jamais comptées ;
-- W6 transmise par l'équipe puis annulée par le client : comptée ; W7 annulée par le client avant
-- d'être transmise : jamais comptée.
insert into public.projects (id, user_id, parent_project_id, description, trade_code, ville_code_insee, ville_nom,
  preferred_artisan_id)
values
  ('c1106000-0000-4000-8000-000000000201', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', 'c1101000-0000-4000-8000-000000000025'),
  ('c1106000-0000-4000-8000-000000000202', 'c1100000-0000-4000-8000-000000000004', 'c1106000-0000-4000-8000-000000000201',
   'Semaine fictive 110', 'carreleur', '06088', 'Nice', 'c1101000-0000-4000-8000-000000000025'),
  ('c1106000-0000-4000-8000-000000000203', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', 'c1101000-0000-4000-8000-000000000025'),
  ('c1106000-0000-4000-8000-000000000204', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', null),
  ('c1106000-0000-4000-8000-000000000205', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', null),
  ('c1106000-0000-4000-8000-000000000206', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', 'c1101000-0000-4000-8000-000000000025'),
  ('c1106000-0000-4000-8000-000000000207', 'c1100000-0000-4000-8000-000000000004', null, 'Semaine fictive 110',
   'plombier', '06088', 'Nice', 'c1101000-0000-4000-8000-000000000025');
insert into public.requests (project_id, artisan_id, particulier_id, contact_phone, status, created_at, cancelled_at,
  cancellation_reason)
select ('c1106000-0000-4000-8000-00000000020' || d.p)::uuid, 'c1101000-0000-4000-8000-000000000025',
  'c1100000-0000-4000-8000-000000000004', '+33612345678', d.statut::public.request_status,
  (date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') - d.recul, d.annulee,
  d.motif::public.client_cancel_reason
from (values
  (1, 'envoyee', interval '0 days', null::timestamptz, null::text),
  (2, 'envoyee', interval '0 days', null, null),
  (3, 'envoyee', interval '1 day', null, null),
  (4, 'a_verifier', interval '0 days', null, null),
  (5, 'annulee', interval '0 days', now(), null),
  (6, 'annulee', interval '0 days', now(), 'plus_besoin'),
  (7, 'annulee', interval '0 days', now(), 'plus_besoin')
) as d (p, statut, recul, annulee, motif);
-- W6 : ticket de la veille (demande transmise depuis, à l'heure de la transmission) ; W7 : ticket au
-- même horodatage que la demande, jamais transmise.
insert into public.tickets (type, user_id, project_id, contact_email, subject, created_at)
select 'particulier_a_verifier', 'c1100000-0000-4000-8000-000000000004', d.projet, 'lan110.client@example.test',
  'Demande à vérifier', (date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') - d.recul
from (values
  ('c1106000-0000-4000-8000-000000000206'::uuid, interval '1 day'),
  ('c1106000-0000-4000-8000-000000000207'::uuid, interval '0 days')
) as d (projet, recul);
-- Essais : M0 en essai ; le premier artisan à 4 demandes, essai terminé et premier paiement reçu ;
-- le deuxième, abonné payé sans essai.
insert into public.subscriptions (artisan_id, plan_code, stripe_customer_id, stripe_subscription_id, status, trial_end,
  first_paid_at)
values
  ('c1101000-0000-4000-8000-000000000030', 'base', 'cus_lan110_0', 'sub_lan110_0', 'trialing', now() + interval '10 days', null),
  ('c1104000-0000-4000-8000-000000000001', 'base', 'cus_lan110_1', 'sub_lan110_1', 'active', now() - interval '5 days',
   now() - interval '4 days'),
  ('c1104000-0000-4000-8000-000000000002', 'base', 'cus_lan110_2', 'sub_lan110_2', 'active', null,
   now() - interval '1 day');

select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select set_config('test.activite', public.admin_launch_figures()::text, true);
reset role;

select results_eq(
  $$ select c, pg_temp.ecart('apres', 'activite', 'activity', c)::int
     from unnest(array['demandes_semaine', 'demandes_semaine_precedente', 'artisans_actifs', 'artisans_4_demandes',
       'demandes_72h', 'demandes_repondues_72h', 'artisans_devis_envoye', 'essais', 'essais_termines',
       'abonnes_apres_essai', 'abonnes']) c $$,
  format($$ values ('demandes_semaine'::text, 3), ('demandes_semaine_precedente', 1), ('artisans_actifs', %1$s + 1),
      ('artisans_4_demandes', %1$s), ('demandes_72h', 4 * %1$s + 2), ('demandes_repondues_72h', 2 * %1$s + 1),
      ('artisans_devis_envoye', 0), ('essais', 1), ('essais_termines', 1), ('abonnes_apres_essai', 1), ('abonnes', 2) $$,
    current_setting('test.k')),
  'activité : demandes de la semaine (lots compris, hors à vérifier, bloquées et annulées avant transmission), 4 demandes ou plus (hors directes, à vérifier, bloquées, anciennes et annulées avant transmission), réponse sous 72 h (hors annulées sans réponse dans le délai), essais et abonnés');
select is((pg_temp.chiffres('activite') -> 'activity' ->> 'demandes_par_artisan_mediane')::numeric, 4::numeric,
  'médiane des demandes par artisan validé (0 pour un artisan sans demande)');
select results_eq(
  $$ select c, pg_temp.ecart('apres', 'activite', 'totals', c)::int from unnest(array['en_essai', 'abonnes']) c $$,
  $$ values ('en_essai'::text, 2), ('abonnes', 2) $$,
  'totaux : essais commencés (en cours ou terminés, comme les abonnés en cumul) et abonnés');

-- ---------- Couverture métier × commune ----------
-- C1 : rayon de 10 km autour de Menton (Menton et Beausoleil, pas Nice à 22 km, que la zone élargie
-- atteindrait) ; C2 : Antibes choisie, adresse de base à Nice (jamais Nice) ; C3 : brouillon ;
-- C4 : maçon à Antibes ; C5 : Antibes choisie.
insert into public.artisans (id, user_id, status, raison_sociale, zone_mode, base_location, radius_km) values
  ('c1101000-0000-4000-8000-000000000041', 'c1100000-0000-4000-8000-000000000041', 'valide', 'COUVERTURE MENTON 110',
   'rayon', extensions.st_setsrid(extensions.st_makepoint(7.500604, 43.791521), 4326)::extensions.geography, 10),
  ('c1101000-0000-4000-8000-000000000042', 'c1100000-0000-4000-8000-000000000042', 'valide', 'COUVERTURE NICE 110',
   'communes', extensions.st_setsrid(extensions.st_makepoint(7.255313, 43.71273), 4326)::extensions.geography, null),
  ('c1101000-0000-4000-8000-000000000043', 'c1100000-0000-4000-8000-000000000043', 'brouillon', 'COUVERTURE BROUILLON 110',
   'communes', null, null),
  ('c1101000-0000-4000-8000-000000000044', 'c1100000-0000-4000-8000-000000000044', 'valide', 'MACONNERIE ANTIBES 110',
   'communes', null, null),
  ('c1101000-0000-4000-8000-000000000045', 'c1100000-0000-4000-8000-000000000045', 'valide', 'COUVERTURE ANTIBES 110',
   'communes', null, null);
insert into public.artisan_trades (artisan_id, trade_code) values
  ('c1101000-0000-4000-8000-000000000041', 'couvreur'), ('c1101000-0000-4000-8000-000000000042', 'couvreur'),
  ('c1101000-0000-4000-8000-000000000043', 'couvreur'), ('c1101000-0000-4000-8000-000000000044', 'macon'),
  ('c1101000-0000-4000-8000-000000000045', 'couvreur');
insert into public.artisan_zones (artisan_id, code_insee, nom)
select ('c1101000-0000-4000-8000-0000000000' || n)::uuid, '06004', 'Antibes' from unnest(array['42', '43', '44', '45']) n;

select pg_temp.connecter('c1100000-0000-4000-8000-000000000001', 'admin');
set local role authenticated;
select set_config('test.couverture', public.admin_launch_coverage()::text, true);
reset role;

select is((pg_temp.chiffres('couverture') ->> 'seuil')::int, 2, 'couverture : seuil des réglages');
select is(jsonb_array_length(pg_temp.chiffres('couverture') -> 'communes'),
  (select count(*)::int from public.communes where pilote), 'couverture : toutes les communes pilotes');
select is(pg_temp.chiffres('couverture') -> 'communes' -> 0,
  (select jsonb_build_object('code_insee', code_insee, 'nom', nom) from public.communes where pilote
   order by ordre, nom limit 1), 'couverture : communes dans leur ordre');
select is(jsonb_array_length(pg_temp.chiffres('couverture') -> 'trades'),
  (select count(*)::int from public.trades where active), 'couverture : tous les métiers actifs');
select results_eq(
  $$ select t, i, pg_temp.case_couverture(t, i)
     from (values ('couvreur', '06083'), ('couvreur', '06012'), ('couvreur', '06004'), ('couvreur', '06088'),
       ('macon', '06004')) as x (t, i) $$,
  $$ values ('couvreur'::text, '06083'::text, 1), ('couvreur', '06012', 1), ('couvreur', '06004', 2),
            ('couvreur', '06088', 0), ('macon', '06004', 1) $$,
  'couverture : rayon jusqu''au centre de la commune, communes choisies, validés seulement, jamais la zone élargie');
select is_empty(
  $$ select 1 from jsonb_array_elements(pg_temp.chiffres('couverture') -> 'cells') c where (c ->> 'n')::int <= 0 $$,
  'couverture : cases vides absentes');

-- ---------- Jauge de « Mon profil » (mêmes cas que profileStrength) ----------
insert into public.artisans (id, user_id, status, raison_sociale, sirene_active, decennale_non_soumis, presentation) values
  ('c1101000-0000-4000-8000-000000000051', 'c1100000-0000-4000-8000-000000000051', 'valide', 'FICHE COMPLETE 110',
   true, true, repeat('x', 420)),
  ('c1101000-0000-4000-8000-000000000052', 'c1100000-0000-4000-8000-000000000052', 'valide', 'FICHE VIDE 110',
   null, false, null);
select pg_temp.deposer('c1101000-0000-4000-8000-000000000051', array['rc_pro', 'urssaf']);
update public.profiles set avatar_path = 'c1100000-0000-4000-8000-000000000051/avatar.jpg'
where user_id = 'c1100000-0000-4000-8000-000000000051';
select pg_temp.photos('c1101000-0000-4000-8000-000000000051', 6);
insert into public.artisan_trades (artisan_id, trade_code) values ('c1101000-0000-4000-8000-000000000051', 'carreleur');
insert into public.artisan_work_types (artisan_id, work_type_code)
select 'c1101000-0000-4000-8000-000000000051', w.code from public.work_types w
where w.trade_code = 'carreleur' and w.active order by w.sort_order limit 3;
insert into public.certifications (artisan_id, type, numero, date_fin)
values ('c1101000-0000-4000-8000-000000000051', 'qualibat', 'Q-110', current_date + 300);

select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 100, 'fiche complète : 100 %');
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000052'), 0, 'fiche vide : 0 %');
select pg_temp.photos('c1101000-0000-4000-8000-000000000051', 1);
update public.artisans set presentation = repeat('é', 150) where id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 79,
  'réalisations et présentation au prorata (1 photo, 150 caractères), arrondi à l''inférieur');
select pg_temp.photos('c1101000-0000-4000-8000-000000000051', 6);
update public.artisans set presentation = repeat('x', 299) where id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 99,
  'presque complète : jamais 100 % tant qu''il manque quelque chose');
update public.artisans set presentation = E' \n\t' || repeat('x', 299) || E'\u00A0 '
where id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 99,
  'espaces de début et de fin retirés, comme trim()');
update public.artisans set presentation = repeat('x', 298) || E'\U0001F600' where id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 100,
  'longueur comptée comme en JavaScript (émoji : deux caractères)');
select pg_temp.photos('c1101000-0000-4000-8000-000000000051', 12);
update public.artisans set presentation = repeat('x', 2000) where id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 100, 'au-delà des seuils, rien de plus');
delete from public.certifications where artisan_id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 90, 'sans certification : 90 %');
insert into public.artisan_rge_qualifications (artisan_id, organisme, code_qualification, nom_qualification, domaine,
  date_fin)
values ('c1101000-0000-4000-8000-000000000051', 'Qualibat', 'Q110', 'Qualification fictive 110', 'Isolation fictive',
  current_date + 100);
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 100,
  'domaine RGE encore valide : compte comme une certification');
update public.artisan_rge_qualifications set date_fin = current_date - 1
where artisan_id = 'c1101000-0000-4000-8000-000000000051';
select is(app.artisan_profile_strength('c1101000-0000-4000-8000-000000000051'), 90, 'domaine RGE expiré : ne compte plus');
select is(app.artisan_profile_strength('c1109999-0000-4000-8000-000000000000'), null, 'artisan inconnu : aucune jauge');

select * from finish();
rollback;
