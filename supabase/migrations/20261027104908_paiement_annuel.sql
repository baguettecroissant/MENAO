-- Paiement à l'année (F-15, ADR 0200, lot 2) : 12 mois payés d'avance au prix de 10 (2 mois
-- offerts, ANNUAL_FREE_MONTHS de @menao/core), après l'essai de 2 mois. Prix annuels créés dans
-- Stripe par `pnpm stripe:setup` sous leur propre clé ; le webhook enregistre la périodicité.

-- ---------------------------------------------------------------------------
-- Clé du prix annuel de chaque formule
-- ---------------------------------------------------------------------------
alter table public.plans add column stripe_lookup_key_annuel text unique;
update public.plans set stripe_lookup_key_annuel = 'menao_' || code || '_annuel';
alter table public.plans alter column stripe_lookup_key_annuel set not null;

-- ---------------------------------------------------------------------------
-- Périodicité de l'abonnement (écrite par stripe-webhook, clé serveur)
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column periodicite text not null default 'mensuel' check (periodicite in ('mensuel', 'annuel'));

-- ---------------------------------------------------------------------------
-- Revenu mensuel du back-office : un abonnement annuel compte pour un douzième de son prix
-- (10 mois de la formule). Reprise de 20261012145949_paiements_abonnements_admin.sql.
-- ---------------------------------------------------------------------------
create function app.monthly_revenue_cents(p_monthly_cents integer, p_periodicite text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when p_periodicite = 'annuel' then p_monthly_cents * 10 / 12 else p_monthly_cents end
$$;
revoke execute on function app.monthly_revenue_cents(integer, text) from public, anon, authenticated;

create or replace function app.subscription_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'actifs', count(*) filter (where s.status = 'active'),
    'essais', count(*) filter (where s.status = 'trialing'),
    'impayes', count(*) filter (where s.status in ('past_due', 'unpaid')),
    'resilies_30j', count(*) filter (
      where s.status = 'canceled' and s.ended_at >= now() - interval '30 days'
    ),
    'payants', count(*) filter (where s.status in ('active', 'past_due')),
    'mrr_cents', coalesce(
      sum(app.monthly_revenue_cents(p.prix_mensuel_ht_centimes, s.periodicite))
        filter (where s.status in ('active', 'past_due')), 0
    ),
    'essais_cents', coalesce(
      sum(app.monthly_revenue_cents(p.prix_mensuel_ht_centimes, s.periodicite))
        filter (where s.status = 'trialing' and not s.cancel_at_period_end), 0
    ),
    'impayes_cents', coalesce(
      sum(app.monthly_revenue_cents(p.prix_mensuel_ht_centimes, s.periodicite))
        filter (where s.status in ('past_due', 'unpaid')), 0
    ),
    'fin_programmee', count(*) filter (
      where s.cancel_at_period_end and s.status in ('active', 'trialing')
    ),
    'en_cours_30j', count(*) filter (
      where s.created_at < now() - interval '30 days'
        and s.status not in ('incomplete', 'incomplete_expired')
        and (s.ended_at is null or s.ended_at >= now() - interval '30 days')
    ),
    'perdus_30j', count(*) filter (
      where s.created_at < now() - interval '30 days'
        and s.status = 'canceled' and s.ended_at >= now() - interval '30 days'
    ),
    'sans_formule', count(*) filter (where p.code is null and s.status in ('active', 'past_due'))
  )
  from public.subscriptions s
  left join public.plans p on p.code = s.plan_code
$$;

create or replace function public.admin_subscription_summary()
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
  return app.subscription_summary() || jsonb_build_object('formules', (
    select coalesce(jsonb_agg(to_jsonb(f) - 'ordre' order by f.ordre), '[]'::jsonb)
    from (
      select p.code, p.nom, p.prix_mensuel_ht_centimes as prix_cents, p.ordre,
        count(s.id) filter (where s.status in ('active', 'past_due')) as payants,
        count(s.id) filter (where s.status = 'trialing') as essais,
        coalesce(sum(app.monthly_revenue_cents(p.prix_mensuel_ht_centimes, s.periodicite))
          filter (where s.status in ('active', 'past_due')), 0) as mrr_cents
      from public.plans p
      left join public.subscriptions s on s.plan_code = p.code
      group by p.id
    ) f
  ));
end;
$$;
