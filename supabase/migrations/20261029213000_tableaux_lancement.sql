-- Tableaux de lancement, lot 1 (F-66, ADR 0208) : équipe de lancement (associés, commerciaux,
-- personne qui valide les dossiers) et planning daté de chaque membre.
-- - Le back-office voit tout (admins, double authentification). Un membre relié à son compte
--   (commercial actif, ou admin en double authentification) ne voit que ses tâches et celles
--   partagées avec toute l'équipe (jalons communs, rendez-vous réguliers).
-- - Dépôt public : aucun contenu réel ici ni dans le seed. Les vraies tâches sont importées en base
--   par un admin (admin_import_launch_plan) depuis un fichier gardé hors du dépôt ; un réimport met
--   le planning à jour sans perdre ce qui a déjà été fait.
-- - L'objectif d'artisans validés d'un membre est interne (chiffres en direct au lot 2) : jamais
--   renvoyé par my_launch_plan, et la table des membres n'est lisible que par les admins (le
--   membre lit son nom et sa mission par my_launch_plan).
-- - Écritures par les fonctions seulement ; celles du back-office sont journalisées (statut changé
--   par un admin compris).
-- - Dates entre 2020 et 2040 : une année mal tapée (0027, 2207) est refusée au lieu d'étirer le
--   planning sur des siècles.

create type public.launch_member_kind as enum ('associe', 'commercial', 'validation', 'autre');
create type public.launch_phase as enum ('preparation', 'pre_ouverture', 'lancement', 'essais', 'apres');
create type public.launch_task_status as enum ('a_faire', 'en_cours', 'fait');

