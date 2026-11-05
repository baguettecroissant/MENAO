-- Copilote du commercial (F-74, ADR 0223) : fiche de préparation d'une visite, premier message et
-- compte rendu dicté, rédigés par l'IA (Edge Function commercial-copilot) pour les prospects que le
-- commercial suit.
-- - Les fiches sont gardées pour être relues sans nouvel appel ; les comptes rendus validés par le
--   commercial forment l'historique du suivi. Les deux disparaissent avec le suivi (« Ne plus
--   suivre », « Ne plus contacter », purge des suivis inactifs).
-- - Lecture : le commercial qui suit le prospect, ou un admin. Aucune écriture directe : tout passe
--   par les fonctions, qui vérifient le suivi.
-- - Les messages ne sont pas gardés : le commercial les envoie lui-même, depuis son téléphone.

-- Le journal ai_runs accepte les métriques du copilote (jamais le texte).
alter table public.ai_runs drop constraint ai_runs_function_name_check;
alter table public.ai_runs add constraint ai_runs_function_name_check
  check (function_name in (
    'analyze-need', 'transcribe', 'quote-from-voice', 'read-document', 'suggest-need',
    'describe-photo', 'read-expense', 'pro-assistant', 'client-assistant', 'commercial-copilot'
  ));

-- Fiche de préparation : la dernière seulement, par suivi.
create table public.prospect_briefs (
  prospect_id uuid primary key references public.prospect_follows (prospect_id) on delete cascade,
  content jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 16384),
  created_at timestamptz not null default now()
);

-- Comptes rendus de visite ou d'appel, validés par le commercial.
create table public.prospect_reports (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospect_follows (prospect_id) on delete cascade,
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  summary text not null check (char_length(summary) between 1 and 600),
  interest text not null check (interest in ('chaud', 'tiede', 'froid')),
  objections text[] not null default '{}' check (cardinality(objections) <= 3),
  next_action_label text check (char_length(next_action_label) <= 120),
  created_at timestamptz not null default now()
);

create index prospect_reports_prospect_idx on public.prospect_reports (prospect_id, created_at desc);
create index prospect_reports_commercial_idx on public.prospect_reports (commercial_id, created_at desc);

alter table public.prospect_briefs enable row level security;
alter table public.prospect_reports enable row level security;
revoke all on public.prospect_briefs, public.prospect_reports from anon, authenticated;
grant select on public.prospect_briefs, public.prospect_reports to authenticated;

create policy "prospect_briefs : lecture par le commercial qui suit ou un admin"
  on public.prospect_briefs for select to authenticated
  using (
    exists (
      select 1 from public.prospect_follows f
      where f.prospect_id = prospect_briefs.prospect_id
        and f.commercial_id = (select app.my_commercial_id())
    )
    or (select app.is_admin())
  );

create policy "prospect_reports : lecture par le commercial qui suit ou un admin"
  on public.prospect_reports for select to authenticated
  using (
    exists (
      select 1 from public.prospect_follows f
      where f.prospect_id = prospect_reports.prospect_id
        and f.commercial_id = (select app.my_commercial_id())
    )
    or (select app.is_admin())
  );

-- Commercial actif qui suit ce prospect, sinon une erreur rédigée pour l'écran.
create function app.require_my_prospect(p_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.prospect_follows f where f.prospect_id = p_id and f.commercial_id = v_me
  ) then
    raise exception 'Suivez d''abord ce prospect.' using errcode = '22023';
  end if;
  return v_me;
end;
$$;
revoke execute on function app.require_my_prospect(uuid) from public, anon, authenticated;

-- Contexte envoyé à l'IA : données publiques de l'entreprise (registre), mon suivi (étape, notes,
-- 3 derniers comptes rendus) et mon prénom. Ni téléphone, ni adresse, ni SIRET.
create function public.commercial_copilot_context(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result json;
begin
  perform app.require_my_prospect(p_id);
  select json_build_object(
    'nom', coalesce(p.enseigne, p.denomination),
    'ape_code', p.ape_code,
    'nature_juridique', p.nature_juridique,
    'date_creation', p.date_creation,
    'tranche_effectif', p.tranche_effectif,
    'commune', p.commune,
    'code_postal', p.code_postal,
    'rge', p.rge,
    'est_siege', p.est_siege,
    'statut', f.status,
    'etape', app.prospect_stage(p.siren),
    'notes', f.notes,
    'comptes_rendus', (
      select coalesce(json_agg(json_build_object(
        'date', r.created_at, 'resume', r.summary, 'interet', r.interest, 'objections', r.objections
      ) order by r.created_at desc), '[]'::json)
      from (
        select r.created_at, r.summary, r.interest, r.objections
        from public.prospect_reports r
        where r.prospect_id = p.id
        order by r.created_at desc
        limit 3
      ) r
    ),
    'prenom', coalesce(
      (select nullif(btrim(pr.first_name), '') from public.profiles pr where pr.user_id = (select auth.uid())),
      split_part(btrim(c.nom), ' ', 1)
    )
  ) into v_result
  from public.prospects p
  join public.prospect_follows f on f.prospect_id = p.id
  join public.commercials c on c.id = f.commercial_id
  where p.id = p_id;
  return v_result;
end;
$$;
revoke execute on function public.commercial_copilot_context(uuid) from public, anon;
grant execute on function public.commercial_copilot_context(uuid) to authenticated;

-- Demande de la zone d'un prospect (comme l'ADR 0182) : recherches de ses métiers probables ces
-- derniers jours, à moins du rayon de son établissement, sinon dans sa commune. Un nombre
-- seulement, jamais une recherche ni un particulier.
create function public.commercial_prospect_demand(
  p_id uuid,
  p_trade_codes text[],
  p_radius_km int default 20,
  p_days int default 30
)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform app.require_my_prospect(p_id);
  if coalesce(cardinality(p_trade_codes), 0) = 0 then
    return 0;
  end if;
  if cardinality(p_trade_codes) > 5 or p_radius_km not between 1 and 50 or p_days not between 1 and 90 then
    raise exception 'Paramètres invalides.' using errcode = '22023';
  end if;
  select count(*)::int into v_count
  from public.prospects p
  join public.projects pr
    on pr.created_at >= now() - make_interval(days => p_days)
    and pr.trade_code = any (p_trade_codes)
    and (
      (p.location is not null and extensions.st_dwithin(
        coalesce(pr.location, pr.ville_location), p.location, p_radius_km * 1000
      ))
      or (p.location is null and p.code_insee is not null and pr.ville_code_insee = p.code_insee)
    )
  where p.id = p_id;
  return v_count;
