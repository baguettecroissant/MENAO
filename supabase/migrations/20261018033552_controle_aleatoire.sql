-- Contrôle aléatoire des dossiers (ADR 0121), demandé par le cahier des charges « Inscription et
-- vérification des artisans » : chaque mois, revérification de 5 % des artisans validés (appel à
-- l'assureur en cas de doute). Tirage le 1er du mois (pg_cron) ou à la demande d'un admin ;
-- résultat noté par l'équipe ; tirage et résultats inscrits au journal.

create table public.artisan_spot_checks (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  -- Mois du contrôle (premier jour).
  period date not null check (extract(day from period) = 1),
  drawn_at timestamptz not null default now(),
  result text check (result in ('conforme', 'non_conforme')),
  note text check (char_length(note) <= 1000),
  insurer_called boolean not null default false,
  checked_at timestamptz,
  checked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (artisan_id, period)
);
comment on table public.artisan_spot_checks is
  'Contrôles aléatoires mensuels des dossiers artisans (5 % des artisans validés).';
create index artisan_spot_checks_period_idx on public.artisan_spot_checks (period);

alter table public.artisan_spot_checks enable row level security;
revoke all on public.artisan_spot_checks from anon, authenticated;
grant select on public.artisan_spot_checks to authenticated;

create policy "artisan_spot_checks : lecture par l'équipe MENAO"
  on public.artisan_spot_checks for select to authenticated
  using ((select app.is_staff()));

-- Nombre de dossiers à contrôler (miroir de spotCheckTarget) : 5 % arrondis au supérieur.
create function app.spot_check_target(p_eligible integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_eligible, 0) <= 0 then 0 else ceil(p_eligible * 0.05)::integer end
$$;

-- Tirage du mois : complète jusqu'à 5 % des artisans validés, au hasard, en commençant par ceux
-- qui n'ont pas été contrôlés depuis un an. Sans effet une fois la cible du mois atteinte.
create function app.draw_spot_checks(
  p_period date default date_trunc('month', (now() at time zone 'Europe/Paris'))::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target integer;
  v_already integer;
  v_count integer;
begin
  select app.spot_check_target(count(*)::integer) into v_target
  from public.artisans where status = 'valide';
  select count(*)::integer into v_already from public.artisan_spot_checks where period = p_period;

  with drawn as (
    insert into public.artisan_spot_checks (artisan_id, period)
    select a.id, p_period
    from public.artisans a
    where a.status = 'valide'
      and not exists (
        select 1 from public.artisan_spot_checks s where s.artisan_id = a.id and s.period = p_period
      )
    order by exists (
        select 1 from public.artisan_spot_checks s
        where s.artisan_id = a.id and s.period > (p_period - interval '12 months')::date
      ),
      random()
    limit greatest(v_target - v_already, 0)
    returning artisan_id
  ), logged as (
    insert into public.audit_logs (actor_id, action, target_type, target_id, data)
    select (select auth.uid()), 'artisan.controle_tire', 'artisan', d.artisan_id,
      jsonb_build_object('periode', p_period)
    from drawn d
    returning 1
  )
  select count(*)::integer into v_count from logged;
  return v_count;
end;
$$;
revoke execute on function app.draw_spot_checks(date) from public, anon, authenticated;

-- Tirage lancé par un admin (double authentification), pour le mois en cours.
create function public.admin_draw_spot_checks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return app.draw_spot_checks();
end;
$$;
revoke execute on function public.admin_draw_spot_checks() from public, anon;
grant execute on function public.admin_draw_spot_checks() to authenticated;

-- Résultat d'un contrôle : conforme, ou non conforme avec une note ; appel à l'assureur noté.
create function public.admin_complete_spot_check(
  p_id uuid,
  p_result text,
  p_note text default null,
  p_insurer_called boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform app.require_admin();
  if p_result is null or p_result not in ('conforme', 'non_conforme') then
    raise exception 'Résultat attendu : conforme ou non conforme.' using errcode = '22023';
  end if;
  if p_result = 'non_conforme' and v_note is null then
    raise exception 'Une note est obligatoire pour un contrôle non conforme.' using errcode = '22023';
  end if;

  update public.artisan_spot_checks set
    result = p_result,
    note = left(v_note, 1000),
    insurer_called = coalesce(p_insurer_called, false),
    checked_at = now(),
    checked_by = (select auth.uid())
  where id = p_id
  returning artisan_id into v_artisan;
  if v_artisan is null then
    raise exception 'Contrôle introuvable.' using errcode = '22023';
  end if;

  perform app.audit('artisan.controle_' || p_result, 'artisan', v_artisan,
    jsonb_build_object('note', v_note, 'assureur_appele', coalesce(p_insurer_called, false)));
end;
$$;
revoke execute on function public.admin_complete_spot_check(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_complete_spot_check(uuid, text, text, boolean) to authenticated;

-- Tirage automatique le 1er de chaque mois (6 h UTC).
select cron.schedule('menao-controle-aleatoire', '0 6 1 * *', 'select app.draw_spot_checks()');