-- ---------------------------------------------------------------------------
-- Membres de l'équipe de lancement
-- ---------------------------------------------------------------------------
create table public.launch_members (
  id uuid primary key default gen_random_uuid(),
  -- Repère stable du fichier d'import (mise à jour au réimport) ; null pour un membre créé à la main.
  ref text unique check (ref ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  -- Compte relié (admin ou commercial) : le membre voit alors son planning. Sans compte, le planning
  -- est tenu par les admins.
  user_id uuid unique references auth.users (id) on delete set null,
  nom text not null check (char_length(btrim(nom)) between 1 and 80),
  mission text check (char_length(mission) <= 300),
  kind public.launch_member_kind not null default 'autre',
  -- Objectif interne d'artisans validés ; null : aucun.
  objectif_valides integer check (objectif_valides between 1 and 10000),
  ordre integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger launch_members_set_updated_at before update on public.launch_members
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tâches et jalons
--   member_id null : tâche ou jalon de toute l'équipe ;
--   jalon : date clé (compte à rebours) ;
--   partage : visible par tous les membres (sinon : les admins et le membre responsable) ;
--   recurrence : rendez-vous régulier (« Chaque lundi à 9 h »), hors progression.
-- ---------------------------------------------------------------------------
create table public.launch_tasks (
  id uuid primary key default gen_random_uuid(),
  -- Repère stable du fichier d'import ; null pour une tâche créée ou copiée à la main.
  ref text unique check (ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$'),
  member_id uuid references public.launch_members (id) on delete set null,
  titre text not null check (char_length(btrim(titre)) between 1 and 140),
  detail text check (char_length(detail) <= 1000),
  phase public.launch_phase not null default 'preparation',
  categorie text not null default 'pilotage' check (categorie in (
    'digital', 'terrain', 'reseaux', 'contenus', 'presse', 'ambassadeurs', 'produit', 'juridique',
    'pilotage', 'equipe', 'validation', 'evenement'
  )),
  debut date check (debut between date '2020-01-01' and date '2040-12-31'),
  echeance date check (echeance between date '2020-01-01' and date '2040-12-31'),
  recurrence text check (char_length(btrim(recurrence)) between 1 and 80),
  jalon boolean not null default false,
  partage boolean not null default false,
  statut public.launch_task_status not null default 'a_faire',
  fait_le timestamptz,
  fait_par uuid references auth.users (id) on delete set null,
  ordre integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (echeance is not null or recurrence is not null),
  check (debut is null or echeance is null or debut <= echeance),
  check ((statut = 'fait') = (fait_le is not null))
);

create index launch_tasks_member_idx on public.launch_tasks (member_id, echeance);
create index launch_tasks_fait_par_idx on public.launch_tasks (fait_par);
create index launch_tasks_created_by_idx on public.launch_tasks (created_by);

create trigger launch_tasks_set_updated_at before update on public.launch_tasks
  for each row execute function app.set_updated_at();

-- Membre actif relié au compte connecté, sinon null : seulement pour un commercial actif (jamais
-- suspendu) ou un admin en double authentification.
create function app.my_launch_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.launch_members m
  where m.user_id = (select auth.uid())
    and m.active
    and (
      (app.jwt_role()::text = 'commercial' and app.my_commercial_id() is not null)
      or (app.jwt_role()::text = 'admin' and app.is_admin())
    )
$$;
revoke execute on function app.my_launch_member_id() from public, anon;
grant execute on function app.my_launch_member_id() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS : membres lus par les admins seulement (objectif interne) ; tâches lues par les admins, par
-- le membre (ses tâches) et par toute l'équipe (tâches partagées) ; aucune écriture directe.
-- Tâches lisibles colonne par colonne : ni l'auteur du « fait » ou de la tâche (comptes d'un
-- collègue ou d'un admin), ni le repère du fichier d'import.
-- ---------------------------------------------------------------------------
alter table public.launch_members enable row level security;
alter table public.launch_tasks enable row level security;
revoke all on public.launch_members, public.launch_tasks from anon, authenticated;
grant select on public.launch_members to authenticated;
grant select (id, member_id, titre, detail, phase, categorie, debut, echeance, recurrence, jalon, partage,
  statut, fait_le, ordre, created_at, updated_at) on public.launch_tasks to authenticated;

create policy "launch_members : lecture par un admin"
  on public.launch_members for select to authenticated
  using ((select app.is_admin()));

create policy "launch_tasks : lecture par un admin, le membre ou l'équipe"
  on public.launch_tasks for select to authenticated
  using (
    (select app.is_admin())
    or member_id = (select app.my_launch_member_id())
    or (partage and (select app.my_launch_member_id()) is not null)
  );

-- ---------------------------------------------------------------------------
-- Espace du membre (« Mon planning »)
-- ---------------------------------------------------------------------------
-- Mon planning : mes tâches (own) et les tâches partagées avec toute l'équipe, de l'échéance la
-- plus proche à la plus lointaine (rendez-vous réguliers à la fin). Hors de l'équipe :
-- {"member": null, "tasks": []}. Jamais l'objectif ni le compte relié.
create function public.my_launch_plan()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_launch_member_id();
  v_result jsonb;
begin
  if v_me is null then
    return jsonb_build_object('member', null, 'tasks', '[]'::jsonb);
  end if;
  select jsonb_build_object(
    'member', jsonb_build_object('id', m.id, 'nom', m.nom, 'mission', m.mission, 'kind', m.kind),
    'tasks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'titre', t.titre,
        'detail', t.detail,
        'phase', t.phase,
        'categorie', t.categorie,
        'debut', t.debut,
        'echeance', t.echeance,
        'recurrence', t.recurrence,
        'jalon', t.jalon,
        'partage', t.partage,
        'statut', t.statut,
        'fait_le', t.fait_le,
        'own', coalesce(t.member_id = v_me, false)
      ) order by t.echeance asc nulls last, t.ordre, t.titre, t.id), '[]'::jsonb)
      from public.launch_tasks t
      where t.member_id = v_me or t.partage
    )
  ) into v_result
  from public.launch_members m
  where m.id = v_me;
  return v_result;
end;
$$;
revoke execute on function public.my_launch_plan() from public, anon;
grant execute on function public.my_launch_plan() to authenticated;