end;
$$;
revoke execute on function public.commercial_prospect_demand(uuid, text[], int, int) from public, anon;
grant execute on function public.commercial_prospect_demand(uuid, text[], int, int) to authenticated;

-- Enregistrer la fiche de préparation (remplace la précédente). Renvoie sa date.
create function public.commercial_save_brief(p_id uuid, p_content jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz;
begin
  perform app.require_my_prospect(p_id);
  if jsonb_typeof(p_content) is distinct from 'object' or pg_column_size(p_content) > 16384 then
    raise exception 'Fiche invalide.' using errcode = '22023';
  end if;
  insert into public.prospect_briefs (prospect_id, content)
  values (p_id, p_content)
  on conflict (prospect_id) do update set content = excluded.content, created_at = now()
  returning created_at into v_at;
  return v_at;
end;
$$;
revoke execute on function public.commercial_save_brief(uuid, jsonb) from public, anon;
grant execute on function public.commercial_save_brief(uuid, jsonb) to authenticated;

-- Enregistrer un compte rendu validé : il s'ajoute à l'historique, et l'étape et la prochaine action
-- du suivi sont mises à jour (téléphone et notes inchangés). Renvoie l'identifiant du compte rendu.
create function public.commercial_add_report(
  p_id uuid,
  p_summary text,
  p_interest text,
  p_objections text[],
  p_status public.prospect_status,
  p_next_action_at timestamptz default null,
  p_next_action_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.require_my_prospect(p_id);
  v_summary text := nullif(btrim(replace(coalesce(p_summary, ''), E'\r\n', E'\n')), '');
  v_label text := nullif(btrim(coalesce(p_next_action_label, '')), '');
  v_objections text[];
  v_id uuid;
begin
  if v_summary is null then
    raise exception 'Le compte rendu est vide.' using errcode = '22023';
  end if;
  if char_length(v_summary) > 600 then
    raise exception 'Compte rendu trop long : 600 caractères au plus.' using errcode = '22023';
  end if;
  if p_interest is null or p_interest not in ('chaud', 'tiede', 'froid') then
    raise exception 'Intérêt invalide.' using errcode = '22023';
  end if;
  if p_status is null then
    raise exception 'Étape invalide.' using errcode = '22023';
  end if;
  if char_length(v_label) > 120 then
    raise exception 'Prochaine action trop longue : 120 caractères au plus.' using errcode = '22023';
  end if;
  select coalesce(array_agg(o.v order by o.ord), '{}')
  into v_objections
  from (
    select btrim(x.v) as v, x.ord
    from unnest(coalesce(p_objections, '{}')) with ordinality as x (v, ord)
    where btrim(coalesce(x.v, '')) <> ''
  ) o;
  if cardinality(v_objections) > 3 or exists (select 1 from unnest(v_objections) v where char_length(v) > 120) then
    raise exception 'Objections : 3 au plus, de 120 caractères chacune.' using errcode = '22023';
  end if;

  insert into public.prospect_reports (prospect_id, commercial_id, summary, interest, objections, next_action_label)
  values (p_id, v_me, v_summary, p_interest, v_objections, case when p_next_action_at is null then null else v_label end)
  returning id into v_id;
  update public.prospect_follows f set
    status = p_status,
    next_action_at = p_next_action_at
  where f.prospect_id = p_id and f.commercial_id = v_me;
  return v_id;
end;
$$;
revoke execute on function public.commercial_add_report(uuid, text, text, text[], public.prospect_status, timestamptz, text)
  from public, anon;
grant execute on function public.commercial_add_report(uuid, text, text, text[], public.prospect_status, timestamptz, text)
  to authenticated;
