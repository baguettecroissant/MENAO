-- F-57 et contrôle (lot 5b, ADR 0052) : listes de métiers, travaux et pièces modifiables par les
-- admins (ajout, libellé, ordre, activation ; ni suppression ni changement de code, car les codes
-- sont repris par les artisans, les demandes et l'IA), journal d'audit consultable et suivi des
-- appels à l'IA. Réservé aux admins en session aal2 (app.is_admin) ; chaque modification d'une
-- liste est inscrite au journal d'audit.

-- ---------------------------------------------------------------------------
-- Listes de référence : metier (trades), travail (work_types, rattachés à un métier), piece (rooms).
-- ---------------------------------------------------------------------------
create function app.reference_table(p_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_kind when 'metier' then 'trades' when 'travail' then 'work_types' when 'piece' then 'rooms' end
$$;
revoke execute on function app.reference_table(text) from public, anon, authenticated;

-- Les trois listes complètes (entrées désactivées comprises), avec leur usage.
create function public.admin_references()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'metiers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', t.code, 'label', t.label, 'active', t.active,
        'artisans', (select count(*) from public.artisan_trades x where x.trade_code = t.code),
        'demandes', (select count(*) from public.projects p where p.trade_code = t.code)
      ) order by t.sort_order, t.label), '[]'::jsonb)
      from public.trades t
    ),
    'travaux', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', w.code, 'label', w.label, 'active', w.active, 'metier', w.trade_code,
        'artisans', (select count(*) from public.artisan_work_types x where x.work_type_code = w.code),
        'demandes', (select count(*) from public.projects p where w.code = any (p.work_type_codes))
      ) order by w.sort_order, w.label), '[]'::jsonb)
      from public.work_types w
    ),
    'pieces', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', r.code, 'label', r.label, 'active', r.active,
        'demandes', (select count(*) from public.projects p where r.code = any (p.room_codes))
      ) order by r.sort_order, r.label), '[]'::jsonb)
      from public.rooms r
    )
  );
end;
$$;