-- Cocher une tâche : un admin, toutes ; un membre, seulement les siennes (jamais une tâche de
-- toute l'équipe ni celle d'un autre membre, même partagée). « Fait » : date et auteur gardés si
-- la tâche l'était déjà ; tout autre statut les efface. Changement fait par un admin : journalisé
-- (celui d'un membre garde seulement l'auteur et la date du « fait »).
create function public.launch_set_task_status(p_task uuid, p_statut public.launch_task_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_statut is null then
    raise exception 'Statut inconnu.' using errcode = '22023';
  end if;
  update public.launch_tasks t set
    statut = p_statut,
    fait_le = case when p_statut <> 'fait' then null when t.statut = 'fait' then t.fait_le else now() end,
    fait_par = case when p_statut <> 'fait' then null when t.statut = 'fait' then t.fait_par
      else (select auth.uid()) end
  where t.id = p_task
    and (app.is_admin() or t.member_id = app.my_launch_member_id());
  if not found then
    raise exception 'Tâche introuvable.' using errcode = '22023';
  end if;
  if app.is_admin() then
    perform app.audit('lancement.statut', 'lancement_tache', p_task, jsonb_build_object('statut', p_statut));
  end if;
end;
$$;
revoke execute on function public.launch_set_task_status(uuid, public.launch_task_status) from public, anon;
grant execute on function public.launch_set_task_status(uuid, public.launch_task_status) to authenticated;

-- ---------------------------------------------------------------------------
-- Back-office (admins, journalisé)
-- ---------------------------------------------------------------------------
-- Comptes qu'on peut relier à un membre : admins et commerciaux, avec le membre déjà relié.
-- Nom : celui de la fiche du commercial, sinon le nom du profil, sinon l'adresse e-mail.
create function public.admin_launch_accounts()
returns table (
  user_id uuid,
  nom text,
  email text,
  role text,
  member_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select u.id,
    coalesce(c.nom, nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), u.email::text),
    u.email::text,
    u.raw_app_meta_data ->> 'role',
    m.id
  from auth.users u
  left join public.commercials c on c.user_id = u.id
  left join public.profiles p on p.user_id = u.id
  left join public.launch_members m on m.user_id = u.id
  where u.raw_app_meta_data ->> 'role' in ('admin', 'commercial')
  order by 2, u.id;
end;
$$;
revoke execute on function public.admin_launch_accounts() from public, anon;
grant execute on function public.admin_launch_accounts() to authenticated;

-- Membre : création (p_id absent) ou remplacement complet ; ordre absent : inchangé (0 à la
-- création). Compte relié : celui d'un admin ou d'un commercial, jamais déjà dans l'équipe ; un
-- membre « commercial » se relie au compte d'un commercial, et le compte d'un commercial à un
-- membre « commercial ».
create function public.admin_save_launch_member(
  p_nom text,
  p_kind public.launch_member_kind,
  p_id uuid default null,
  p_mission text default null,
  p_user_id uuid default null,
  p_objectif_valides integer default null,
  p_ordre integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom text := btrim(coalesce(p_nom, ''));
  v_mission text := nullif(btrim(coalesce(p_mission, '')), '');
  v_role text;
  v_id uuid;
begin
  perform app.require_admin();
  if char_length(v_nom) not between 1 and 80 then
    raise exception 'Indiquez le nom (80 caractères au plus).' using errcode = '22023';
  end if;
  if char_length(v_mission) > 300 then
    raise exception 'Mission trop longue : 300 caractères au plus.' using errcode = '22023';
  end if;
  if p_kind is null then
    raise exception 'Choisissez le type de membre.' using errcode = '22023';
  end if;
  if p_objectif_valides not between 1 and 10000 then
    raise exception 'Objectif : entre 1 et 10 000 artisans validés, ou vide.' using errcode = '22023';
  end if;
  if p_user_id is not null then
    select u.raw_app_meta_data ->> 'role' into v_role from auth.users u where u.id = p_user_id;
    if v_role is null or v_role not in ('admin', 'commercial') then
      raise exception 'Seul le compte d''un admin ou d''un commercial peut être relié.' using errcode = '22023';
    end if;
    if p_kind = 'commercial' and v_role <> 'commercial' then
      raise exception 'Un membre « commercial » se relie au compte d''un commercial.' using errcode = '22023';
    end if;
    if p_kind <> 'commercial' and v_role = 'commercial' then
      raise exception 'Le compte d''un commercial se relie à un membre « commercial ».' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.launch_members m where m.user_id = p_user_id and m.id is distinct from p_id
    ) then
      raise exception 'Ce compte est déjà dans l''équipe.' using errcode = '22023';
    end if;
  end if;

  if p_id is null then
    insert into public.launch_members (nom, mission, kind, user_id, objectif_valides, ordre)
    values (v_nom, v_mission, p_kind, p_user_id, p_objectif_valides, coalesce(p_ordre, 0))
    returning id into v_id;
  else
    update public.launch_members m set
      nom = v_nom,
      mission = v_mission,
      kind = p_kind,
      user_id = p_user_id,
      objectif_valides = p_objectif_valides,
      ordre = coalesce(p_ordre, m.ordre)
    where m.id = p_id
    returning m.id into v_id;
    if v_id is null then
      raise exception 'Membre introuvable.' using errcode = '22023';
    end if;
  end if;
  perform app.audit('lancement.membre_enregistre', 'lancement_membre', v_id, jsonb_build_object(
    'creation', p_id is null, 'kind', p_kind, 'user_id', p_user_id));
  return v_id;
end;
$$;
revoke execute on function public.admin_save_launch_member(text, public.launch_member_kind, uuid, text, uuid, integer, integer)
  from public, anon;
grant execute on function public.admin_save_launch_member(text, public.launch_member_kind, uuid, text, uuid, integer, integer)
  to authenticated;

-- Retrait d'un membre : ses tâches restent, pour toute l'équipe (member_id null).
create function public.admin_delete_launch_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tasks int;
begin
  perform app.require_admin();
  select count(*)::int into v_tasks from public.launch_tasks t where t.member_id = p_id;
  delete from public.launch_members m where m.id = p_id;
  if not found then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;
  perform app.audit('lancement.membre_supprime', 'lancement_membre', p_id, jsonb_build_object('taches', v_tasks));
end;
$$;
revoke execute on function public.admin_delete_launch_member(uuid) from public, anon;
grant execute on function public.admin_delete_launch_member(uuid) to authenticated;

-- Tâche : création (p_id absent) ou remplacement complet (repère d'import et ordre inchangés).
-- « Fait » : date et auteur gardés si la tâche l'était déjà, sinon posés ; tout autre statut les
-- efface. Valeurs absentes (null) : celles par défaut.
create function public.admin_save_launch_task(
  p_titre text,
  p_id uuid default null,
  p_member_id uuid default null,
  p_detail text default null,
  p_phase public.launch_phase default 'preparation',
  p_categorie text default 'pilotage',
  p_debut date default null,
  p_echeance date default null,
  p_recurrence text default null,
  p_jalon boolean default false,
  p_partage boolean default false,
  p_statut public.launch_task_status default 'a_faire'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titre text := btrim(coalesce(p_titre, ''));
  v_detail text := nullif(btrim(coalesce(p_detail, '')), '');
  v_recurrence text := nullif(btrim(coalesce(p_recurrence, '')), '');
  v_categorie text := coalesce(nullif(btrim(p_categorie), ''), 'pilotage');
  v_statut public.launch_task_status := coalesce(p_statut, 'a_faire');
  v_id uuid;
begin
  perform app.require_admin();
  if char_length(v_titre) not between 1 and 140 then
    raise exception 'Indiquez le titre (140 caractères au plus).' using errcode = '22023';
  end if;
  if char_length(v_detail) > 1000 then
    raise exception 'Détail trop long : 1 000 caractères au plus.' using errcode = '22023';
  end if;
  if char_length(v_recurrence) > 80 then
    raise exception 'Fréquence trop longue : 80 caractères au plus.' using errcode = '22023';
  end if;
  if v_categorie not in ('digital', 'terrain', 'reseaux', 'contenus', 'presse', 'ambassadeurs', 'produit',
      'juridique', 'pilotage', 'equipe', 'validation', 'evenement') then
    raise exception 'Catégorie inconnue.' using errcode = '22023';
  end if;
  if p_echeance is null and v_recurrence is null then
    raise exception 'Indiquez une échéance ou une fréquence.' using errcode = '22023';
  end if;
  if p_debut not between date '2020-01-01' and date '2040-12-31'
     or p_echeance not between date '2020-01-01' and date '2040-12-31' then
    raise exception 'Indiquez des dates entre 2020 et 2040.' using errcode = '22023';
  end if;
  if p_debut > p_echeance then
    raise exception 'Le début doit précéder l''échéance.' using errcode = '22023';
  end if;
  if p_member_id is not null and not exists (select 1 from public.launch_members m where m.id = p_member_id) then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.launch_tasks (member_id, titre, detail, phase, categorie, debut, echeance, recurrence,
      jalon, partage, statut, fait_le, fait_par, created_by)
    values (p_member_id, v_titre, v_detail, coalesce(p_phase, 'preparation'), v_categorie, p_debut, p_echeance,
      v_recurrence, coalesce(p_jalon, false), coalesce(p_partage, false), v_statut,
      case when v_statut = 'fait' then now() end,
      case when v_statut = 'fait' then (select auth.uid()) end,
      (select auth.uid()))
    returning id into v_id;
  else
    update public.launch_tasks t set
      member_id = p_member_id,
      titre = v_titre,
      detail = v_detail,
      phase = coalesce(p_phase, 'preparation'),
      categorie = v_categorie,
      debut = p_debut,
      echeance = p_echeance,
      recurrence = v_recurrence,
      jalon = coalesce(p_jalon, false),
      partage = coalesce(p_partage, false),
      statut = v_statut,
      fait_le = case when v_statut <> 'fait' then null when t.statut = 'fait' then t.fait_le else now() end,
      fait_par = case when v_statut <> 'fait' then null when t.statut = 'fait' then t.fait_par
        else (select auth.uid()) end
    where t.id = p_id
    returning t.id into v_id;
    if v_id is null then
      raise exception 'Tâche introuvable.' using errcode = '22023';
    end if;
  end if;
  perform app.audit('lancement.tache_enregistree', 'lancement_tache', v_id, jsonb_build_object(
    'creation', p_id is null, 'member_id', p_member_id, 'statut', v_statut));
  return v_id;
end;
$$;
revoke execute on function public.admin_save_launch_task(text, uuid, uuid, text, public.launch_phase, text, date, date,
  text, boolean, boolean, public.launch_task_status) from public, anon;
grant execute on function public.admin_save_launch_task(text, uuid, uuid, text, public.launch_phase, text, date, date,
  text, boolean, boolean, public.launch_task_status) to authenticated;

create function public.admin_delete_launch_task(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  delete from public.launch_tasks t where t.id = p_id;
  if not found then
    raise exception 'Tâche introuvable.' using errcode = '22023';
  end if;
  perform app.audit('lancement.tache_supprimee', 'lancement_tache', p_id, '{}'::jsonb);
end;
$$;
revoke execute on function public.admin_delete_launch_task(uuid) from public, anon;
grant execute on function public.admin_delete_launch_task(uuid) to authenticated;

-- Copie du planning d'un membre vers un autre (nouvel arrivant) : ses tâches à lui, à faire, sans
-- repère d'import ; jamais ses tâches partagées, que toute l'équipe voit déjà (sinon : doublons
-- dans le planning de chacun). Retourne le nombre de tâches copiées.
create function public.admin_copy_launch_tasks(p_from uuid, p_to uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform app.require_admin();
  if not exists (select 1 from public.launch_members m where m.id = p_from)
     or not exists (select 1 from public.launch_members m where m.id = p_to) then
    raise exception 'Membre introuvable.' using errcode = '22023';
  end if;
  if p_from = p_to then
    raise exception 'Choisissez un autre membre.' using errcode = '22023';
  end if;
  insert into public.launch_tasks (member_id, titre, detail, phase, categorie, debut, echeance, recurrence,
    jalon, partage, ordre, created_by)
  select p_to, t.titre, t.detail, t.phase, t.categorie, t.debut, t.echeance, t.recurrence,
    t.jalon, t.partage, t.ordre, (select auth.uid())
  from public.launch_tasks t
  where t.member_id = p_from and not t.partage
  order by t.echeance nulls last, t.ordre, t.titre, t.id;
  get diagnostics v_count = row_count;
  perform app.audit('lancement.taches_copiees', 'lancement_membre', p_to,
    jsonb_build_object('depuis', p_from, 'nombre', v_count));
  return v_count;
end;
$$;
revoke execute on function public.admin_copy_launch_tasks(uuid, uuid) from public, anon;
grant execute on function public.admin_copy_launch_tasks(uuid, uuid) to authenticated;

-- Import du planning (fichier gardé hors du dépôt), format :
--   {"version": 1,
--    "members": [{"ref", "nom", "mission", "kind", "ordre", "objectif_valides"}],
--    "tasks": [{"ref", "member" (repère du membre ou null), "titre", "detail", "phase", "categorie",
--               "debut", "echeance", "recurrence", "jalon", "partage"}]}
-- 50 membres et 2 000 tâches au plus. Mise à jour par repère (ref) ; sans repère, toujours une
-- création.
-- - Membre déjà importé : seuls la mission, le type, l'ordre et l'objectif changent (le nom et le
--   compte relié ont pu être modifiés dans le back-office) ; type et ordre absents : inchangés ;
--   type qui ne va plus avec le compte relié : inchangé.
-- - Tâche déjà importée : tout change sauf le statut, la date et l'auteur du « fait ».
-- - Membre inconnu : tâche de toute l'équipe.
-- - Ligne invalide (valeur illisible ou contrôle de la table, dont une date hors de 2020-2040) :
--   ignorée et comptée dans skipped, sans faire échouer l'import.
create function public.admin_import_launch_plan(p_plan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_members jsonb;
  v_tasks jsonb;
  v_row jsonb;
  v_ref text;
  v_id uuid;
  v_member uuid;
  v_kind public.launch_member_kind;
  v_members_created int := 0;
  v_members_updated int := 0;
  v_tasks_created int := 0;
  v_tasks_updated int := 0;
  v_skipped int := 0;
  v_result jsonb;
begin
  perform app.require_admin();
  if jsonb_typeof(p_plan) is distinct from 'object' or (p_plan -> 'version') is distinct from '1'::jsonb then
    raise exception 'Fichier non reconnu : version 1 attendue.' using errcode = '22023';
  end if;
  v_members := coalesce(p_plan -> 'members', '[]'::jsonb);
  v_tasks := coalesce(p_plan -> 'tasks', '[]'::jsonb);
  if jsonb_typeof(v_members) <> 'array' or jsonb_typeof(v_tasks) <> 'array' then
    raise exception 'Fichier non reconnu : listes des membres et des tâches attendues.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_members) > 50 then
    raise exception 'Trop de membres : 50 au plus.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_tasks) > 2000 then
    raise exception 'Trop de tâches : 2 000 au plus.' using errcode = '22023';
  end if;

  -- Membres d'abord : les tâches s'y rattachent par leur repère.
  for v_row in select x.e from jsonb_array_elements(v_members) as x (e) loop
    begin
      v_ref := nullif(btrim(v_row ->> 'ref'), '');
      v_kind := (v_row ->> 'kind')::public.launch_member_kind;
      v_id := null;
      if v_ref is not null then
        select m.id into v_id from public.launch_members m where m.ref = v_ref;
      end if;
      if v_id is null then
        insert into public.launch_members (ref, nom, mission, kind, ordre, objectif_valides)
        values (v_ref, btrim(v_row ->> 'nom'), nullif(btrim(v_row ->> 'mission'), ''), coalesce(v_kind, 'autre'),
          coalesce((v_row ->> 'ordre')::int, 0), (v_row ->> 'objectif_valides')::int);
        v_members_created := v_members_created + 1;
      else
        update public.launch_members m set
          mission = nullif(btrim(v_row ->> 'mission'), ''),
          kind = case
            when v_kind is null then m.kind
            when m.user_id is null then v_kind
            when (v_kind = 'commercial') = exists (
              select 1 from auth.users u where u.id = m.user_id and u.raw_app_meta_data ->> 'role' = 'commercial'
            ) then v_kind
            else m.kind
          end,
          ordre = coalesce((v_row ->> 'ordre')::int, m.ordre),
          objectif_valides = (v_row ->> 'objectif_valides')::int
        where m.id = v_id;
        v_members_updated := v_members_updated + 1;
      end if;
    exception when data_exception or integrity_constraint_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;

  for v_row in select x.e from jsonb_array_elements(v_tasks) as x (e) loop
    begin
      -- Dates au format AAAA-MM-JJ seulement (jamais « today » ni « tomorrow »).
      if (v_row ->> 'debut') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or (v_row ->> 'echeance') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'Date invalide.' using errcode = '22023';
      end if;
      v_ref := nullif(btrim(v_row ->> 'ref'), '');
      v_member := null;
      if nullif(btrim(v_row ->> 'member'), '') is not null then
        select m.id into v_member from public.launch_members m where m.ref = btrim(v_row ->> 'member');
      end if;
      v_id := null;
      if v_ref is not null then
        select t.id into v_id from public.launch_tasks t where t.ref = v_ref;
      end if;
      if v_id is null then
        insert into public.launch_tasks (ref, member_id, titre, detail, phase, categorie, debut, echeance,
          recurrence, jalon, partage, created_by)
        values (v_ref, v_member, btrim(v_row ->> 'titre'), nullif(btrim(v_row ->> 'detail'), ''),
          coalesce((v_row ->> 'phase')::public.launch_phase, 'preparation'),
          coalesce(nullif(btrim(v_row ->> 'categorie'), ''), 'pilotage'),
          (v_row ->> 'debut')::date, (v_row ->> 'echeance')::date, nullif(btrim(v_row ->> 'recurrence'), ''),
          coalesce((v_row ->> 'jalon')::boolean, false), coalesce((v_row ->> 'partage')::boolean, false),
          (select auth.uid()));
        v_tasks_created := v_tasks_created + 1;
      else
        update public.launch_tasks t set
          member_id = v_member,
          titre = btrim(v_row ->> 'titre'),
          detail = nullif(btrim(v_row ->> 'detail'), ''),
          phase = coalesce((v_row ->> 'phase')::public.launch_phase, 'preparation'),
          categorie = coalesce(nullif(btrim(v_row ->> 'categorie'), ''), 'pilotage'),
          debut = (v_row ->> 'debut')::date,
          echeance = (v_row ->> 'echeance')::date,
          recurrence = nullif(btrim(v_row ->> 'recurrence'), ''),
          jalon = coalesce((v_row ->> 'jalon')::boolean, false),
          partage = coalesce((v_row ->> 'partage')::boolean, false)
        where t.id = v_id;
        v_tasks_updated := v_tasks_updated + 1;
      end if;
    exception when data_exception or integrity_constraint_violation then
      v_skipped := v_skipped + 1;
    end;
  end loop;

  v_result := jsonb_build_object(
    'members_created', v_members_created,
    'members_updated', v_members_updated,
    'tasks_created', v_tasks_created,
    'tasks_updated', v_tasks_updated,
    'skipped', v_skipped);
  perform app.audit('lancement.import', 'lancement', null, v_result);
  return v_result;
end;
$$;
revoke execute on function public.admin_import_launch_plan(jsonb) from public, anon;
grant execute on function public.admin_import_launch_plan(jsonb) to authenticated;
