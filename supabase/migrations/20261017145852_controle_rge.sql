-- Contrôle automatique du RGE (ADR 0118), demandé par le cahier des charges « Inscription et
-- vérification des artisans » : les qualifications RGE de l'entreprise sont lues par SIRET dans la
-- « Liste des entreprises RGE » de l'ADEME (données publiques, annuaire France Rénov'). Lecture
-- après la vérification du SIRET (sirene-check), sur demande (artisan, équipe), puis chaque jour
-- pour les fiches lues il y a plus d'une semaine (rge-check). La fiche publique n'affiche que les
-- domaines encore valides ; une qualification retirée de l'annuaire disparaît à la lecture suivante.
-- Les autres qualifications (Qualibat non RGE, Qualifelec…) restent validées par l'équipe.

alter table public.artisans add column rge_checked_at timestamptz;
comment on column public.artisans.rge_checked_at is
  'Dernière lecture de l''annuaire RGE de l''ADEME pour le SIRET de l''artisan.';

create table public.artisan_rge_qualifications (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  organisme text not null check (char_length(organisme) between 1 and 60),
  code_qualification text not null check (char_length(code_qualification) between 1 and 60),
  nom_qualification text not null check (char_length(nom_qualification) between 1 and 300),
  nom_certificat text check (char_length(nom_certificat) <= 200),
  domaine text not null check (char_length(domaine) between 1 and 200),
  meta_domaine text check (char_length(meta_domaine) <= 200),
  particulier boolean,
  date_debut date,
  date_fin date not null,
  url_certificat text check (char_length(url_certificat) <= 1000 and url_certificat ~ '^https://'),
  created_at timestamptz not null default now(),
  unique (artisan_id, organisme, code_qualification, domaine)
);
comment on table public.artisan_rge_qualifications is
  'Qualifications RGE lues dans l''annuaire de l''ADEME (remplacées à chaque lecture).';
create index artisan_rge_qualifications_artisan_id_idx on public.artisan_rge_qualifications (artisan_id);

alter table public.artisan_rge_qualifications enable row level security;
revoke all on public.artisan_rge_qualifications from anon, authenticated;
grant select on public.artisan_rge_qualifications to authenticated;

create policy "artisan_rge_qualifications : lecture des siennes, ou par l'équipe MENAO"
  on public.artisan_rge_qualifications for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- Enregistrement d'une lecture de l'annuaire (Edge Functions, service_role) : les qualifications
-- de l'artisan sont remplacées par celles lues (liste déjà contrôlée par parseRgeLines).
create function public.record_rge_qualifications(p_artisan_id uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Liste de qualifications attendue.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.artisans where id = p_artisan_id) then
    raise exception 'Artisan introuvable.' using errcode = '22023';
  end if;

  delete from public.artisan_rge_qualifications where artisan_id = p_artisan_id;
  insert into public.artisan_rge_qualifications
    (artisan_id, organisme, code_qualification, nom_qualification, nom_certificat, domaine,
     meta_domaine, particulier, date_debut, date_fin, url_certificat)
  select p_artisan_id, r ->> 'organisme', r ->> 'code', r ->> 'name', r ->> 'certificate',
    r ->> 'domain', r ->> 'category', (r ->> 'particulier')::boolean, (r ->> 'startsOn')::date,
    (r ->> 'endsOn')::date, r ->> 'url'
  from jsonb_array_elements(p_rows) as r
  on conflict (artisan_id, organisme, code_qualification, domaine) do nothing;
  get diagnostics v_count = row_count;

  update public.artisans set rge_checked_at = now() where id = p_artisan_id;
  return v_count;
