-- Envoi au comptable (F-63, ADR 0187) : chaque mois ou chaque trimestre, les factures et les
-- dépenses de la période écoulée (tableaux CSV et pièces, dans un ZIP) partent chez le comptable de
-- l'artisan par un lien de téléchargement valable 30 jours. Envoi automatique les 7 premiers jours
-- de la période suivante (rattrapage), ou à la main. Réglages et historique lisibles par l'artisan
-- seul ; l'archive reste dans un espace privé, servie par une URL signée.
create type public.accountant_period as enum ('mensuel', 'trimestriel');
create type public.accountant_export_kind as enum ('automatique', 'manuel');
create type public.accountant_export_status as enum ('envoye', 'echec');

create table public.accountant_settings (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  enabled boolean not null default false,
  email text not null check (
    char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  period public.accountant_period not null default 'mensuel',
  include_invoices boolean not null default true,
  include_expenses boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (include_invoices or include_expenses)
);
create trigger accountant_settings_set_updated_at
  before update on public.accountant_settings
  for each row execute function app.set_updated_at();

alter table public.accountant_settings enable row level security;
revoke all on public.accountant_settings from anon, authenticated;
grant select on public.accountant_settings to authenticated;
create policy "accountant_settings : lecture par l'artisan"
  on public.accountant_settings for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- Historique des envois. Écrit par l'Edge Function accountant-export (service_role).
create table public.accountant_exports (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  kind public.accountant_export_kind not null,
  status public.accountant_export_status not null,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  recipient text not null check (char_length(recipient) <= 254),
  invoices_count integer check (invoices_count >= 0),
  expenses_count integer check (expenses_count >= 0),
  -- Archive dans « accountant-exports/<artisan_id>/… », retirée après 60 jours.
  storage_path text,
  error text check (char_length(error) <= 200),
  created_at timestamptz not null default now()
);
create index accountant_exports_artisan_idx on public.accountant_exports (artisan_id, created_at desc);
-- Un seul envoi automatique réussi par période.
create unique index accountant_exports_automatique_idx
  on public.accountant_exports (artisan_id, period_start)
  where kind = 'automatique' and status = 'envoye';

alter table public.accountant_exports enable row level security;
revoke all on public.accountant_exports from anon, authenticated;
grant select on public.accountant_exports to authenticated;
create policy "accountant_exports : lecture par l'artisan"
  on public.accountant_exports for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- Archives envoyées (CLAUDE.md règle 8) : espace privé, aucun accès direct ; le comptable les
-- télécharge par une URL signée.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('accountant-exports', 'accountant-exports', false, 209715200, array['application/zip'])
on conflict (id) do nothing;

-- Réglages de l'envoi, par l'artisan de l'espace pro.
create function public.artisan_save_accountant_settings(
  p_enabled boolean,
  p_email text,
  p_period public.accountant_period,
  p_include_invoices boolean,
  p_include_expenses boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_pro_artisan_id();
begin
  if v_artisan is null then
    raise exception 'acces_refuse' using errcode = '42501';
  end if;
  insert into public.accountant_settings (
    artisan_id, enabled, email, period, include_invoices, include_expenses
  ) values (
    v_artisan, p_enabled, lower(btrim(p_email)), p_period, p_include_invoices, p_include_expenses
  )
  on conflict (artisan_id) do update set
    enabled = excluded.enabled,
    email = excluded.email,
    period = excluded.period,
    include_invoices = excluded.include_invoices,
    include_expenses = excluded.include_expenses;
end;
$$;
revoke execute on function public.artisan_save_accountant_settings(
  boolean, text, public.accountant_period, boolean, boolean
) from public, anon;
grant execute on function public.artisan_save_accountant_settings(
  boolean, text, public.accountant_period, boolean, boolean
) to authenticated;

-- Envois automatiques dus (mêmes règles que packages/core/src/accountant.ts) : les 7 premiers
-- jours du mois (mensuel) ou du trimestre (trimestriel), pour la période précédente, tant qu'aucun
-- envoi automatique n'a réussi et qu'il y a eu moins de 3 échecs. Artisans de l'espace pro seulement.
create function public.accountant_exports_due(p_today date default null, p_limit int default 10)
returns table (
  artisan_id uuid,
  email text,
  period public.accountant_period,
  include_invoices boolean,
  include_expenses boolean,
  period_start date,
  period_end date
)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select coalesce(p_today, (now() at time zone 'Europe/Paris')::date) as d
  ),
  settings as (
    select s.*,
      case s.period
        when 'mensuel' then (date_trunc('month', t.d) - interval '1 month')::date
        else (date_trunc('quarter', t.d) - interval '3 months')::date
      end as start_on
    from public.accountant_settings s
    join public.artisans a on a.id = s.artisan_id and a.status in ('valide', 'suspendu', 'radie')
    cross join today t
    where s.enabled
      and extract(day from t.d) <= 7
      and (s.period = 'mensuel' or extract(month from t.d)::int in (1, 4, 7, 10))
  )
  select s.artisan_id, s.email, s.period, s.include_invoices, s.include_expenses, s.start_on,
    (s.start_on + case s.period when 'mensuel' then interval '1 month' else interval '3 months' end
      - interval '1 day')::date
  from settings s
  where not exists (
      select 1 from public.accountant_exports e
      where e.artisan_id = s.artisan_id and e.kind = 'automatique'
        and e.period_start = s.start_on and e.status = 'envoye'
    )
    and (
      select count(*) from public.accountant_exports e
      where e.artisan_id = s.artisan_id and e.kind = 'automatique'
        and e.period_start = s.start_on and e.status = 'echec'
    ) < 3
  order by s.artisan_id
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;
revoke execute on function public.accountant_exports_due(date, int) from public, anon, authenticated;
grant execute on function public.accountant_exports_due(date, int) to service_role;

-- Appelle la fonction accountant-export (pg_net) s'il y a des envois dus ou des archives à
-- retirer. Même adresse de base et même secret que la fonction notify (Vault : menao_notify_url,
-- menao_notify_secret) ; sans eux (local, CI), rien n'est appelé.
create function app.dispatch_accountant_exports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.accountant_exports_due(null, 1))
    and not exists (
      select 1 from public.accountant_exports
      where storage_path is not null and created_at < now() - interval '60 days'
    ) then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'menao_notify_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'menao_notify_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := regexp_replace(v_url, '/notify/?$', '/accountant-export'),
    body := '{"mode":"automatique"}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-menao-secret', v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function app.dispatch_accountant_exports() from public, anon, authenticated;
select cron.schedule('menao-envoi-comptable', '20 * * * *', 'select app.dispatch_accountant_exports()');