-- Ajout en fin de liste. Le code vient du libellé (packages/core, referenceCode) et ne change plus.
create function public.admin_add_reference(
  p_kind text,
  p_code text,
  p_label text,
  p_trade_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text := app.reference_table(p_kind);
  v_label text := btrim(coalesce(p_label, ''));
  v_id uuid;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_table is null then
    raise exception 'Liste inconnue.' using errcode = '22023';
  end if;
  if char_length(v_label) not between 1 and 100 then
    raise exception 'Libellé invalide.' using errcode = '22023';
  end if;
  if v_table = 'work_types' then
    if not exists (select 1 from public.trades t where t.code = p_trade_code) then
      raise exception 'Métier introuvable.' using errcode = '22023';
    end if;
    insert into public.work_types (code, trade_code, label, sort_order)
    values (p_code, p_trade_code, v_label, coalesce(
      (select max(w.sort_order) from public.work_types w where w.trade_code = p_trade_code), 0) + 10)
    returning id into v_id;
  else
    execute format(
      'insert into public.%I (code, label, sort_order)
       values ($1, $2, coalesce((select max(sort_order) from public.%I), 0) + 10) returning id',
      v_table, v_table)
    into v_id using p_code, v_label;
  end if;
  perform app.audit('referentiel.ajoute', p_kind, v_id, jsonb_strip_nulls(jsonb_build_object(
    'code', p_code, 'libelle', v_label, 'metier', p_trade_code
  )));
end;
$$;

create function public.admin_rename_reference(p_kind text, p_code text, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text := app.reference_table(p_kind);
  v_label text := btrim(coalesce(p_label, ''));
  v_id uuid;
  v_before text;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_table is null then
    raise exception 'Liste inconnue.' using errcode = '22023';
  end if;
  if char_length(v_label) not between 1 and 100 then
    raise exception 'Libellé invalide.' using errcode = '22023';
  end if;
  execute format('select id, label from public.%I where code = $1 for update', v_table)
    into v_id, v_before using p_code;
  if v_id is null then
    raise exception 'Entrée introuvable.' using errcode = '22023';
  end if;
  if v_before = v_label then
    return;
  end if;
  execute format('update public.%I set label = $1 where id = $2', v_table) using v_label, v_id;
  perform app.audit('referentiel.renomme', p_kind, v_id, jsonb_build_object(
    'code', p_code, 'libelle', v_label, 'avant', v_before
  ));
end;
$$;

-- Une entrée désactivée disparaît des choix proposés (inscription, recherche, IA) ; les données qui
-- la citent restent intactes.
create function public.admin_set_reference_active(p_kind text, p_code text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text := app.reference_table(p_kind);
  v_id uuid;
  v_label text;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_table is null or p_active is null then
    raise exception 'Liste inconnue.' using errcode = '22023';
  end if;
  execute format(
    'update public.%I set active = $1 where code = $2 and active is distinct from $1 returning id, label',
    v_table)
  into v_id, v_label using p_active, p_code;
  if v_id is not null then
    perform app.audit(case when p_active then 'referentiel.active' else 'referentiel.desactive' end,
      p_kind, v_id, jsonb_build_object('code', p_code, 'libelle', v_label));
  end if;
end;
$$;

-- Monter ou descendre une entrée : la liste est renumérotée (10, 20, 30…) dans l'ordre affiché,
-- puis l'entrée échange sa place avec sa voisine (au sein de son métier pour un travail).
create function public.admin_move_reference(p_kind text, p_code text, p_up boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_table text := app.reference_table(p_kind);
  v_group text := case when app.reference_table(p_kind) = 'work_types' then 'trade_code' else 'null::text' end;
  v_id uuid;
  v_order smallint;
  v_trade text;
  v_label text;
  v_other uuid;
  v_other_order smallint;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  if v_table is null or p_up is null then
    raise exception 'Liste inconnue.' using errcode = '22023';
  end if;
  execute format(
    'with rangs as (
       select id, (row_number() over (partition by %s order by sort_order, label) * 10)::smallint as rang
       from public.%I
     )
     update public.%I t set sort_order = r.rang from rangs r where r.id = t.id and t.sort_order <> r.rang',
    v_group, v_table, v_table);
  execute format('select id, sort_order, %s, label from public.%I where code = $1', v_group, v_table)
    into v_id, v_order, v_trade, v_label using p_code;
  if v_id is null then
    raise exception 'Entrée introuvable.' using errcode = '22023';
  end if;
  execute format(
    'select id, sort_order from public.%I
     where %s is not distinct from $1 and sort_order %s $2
     order by sort_order %s limit 1',
    v_table, v_group, case when p_up then '<' else '>' end, case when p_up then 'desc' else 'asc' end)
    into v_other, v_other_order using v_trade, v_order;
  if v_other is null then
    return; -- déjà en tête ou en fin de liste
  end if;
  execute format('update public.%I set sort_order = case when id = $1 then $2 else $3 end where id in ($1, $4)',
    v_table) using v_id, v_other_order, v_order, v_other;
  perform app.audit('referentiel.deplace', p_kind, v_id, jsonb_build_object(
    'code', p_code, 'libelle', v_label, 'sens', case when p_up then 'haut' else 'bas' end
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- Journal d'audit (spec §13) : qui, quoi, quand et sur quoi, avec la fiche à ouvrir.
--   Catégories : artisans (dossiers, documents, certifications, fiches), comptes, moderation
--   (avis et messages), litiges, listes (métiers, travaux, pièces) ; automatique : sans auteur.
-- ---------------------------------------------------------------------------
create function app.admin_audit_rows()
returns table (
  log_id uuid, created_at timestamptz, action text, categorie text, actor_id uuid, acteur text,
  target_type text, cible text, lien_type text, lien_id uuid, data jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.created_at, l.action,
    case
      when l.action like 'referentiel.%' then 'listes'
      when l.action like 'compte.%' then 'comptes'
      when l.action like 'avis.%' or l.action like 'message.%' then 'moderation'
      when l.action like 'litige.%' then 'litiges'
      else 'artisans'
    end,
    l.actor_id, nullif(btrim(concat_ws(' ', pa.first_name, pa.last_name)), ''),
    l.target_type,
    case
      when a.id is not null then coalesce(a.nom_commercial, a.raison_sociale)
      when t.id is not null then coalesce(t.subject, ch_t.title)
      when ch.id is not null then ch.title
      when l.target_type = 'compte' then
        coalesce(nullif(btrim(concat_ws(' ', pc.first_name, pc.last_name)), ''), uc.email::text)
      when l.target_type in ('metier', 'travail', 'piece') then l.data ->> 'libelle'
    end,
    case
      when a.id is not null then 'artisan'
      when t.id is not null then 'ticket'
      when ch.id is not null then 'chantier'
      when l.target_type = 'compte' and uc.id is not null then 'personne'
      when l.target_type in ('metier', 'travail', 'piece') then 'listes'
    end,
    coalesce(a.id, t.id, ch.id, uc.id),
    l.data
  from public.audit_logs l
  left join public.profiles pa on pa.user_id = l.actor_id
  -- Fiche artisan visée : directement, ou par son document, sa certification ou un avis reçu.
  left join public.artisans a on a.id = case l.target_type
      when 'artisan' then l.target_id
      when 'artisan_document' then coalesce(
        (select d.artisan_id from public.artisan_documents d where d.id = l.target_id),
        case when l.data ->> 'artisan_id' ~ '^[0-9a-f-]{36}$' then (l.data ->> 'artisan_id')::uuid end)
      when 'certification' then (select c.artisan_id from public.certifications c where c.id = l.target_id)
      when 'review' then (select r.artisan_id from public.reviews r where r.id = l.target_id)
    end
  left join public.tickets t on l.target_type = 'ticket' and t.id = l.target_id
  left join public.chantiers ch_t on ch_t.id = t.chantier_id
  left join public.messages m on l.target_type = 'message' and m.id = l.target_id
  left join public.chantiers ch on ch.id = m.chantier_id
  left join public.profiles pc on l.target_type = 'compte' and pc.user_id = l.target_id
  left join auth.users uc on l.target_type = 'compte' and uc.id = l.target_id
$$;
revoke execute on function app.admin_audit_rows() from public, anon, authenticated;

create function public.admin_audit_log(
  p_filter text default 'tous',
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  log_id uuid, created_at timestamptz, action text, categorie text, acteur text,
  automatique boolean, target_type text, cible text, lien_type text, lien_id uuid, data jsonb,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return query
  select r.log_id, r.created_at, r.action, r.categorie, r.acteur, r.actor_id is null, r.target_type,
    r.cible, r.lien_type, r.lien_id, r.data, count(*) over ()
  from app.admin_audit_rows() r
  where (
      coalesce(p_filter, 'tous') = 'tous'
      or (p_filter = 'automatique' and r.actor_id is null)
      or r.categorie = p_filter
    )
    and (
      v_like is null
      or r.acteur ilike v_like or r.cible ilike v_like or r.action ilike v_like
      or r.data::text ilike v_like
    )
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- Nombre d'entrées par catégorie, pour les pastilles du journal (même recherche).
create function public.admin_audit_counts(p_query text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_like text := app.admin_like(p_query);
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'tous', count(*),
      'artisans', count(*) filter (where r.categorie = 'artisans'),
      'comptes', count(*) filter (where r.categorie = 'comptes'),
      'moderation', count(*) filter (where r.categorie = 'moderation'),
      'litiges', count(*) filter (where r.categorie = 'litiges'),
      'listes', count(*) filter (where r.categorie = 'listes'),
      'automatique', count(*) filter (where r.actor_id is null)
    )
    from app.admin_audit_rows() r
    where v_like is null
      or r.acteur ilike v_like or r.cible ilike v_like or r.action ilike v_like
      or r.data::text ilike v_like
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Suivi de l'IA (ai_runs, sans donnée personnelle) : appels par fonction et par modèle, résultats,
-- latence, jetons et audio sur la période ; appels par jour ; derniers échecs.
-- ---------------------------------------------------------------------------
create function public.admin_ai_summary(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
  v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 90));
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'jours', v_days,
    'fonctions', (
      select coalesce(jsonb_agg(to_jsonb(f) order by f.fonction), '[]'::jsonb)
      from (
        select r.function_name as fonction,
          count(*) as appels,
          count(*) filter (where r.outcome = 'ok') as ok,
          count(*) filter (where r.outcome = 'peu_sur') as peu_sur,
          count(*) filter (where r.outcome = 'invalide') as invalide,
          count(*) filter (where r.outcome = 'refus') as refus,
          count(*) filter (where r.outcome = 'erreur') as erreur,
          round(percentile_cont(0.5) within group (order by r.latency_ms))::integer as latence_mediane,
          round(percentile_cont(0.95) within group (order by r.latency_ms))::integer as latence_p95,
          coalesce(sum(r.input_tokens), 0) as jetons_entree,
          coalesce(sum(r.output_tokens), 0) as jetons_sortie,
          round(coalesce(sum(r.audio_seconds), 0))::integer as secondes_audio
        from public.ai_runs r
        where r.created_at >= v_since
        group by r.function_name
      ) f
    ),
    'modeles', (
      select coalesce(jsonb_agg(to_jsonb(m) order by m.fonction, m.appels desc), '[]'::jsonb)
      from (
        select r.function_name as fonction, r.model as modele,
          count(*) as appels,
          count(*) filter (where r.outcome in ('invalide', 'refus', 'erreur')) as echecs,
          round(percentile_cont(0.5) within group (order by r.latency_ms))::integer as latence_mediane
        from public.ai_runs r
        where r.created_at >= v_since
        group by r.function_name, r.model
      ) m
    ),
    -- Appels par jour (heure de Paris), jours sans appel compris.
    'par_jour', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'jour', d.jour, 'appels', coalesce(c.appels, 0), 'echecs', coalesce(c.echecs, 0)
      ) order by d.jour), '[]'::jsonb)
      from (
        select (now() at time zone 'Europe/Paris')::date - g.n as jour
        from generate_series(0, v_days - 1) as g (n)
      ) d
      left join (
        select (r.created_at at time zone 'Europe/Paris')::date as jour, count(*) as appels,
          count(*) filter (where r.outcome in ('invalide', 'refus', 'erreur')) as echecs
        from public.ai_runs r
        where r.created_at >= v_since
        group by 1
      ) c on c.jour = d.jour
    ),
    -- Derniers échecs, quelle que soit la période : la demande concernée s'ouvre depuis le suivi.
    'echecs_recents', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.cree_le desc), '[]'::jsonb)
      from (
        select r.created_at as cree_le, r.function_name as fonction, r.model as modele,
          r.outcome as resultat, r.latency_ms as latence, r.project_id
        from public.ai_runs r
        where r.outcome in ('invalide', 'refus', 'erreur')
        order by r.created_at desc
        limit 20
      ) e
    )
  );
end;
$$;

revoke execute on function public.admin_references() from public, anon;
revoke execute on function public.admin_add_reference(text, text, text, text) from public, anon;
revoke execute on function public.admin_rename_reference(text, text, text) from public, anon;
revoke execute on function public.admin_set_reference_active(text, text, boolean) from public, anon;
revoke execute on function public.admin_move_reference(text, text, boolean) from public, anon;
revoke execute on function public.admin_audit_log(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_audit_counts(text) from public, anon;
revoke execute on function public.admin_ai_summary(integer) from public, anon;
grant execute on function public.admin_references() to authenticated;
grant execute on function public.admin_add_reference(text, text, text, text) to authenticated;
grant execute on function public.admin_rename_reference(text, text, text) to authenticated;
grant execute on function public.admin_set_reference_active(text, text, boolean) to authenticated;
grant execute on function public.admin_move_reference(text, text, boolean) to authenticated;
grant execute on function public.admin_audit_log(text, text, integer, integer) to authenticated;
grant execute on function public.admin_audit_counts(text) to authenticated;
grant execute on function public.admin_ai_summary(integer) to authenticated;