end;
$$;
revoke execute on function public.record_rge_qualifications(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_rge_qualifications(uuid, jsonb) to service_role;

-- Fiches à relire (rge-check, service_role) : SIRET vérifié, dossier envoyé ou artisan en
-- activité, dernière lecture de plus d'une semaine ; les plus anciennes d'abord.
create function public.rge_refresh_candidates(p_limit int default 100)
returns table (artisan_id uuid, siret text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.siret
  from public.artisans a
  where a.siret ~ '^[0-9]{14}$'
    and a.sirene_checked_at is not null
    and a.status in ('en_verification', 'valide', 'suspendu')
    and (a.rge_checked_at is null or a.rge_checked_at < now() - interval '7 days')
  order by a.rge_checked_at nulls first, a.id
  limit least(greatest(coalesce(p_limit, 100), 1), 200)
$$;
revoke execute on function public.rge_refresh_candidates(int) from public, anon, authenticated;
grant execute on function public.rge_refresh_candidates(int) to service_role;

-- Lecture quotidienne : appel de rge-check, à côté de notify (même adresse de base, même secret).
create function app.dispatch_rge_refresh()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.rge_refresh_candidates(1)) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'menao_notify_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'menao_notify_secret';
  if v_url is null or v_secret is null or v_url !~ '/notify/?$' then
    return;
  end if;
  perform net.http_post(
    url := regexp_replace(v_url, '/notify/?$', '/rge-check'),
    body := '{"batch":true}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-menao-secret', v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function app.dispatch_rge_refresh() from public, anon, authenticated;
select cron.schedule('menao-controle-rge', '30 3 * * *', 'select app.dispatch_rge_refresh()');

-- Fiche publique (même fonction qu'avant, F-10), avec les domaines RGE encore valides.
create or replace function app.artisan_profile_json(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'display_name', coalesce(pr.first_name, a.nom_commercial, a.raison_sociale),
    'company_name', coalesce(a.nom_commercial, a.raison_sociale),
    'avatar_path', pr.avatar_path,
    'experience_years', a.experience_years,
    'presentation', a.presentation,
    'paused', a.paused or app.artisan_absent(a.id, (now() at time zone 'Europe/Paris')::date),
    -- Temps de réponse moyen (F-10), publié à partir de 3 réponses.
    'response_minutes', (
      select s.minutes from app.artisan_response_stats(a.id) s where s.responses >= 3
    ),
    'available_from', a.available_from,
    'zone', jsonb_build_object(
      'mode', a.zone_mode,
      'radius_km', a.radius_km,
      'city', app.base_commune(a.base_label),
      'communes', (select coalesce(jsonb_agg(z.nom order by z.nom), '[]') from public.artisan_zones z where z.artisan_id = a.id)
    ),
    'trades', (
      select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'label', t.label) order by t.sort_order), '[]')
      from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = a.id
    ),
    'work_types', (
      select coalesce(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'trade', w.trade_code) order by w.sort_order), '[]')
      from public.artisan_work_types aw join public.work_types w on w.code = aw.work_type_code
      where aw.artisan_id = a.id and w.active
    ),
    'decennale', (
      select jsonb_build_object('valid_until', d.date_fin, 'insurer', d.assureur)
      from public.artisan_documents d
      where d.artisan_id = a.id and d.type = 'decennale' and d.status = 'valide'
      order by d.date_fin desc nulls last limit 1
    ),
    'certifications', (
      select coalesce(jsonb_agg(jsonb_build_object('type', c.type, 'numero', c.numero, 'valid_until', c.date_fin) order by c.type), '[]')
      from public.certifications c
      where c.artisan_id = a.id and c.verified_at is not null
        and c.date_fin >= (now() at time zone 'Europe/Paris')::date
    ),
    -- Domaines RGE lus dans l'annuaire officiel (ADR 0118), encore valides, sans doublon.
    'rge', (
      select coalesce(jsonb_agg(jsonb_build_object('domain', q.domaine, 'category', q.meta_domaine, 'valid_until', q.date_fin) order by q.domaine), '[]')
      from (
        select distinct on (r.domaine) r.domaine, r.meta_domaine, r.date_fin
        from public.artisan_rge_qualifications r
        where r.artisan_id = a.id and r.date_fin >= (now() at time zone 'Europe/Paris')::date
        order by r.domaine, r.date_fin desc
      ) q
    ),
    'photos', (
      select coalesce(jsonb_agg(p.storage_path order by p.sort_order, p.created_at), '[]')
      from public.artisan_photos p where p.artisan_id = a.id
    ),
    'score', (
      select jsonb_build_object(
        'review_count', s.review_count,
        'quality', s.quality,
        'delays', s.delays,
        'communication', s.communication,
        'value_for_money', s.value_for_money,
        'global', s.global_score
      )
      from public.artisan_scores s where s.artisan_id = a.id
    )
  )
  from public.artisans a
  left join public.profiles pr on pr.user_id = a.user_id
  where a.id = p_artisan_id
$$;
