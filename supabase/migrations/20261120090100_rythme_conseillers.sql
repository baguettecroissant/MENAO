-- Rythme des conseillers (F-184, lot 78, ADR 0381) : objectif commun d'artisans validés à une date
-- (500 au 31 mars), objectif de chaque conseiller par semaine, suivi semaine par semaine.
-- - Réglages dans launch_settings (une seule ligne, lecture admin seulement) : l'objectif commun et
--   ses dates sont le début et la fin du recrutement de l'onglet Chiffres, plus le rythme, le
--   démarrage, le repère de visites par jour et les trois cases du suivi. Dépôt public : aucun
--   objectif réel ici (null par défaut), l'équipe le saisit dans le back-office.
-- - Objectif propre à un conseiller (temps partiel…) sur sa fiche ; démarrage compté depuis la
--   création de sa fiche (heure de Paris).
-- - Indépendants : les objectifs portent sur des artisans validés (première validation, même règle
--   que les chiffres : app.launch_artisans), jamais sur des horaires ni des visites.
-- - Lecture : « Mes résultats » du conseiller (commercial_pace : sa semaine, ses 8 dernières, le
--   total de l'équipe, le classement si l'équipe l'a choisi, en prénom et initiale) ; onglet Rythme
--   du back-office (admin_commercial_pace). Écritures par les fonctions seulement, journalisées.
-- - E-mail du lundi (8 h, heure de Paris) à chaque conseiller actif : sa semaine passée et
--   l'objectif de la nouvelle ; une seule fois par semaine.

-- ---------------------------------------------------------------------------------------------
-- Réglages et objectif propre
-- ---------------------------------------------------------------------------------------------
alter table public.launch_settings
  add column objectif_valides integer check (objectif_valides between 1 and 100000),
  add column rythme_semaine integer not null default 7 check (rythme_semaine between 1 and 100),
  add column rythme_demarrage integer not null default 3 check (rythme_demarrage between 0 and 100),
  add column semaines_demarrage integer not null default 2 check (semaines_demarrage between 0 and 12),
  add column repere_visites_jour integer not null default 8 check (repere_visites_jour between 1 and 50),
  add column email_lundi boolean not null default true,
  add column classement_visible boolean not null default true,
  add column alerte_retard boolean not null default true,
  -- Lundi de la dernière semaine dont l'e-mail est parti (jamais deux fois la même semaine).
  add column email_lundi_envoye date;

alter table public.commercials
  -- Objectif propre par semaine (temps partiel…) ; null : le rythme commun.
  add column rythme_semaine integer check (rythme_semaine between 1 and 100),
  add column rythme_raison text check (char_length(rythme_raison) <= 80);

-- ---------------------------------------------------------------------------------------------
-- Règles communes
-- ---------------------------------------------------------------------------------------------
-- Objectif d'une semaine (son lundi) pour un conseiller arrivé le p_debut : rien avant sa semaine
-- d'arrivée ; pendant les premières semaines, le démarrage (ou son objectif propre s'il est plus
-- bas) ; ensuite son objectif propre, sinon le rythme commun. Même règle que paceObjective
-- (@menao/core).
create function app.pace_objective(p_debut date, p_rythme integer, p_semaine date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_debut is null or p_semaine < date_trunc('week', p_debut)::date then null
    when p_semaine < date_trunc('week', p_debut)::date + 7 * s.semaines_demarrage
      then least(s.rythme_demarrage, coalesce(p_rythme, s.rythme_semaine))
    else coalesce(p_rythme, s.rythme_semaine)
  end
  from public.launch_settings s
$$;
revoke execute on function app.pace_objective(date, integer, date) from public, anon, authenticated;

-- Prénom et initiale (« Sarah Kaci » → « Sarah K. ») : seul nom montré aux autres conseillers.
create function app.short_person_name(p_nom text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when position(' ' in v.nom) = 0 then v.nom
    else split_part(v.nom, ' ', 1) || ' ' || upper(left(split_part(v.nom, ' ', 2), 1)) || '.'
  end
  from (select regexp_replace(btrim(coalesce(p_nom, '')), '\s+', ' ', 'g') as nom) v
$$;
revoke execute on function app.short_person_name(text) from public, anon, authenticated;

-- Jour d'arrivée d'un conseiller : création de sa fiche, heure de Paris.
create function app.commercial_start(p_created_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (p_created_at at time zone 'Europe/Paris')::date
$$;
revoke execute on function app.commercial_start(timestamptz) from public, anon, authenticated;

-- Validés par conseiller et par semaine (lundi, heure de Paris), première validation.
create function app.pace_validations()
returns table (commercial_id uuid, semaine date, valides bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.commercial_id, date_trunc('week', l.valide_le at time zone 'Europe/Paris')::date, count(*)
  from app.launch_artisans() l
  where l.valide_le is not null and l.commercial_id is not null
  group by 1, 2
$$;
revoke execute on function app.pace_validations() from public, anon, authenticated;

-- Les 8 semaines d'un conseiller qui finissent à la semaine p_semaine : validés et objectif.
create function app.pace_weeks(p_commercial uuid, p_semaine date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'semaine', w.semaine,
      'valides', coalesce(v.valides, 0),
      'objectif', app.pace_objective(app.commercial_start(c.created_at), c.rythme_semaine, w.semaine)
    ) order by w.semaine), '[]'::jsonb)
  from public.commercials c
  cross join lateral (
    select (p_semaine - 7 * g)::date as semaine from generate_series(0, 7) as g
  ) w
  left join app.pace_validations() v on v.commercial_id = c.id and v.semaine = w.semaine
  where c.id = p_commercial
$$;
revoke execute on function app.pace_weeks(uuid, date) from public, anon, authenticated;

-- Réglages lus par le conseiller et par le back-office.
create function app.pace_settings_json(s public.launch_settings)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'objectif_valides', s.objectif_valides,
    'debut', s.debut_recrutement,
    'fin', s.fin_recrutement,
    'rythme_semaine', s.rythme_semaine,
    'rythme_demarrage', s.rythme_demarrage,
    'semaines_demarrage', s.semaines_demarrage,
    'repere_visites_jour', s.repere_visites_jour,
    'classement_visible', s.classement_visible
  )
$$;
revoke execute on function app.pace_settings_json(public.launch_settings) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- « Mes résultats » du conseiller
-- ---------------------------------------------------------------------------------------------
-- Forme : {today, settings, me: {debut, rythme_semaine, weeks (8), en_verification}, equipe:
-- {valides}, classement: null | [{nom, moi, valides, semaines}]}. Classement : conseillers actifs
-- ayant au moins une semaine terminée parmi les 4 dernières ; validés sur ces semaines.
create function public.commercial_pace()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_week date := date_trunc('week', v_today)::date;
  v_settings public.launch_settings;
  v_commercial public.commercials;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  select * into v_settings from public.launch_settings;
  select * into v_commercial from public.commercials where id = v_me;
  return jsonb_build_object(
    'today', v_today,
    'settings', app.pace_settings_json(v_settings),
    'me', jsonb_build_object(
      'debut', app.commercial_start(v_commercial.created_at),
      'rythme_semaine', v_commercial.rythme_semaine,
      'weeks', app.pace_weeks(v_me, v_week),
      'en_verification', (
        select count(*) from public.commercial_attributions ca
        join public.artisans a on a.id = ca.artisan_id
        where ca.commercial_id = v_me and a.status = 'en_verification'
      )
    ),
    'equipe', jsonb_build_object(
      'valides', (select count(*) from app.launch_artisans() l where l.valide_le is not null)
    ),
    'classement', case when v_settings.classement_visible then (
      select coalesce(jsonb_agg(jsonb_build_object(
          'nom', app.short_person_name(r.nom), 'moi', r.id = v_me,
          'valides', r.valides, 'semaines', r.semaines
        ) order by r.nom), '[]'::jsonb)
      from (
        select c.id, c.nom,
          count(distinct w.semaine) as semaines,
          coalesce(sum(v.valides), 0) as valides
        from public.commercials c
        cross join lateral (
          select (v_week - 7 * g)::date as semaine from generate_series(1, 4) as g
        ) w
        left join app.pace_validations() v on v.commercial_id = c.id and v.semaine = w.semaine
        where c.status = 'actif'
          and w.semaine >= date_trunc('week', app.commercial_start(c.created_at))::date
        group by c.id, c.nom
      ) r
    ) end
  );
end;
$$;
revoke execute on function public.commercial_pace() from public, anon;
grant execute on function public.commercial_pace() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Onglet Rythme du back-office
-- ---------------------------------------------------------------------------------------------
-- Forme : {today, settings (+ email_lundi, alerte_retard), conseillers: [{id, nom, zone, debut,
-- rythme_semaine, rythme_raison, weeks (8), dernier_valide}]}, conseillers actifs par nom. Le
-- total, les semaines et les canaux de l'équipe viennent de admin_launch_figures.
create function public.admin_commercial_pace()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_week date := date_trunc('week', v_today)::date;
  v_settings public.launch_settings;
begin
  perform app.require_admin();
  select * into v_settings from public.launch_settings;
  return jsonb_build_object(
    'today', v_today,
    'settings', app.pace_settings_json(v_settings) || jsonb_build_object(
      'email_lundi', v_settings.email_lundi,
      'alerte_retard', v_settings.alerte_retard
    ),
    'conseillers', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', c.id,
          'nom', c.nom,
          'zone', to_jsonb(c.zone_codes_postaux),
          'debut', app.commercial_start(c.created_at),
          'rythme_semaine', c.rythme_semaine,
          'rythme_raison', c.rythme_raison,
          'weeks', app.pace_weeks(c.id, v_week),
          'dernier_valide', (
            select max(l.valide_le) from app.launch_artisans() l where l.commercial_id = c.id
          )
        ) order by c.nom), '[]'::jsonb)
      from public.commercials c
      where c.status = 'actif'
    )
  );
