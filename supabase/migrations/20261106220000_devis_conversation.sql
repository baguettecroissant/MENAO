-- Devis dicté en conversation avec Camille, lot 4 des agents IA (F-85, ADR 0234).
--
-- Depuis l'éditeur de devis, l'artisan Premium ou Entreprise appelle Camille (appel web). Elle
-- connaît le chantier (demande du client, métier, commune, régime de TVA) et ses prix habituels
-- (lignes de ses anciens devis), pose les questions qui manquent et propose des lignes. Les lignes
-- arrivent dans l'éditeur pendant l'appel et sont gardées ici en brouillon, pour être reprises si
-- l'appel coupe ou si la page se ferme. Rien n'est jamais envoyé au client : l'artisan relit,
-- enregistre et envoie lui-même. Droit `plans.limites.agents.devis_conversation` (ADR 0231),
-- minutes comptées par voice_record_usage (agent « devis »).

-- ---------------------------------------------------------------------------
-- Brouillons proposés par Camille
-- ---------------------------------------------------------------------------
create table public.voice_quote_drafts (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  call_id text not null check (char_length(call_id) between 1 and 100),
  -- Lignes au format de l'éditeur (type, designation, description, quantityMilli, unit,
  -- unitPriceHtCents, vatRateBp), déjà contrôlées par normalizeVoiceLines (@menao/core) ; la
  -- base les contrôle encore à l'enregistrement du devis (artisan_save_quote_draft).
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 50),
  -- Reprises dans le devis enregistré, ou écartées par l'artisan.
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, call_id)
);
create index voice_quote_drafts_open_idx on public.voice_quote_drafts (chantier_id, updated_at desc)
  where settled_at is null;
alter table public.voice_quote_drafts enable row level security;
-- Aucune écriture directe : Camille écrit par voice_quote_save_draft, l'artisan clôt par
-- settle_voice_quote_drafts.
revoke all on public.voice_quote_drafts from anon, authenticated;
grant select on public.voice_quote_drafts to authenticated;
create policy "voice_quote_drafts : lecture par l'artisan"
  on public.voice_quote_drafts for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- L'artisan a repris les lignes dans son devis enregistré, ou les écarte.
create function public.settle_voice_quote_drafts(p_chantier_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.voice_quote_drafts set settled_at = now(), updated_at = now()
  where chantier_id = p_chantier_id and artisan_id = app.my_artisan_id() and settled_at is null
$$;
revoke execute on function public.settle_voice_quote_drafts(uuid) from public, anon;
grant execute on function public.settle_voice_quote_drafts(uuid) to authenticated;

-- Purge : brouillons de plus de 90 jours.
create function app.purge_voice_quote_drafts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.voice_quote_drafts where updated_at < now() - interval '90 days' returning 1)
  select count(*)::int from d
$$;
revoke execute on function app.purge_voice_quote_drafts() from public, anon, authenticated;
select cron.schedule('menao-purge-brouillons-camille', '50 3 * * *', 'select app.purge_voice_quote_drafts()');

-- ---------------------------------------------------------------------------
-- Pour Camille (Edge Functions voice-session et voice-assistant, rôle service)
-- ---------------------------------------------------------------------------
-- Contexte du devis : chantier de l'artisan encore sans devis envoyé (sinon null), demande du
-- client, métier du lot, commune, régime de TVA, 30 prix habituels les plus récents, droits.
create function public.voice_quote_context(p_artisan_id uuid, p_chantier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'chantier', c.title,
    'besoin', left(p.description, 1500),
    'metier', coalesce(t.label, ''),
    'commune', coalesce(c.ville_nom, p.ville_nom, ''),
    'assujetti_tva', coalesce(a.assujetti_tva, true),
    'prix_habituels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'designation', r.designation, 'unite', r.unit, 'prix_ht_centimes', r.unit_price_ht_cents,
        'tva_bp', r.vat_rate_bp
      ) order by r.updated_at desc)
      from (
        select d.* from (
          select distinct on (lower(l.designation)) l.designation, l.unit, l.unit_price_ht_cents,
            l.vat_rate_bp, l.updated_at
          from public.quote_lines l
          join public.quotes q on q.id = l.quote_id
          where q.artisan_id = a.id and l.unit_price_ht_cents > 0
          order by lower(l.designation), l.updated_at desc
        ) d
        order by d.updated_at desc
        limit 30
      ) r
    ), '[]'::jsonb),
    'droits', app.artisan_agents(a.id)
  )
  from public.chantiers c
  join public.artisans a on a.id = c.artisan_id
  join public.projects p on p.id = c.project_id
  left join public.trades t on t.code = p.trade_code
  where c.id = p_chantier_id
    and c.artisan_id = p_artisan_id
    and c.status in ('rdv_planifie', 'devis_en_revision')
$$;
revoke execute on function public.voice_quote_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.voice_quote_context(uuid, uuid) to service_role;

-- Prix habituels de l'artisan pour une prestation : dernières lignes de ses devis dont la
-- désignation contient le plus de mots de la recherche (3 lettres au moins).
create function public.voice_quote_usual_prices(p_artisan_id uuid, p_query text)
returns table (
  designation text,
  unit public.quote_unit,
  unit_price_ht_cents integer,
  vat_rate_bp smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with words as (
    select distinct w
    from regexp_split_to_table(lower(left(coalesce(p_query, ''), 100)), '[^a-z0-9àâäçéèêëîïôöùûüÿœæ]+') w
    where char_length(w) >= 3
  )
  select s.designation, s.unit, s.unit_price_ht_cents, s.vat_rate_bp
  from (
    select distinct on (lower(l.designation)) l.designation, l.unit, l.unit_price_ht_cents,
      l.vat_rate_bp, l.updated_at,
      (select count(*) from words where strpos(lower(l.designation), words.w) > 0) as hits
    from public.quote_lines l
    join public.quotes q on q.id = l.quote_id
    where q.artisan_id = p_artisan_id and l.unit_price_ht_cents > 0
    order by lower(l.designation), l.updated_at desc
  ) s
  where s.hits > 0
  order by s.hits desc, s.updated_at desc
  limit 8
$$;
revoke execute on function public.voice_quote_usual_prices(uuid, text) from public, anon, authenticated;
grant execute on function public.voice_quote_usual_prices(uuid, text) to service_role;

-- Lignes proposées par Camille pendant un appel : la liste complète remplace la précédente du
-- même appel (corrections comprises).
create function public.voice_quote_save_draft(
  p_artisan_id uuid,
  p_chantier_id uuid,
  p_call_id text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.chantiers c
    where c.id = p_chantier_id and c.artisan_id = p_artisan_id
      and c.status in ('rdv_planifie', 'devis_en_revision')
  ) then
    raise exception 'Chantier introuvable ou devis déjà envoyé.' using errcode = '22023';
  end if;
  if p_call_id is null or char_length(p_call_id) not between 1 and 100 then
    raise exception 'Appel inconnu.' using errcode = '22023';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 50 then
    raise exception 'Lignes invalides.' using errcode = '22023';
  end if;
  insert into public.voice_quote_drafts (chantier_id, artisan_id, call_id, lines)
  values (p_chantier_id, p_artisan_id, p_call_id, p_lines)
  on conflict (chantier_id, call_id) do update
    set lines = excluded.lines, settled_at = null, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.voice_quote_save_draft(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.voice_quote_save_draft(uuid, uuid, text, jsonb) to service_role;