end;
$$;
revoke execute on function public.admin_commercial_pace() from public, anon;
grant execute on function public.admin_commercial_pace() to authenticated;

-- Réglages du rythme, remplacés en entier (objectif vide : aucun ; dates : début et fin du
-- recrutement, partagées avec l'onglet Chiffres). Journalisé.
create function public.admin_save_pace_settings(
  p_rythme_semaine integer,
  p_rythme_demarrage integer,
  p_semaines_demarrage integer,
  p_repere_visites_jour integer,
  p_email_lundi boolean,
  p_classement_visible boolean,
  p_alerte_retard boolean,
  p_objectif_valides integer default null,
  p_debut_recrutement date default null,
  p_fin_recrutement date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_objectif_valides is not null and p_objectif_valides not between 1 and 100000 then
    raise exception 'Objectif : entre 1 et 100 000 artisans validés.' using errcode = '22023';
  end if;
  if p_debut_recrutement not between date '2020-01-01' and date '2040-12-31'
     or p_fin_recrutement not between date '2020-01-01' and date '2040-12-31' then
    raise exception 'Indiquez des dates entre 2020 et 2040.' using errcode = '22023';
  end if;
  if p_debut_recrutement > p_fin_recrutement then
    raise exception 'Le départ du décompte doit précéder la date de l''objectif.' using errcode = '22023';
  end if;
  if coalesce(p_rythme_semaine, 0) not between 1 and 100
     or coalesce(p_rythme_demarrage, -1) not between 0 and 100
     or coalesce(p_semaines_demarrage, -1) not between 0 and 12
     or coalesce(p_repere_visites_jour, 0) not between 1 and 50 then
    raise exception 'Rythme : des nombres entiers dans les limites indiquées.' using errcode = '22023';
  end if;
  update public.launch_settings set
    objectif_valides = p_objectif_valides,
    debut_recrutement = p_debut_recrutement,
    fin_recrutement = p_fin_recrutement,
    rythme_semaine = p_rythme_semaine,
    rythme_demarrage = p_rythme_demarrage,
    semaines_demarrage = p_semaines_demarrage,
    repere_visites_jour = p_repere_visites_jour,
    email_lundi = coalesce(p_email_lundi, false),
    classement_visible = coalesce(p_classement_visible, false),
    alerte_retard = coalesce(p_alerte_retard, false),
    updated_by = (select auth.uid())
  where id;
  perform app.audit('lancement.rythme', 'lancement', null, jsonb_build_object(
    'objectif_valides', p_objectif_valides, 'debut_recrutement', p_debut_recrutement,
    'fin_recrutement', p_fin_recrutement, 'rythme_semaine', p_rythme_semaine,
    'rythme_demarrage', p_rythme_demarrage, 'semaines_demarrage', p_semaines_demarrage,
    'repere_visites_jour', p_repere_visites_jour, 'email_lundi', coalesce(p_email_lundi, false),
    'classement_visible', coalesce(p_classement_visible, false),
    'alerte_retard', coalesce(p_alerte_retard, false)));
end;
$$;
revoke execute on function public.admin_save_pace_settings(integer, integer, integer, integer,
  boolean, boolean, boolean, integer, date, date) from public, anon;
grant execute on function public.admin_save_pace_settings(integer, integer, integer, integer,
  boolean, boolean, boolean, integer, date, date) to authenticated;

-- Objectif propre d'un conseiller (null : il reprend le rythme commun) et sa raison. Journalisé.
create function public.admin_set_commercial_pace(
  p_commercial uuid,
  p_rythme_semaine integer default null,
  p_rythme_raison text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raison text := nullif(btrim(coalesce(p_rythme_raison, '')), '');
begin
  perform app.require_admin();
  if p_rythme_semaine is not null and p_rythme_semaine not between 1 and 100 then
    raise exception 'Objectif : entre 1 et 100 artisans par semaine.' using errcode = '22023';
  end if;
  if char_length(v_raison) > 80 then
    raise exception 'Raison : 80 caractères au plus.' using errcode = '22023';
  end if;
  update public.commercials set
    rythme_semaine = p_rythme_semaine,
    rythme_raison = case when p_rythme_semaine is null then null else v_raison end
  where id = p_commercial;
  if not found then
    raise exception 'Conseiller introuvable.' using errcode = 'P0002';
  end if;
  perform app.audit('commercial.rythme', 'commercial', p_commercial, jsonb_build_object(
    'rythme_semaine', p_rythme_semaine,
    'rythme_raison', case when p_rythme_semaine is null then null else v_raison end));
end;
$$;
revoke execute on function public.admin_set_commercial_pace(uuid, integer, text) from public, anon;
grant execute on function public.admin_set_commercial_pace(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- E-mail du lundi
-- ---------------------------------------------------------------------------------------------
-- Un rappel, comme les relances : le conseiller peut le couper dans ses préférences d'e-mail
-- (mêmes règles que OPTIONAL_NOTIFICATIONS, @menao/core).
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'recommandation_partenaire' then 'activite'
    when 'avis_reponse' then 'activite'
    when 'filleul_valide' then 'activite'
    when 'synthese_mois' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    when 'parrainage_suggestion' then 'rappels'
    when 'devis_relance' then 'rappels'
    when 'demarrage_rappel' then 'rappels'
    when 'activation_relance' then 'rappels'
    when 'finalisation_relance' then 'rappels'
    when 'conseiller_semaine' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Le lundi à partir de 8 h (heure de Paris), une fois par semaine : à chaque conseiller actif avec
-- un compte, arrivé avant cette semaine, sa semaine passée (validés, objectif) et l'objectif de la
-- nouvelle, avec le total de l'équipe et l'objectif commun. p_now : pour les tests.
create function app.send_pace_weekly(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_local timestamp := p_now at time zone 'Europe/Paris';
  v_week date := date_trunc('week', v_local)::date;
  v_settings public.launch_settings;
  v_team bigint;
  v_sent integer := 0;
  v_row record;
begin
  select * into v_settings from public.launch_settings for update;
  if not v_settings.email_lundi
     or extract(isodow from v_local) <> 1 or extract(hour from v_local) < 8
     or v_settings.email_lundi_envoye >= v_week then
    return 0;
  end if;
  update public.launch_settings set email_lundi_envoye = v_week where id;
  select count(*) into v_team from app.launch_artisans() l where l.valide_le is not null;
  for v_row in
    select c.id, c.user_id, c.rythme_semaine, app.commercial_start(c.created_at) as debut
    from public.commercials c
    where c.status = 'actif' and c.user_id is not null
      and date_trunc('week', app.commercial_start(c.created_at))::date < v_week
  loop
    perform app.notify(v_row.user_id, 'conseiller_semaine', jsonb_build_object(
      'semaine', v_week - 7,
      'valides', coalesce((select v.valides from app.pace_validations() v
        where v.commercial_id = v_row.id and v.semaine = v_week - 7), 0),
      'objectif', app.pace_objective(v_row.debut, v_row.rythme_semaine, v_week - 7),
      'nouvel_objectif', app.pace_objective(v_row.debut, v_row.rythme_semaine, v_week),
      'equipe', v_team,
      'cible', v_settings.objectif_valides,
      'date_cible', v_settings.fin_recrutement
    ));
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$$;
revoke execute on function app.send_pace_weekly(timestamptz) from public, anon, authenticated;

select cron.schedule('menao-semaine-conseillers', '5 * * * 1', 'select app.send_pace_weekly()');
