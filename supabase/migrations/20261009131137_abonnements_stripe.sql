-- F-15 — formules et abonnements des artisans (Stripe Billing, web uniquement).
-- Les abonnements ne sont écrits que par l'Edge Function stripe-webhook (clé service_role).

-- ---------------------------------------------------------------------------
-- Formules (paramétrées en base, spec F-15). Prix du business plan V6, validés le 9 octobre 2026.
-- « ouverte » : souscriptible ; au lancement, seule la formule Base l'est (business plan : offre
-- unique la première année).
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z]{2,30}$'),
  nom text not null check (char_length(nom) between 1 and 60),
  prix_mensuel_ht_centimes integer not null check (prix_mensuel_ht_centimes > 0),
  avantages jsonb not null default '[]'::jsonb check (jsonb_typeof(avantages) = 'array'),
  -- Paramètres utilisés par les fonctionnalités suivantes (mise en avant, comptes, métiers…).
  limites jsonb not null default '{}'::jsonb check (jsonb_typeof(limites) = 'object'),
  stripe_lookup_key text not null unique,
  ouverte boolean not null default false,
  ordre smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at before update on public.plans
  for each row execute function app.set_updated_at();

alter table public.plans enable row level security;
revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;
create policy "plans : lecture publique" on public.plans for select to anon, authenticated using (true);

insert into public.plans (code, nom, prix_mensuel_ht_centimes, avantages, limites, stripe_lookup_key, ouverte, ordre) values
  ('base', 'Base', 15000,
   '["Mise en relation, fin de la prospection", "Acceptation des devis dans l''application", "Planning, suivi de chantier et réception", "Facturation automatique et avis clients"]',
   '{"comptes": 1, "mise_en_avant": 0}', 'menao_base_mensuel', true, 10),
  ('premium', 'Premium', 50000,
   '["Tout le contenu de Base", "Priorisation dans les résultats", "Devis accélérés par IA", "Recommandations tarifaires", "Jusqu''à 2 comptes"]',
   '{"comptes": 2, "mise_en_avant": 1}', 'menao_premium_mensuel', false, 20),
  ('entreprise', 'Entreprise', 150000,
   '["Tout le contenu de Premium", "Devis pré-générés selon vos paramètres", "Multi-équipes sur un planning unifié", "Jusqu''à 10 comptes", "Interlocuteur dédié"]',
   '{"comptes": 10, "mise_en_avant": 2}', 'menao_entreprise_mensuel', false, 30);

-- ---------------------------------------------------------------------------
-- Client Stripe de l'artisan (jamais modifiable par le client, spec §14)
-- ---------------------------------------------------------------------------
alter table public.artisans add column stripe_customer_id text unique;

-- ---------------------------------------------------------------------------
-- Abonnements
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null unique references public.artisans (id) on delete cascade,
  plan_code text references public.plans (code) on update cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null check (status in (
    'trialing', 'active', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'canceled', 'paused'
  )),
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_plan_code_idx on public.subscriptions (plan_code);
create index subscriptions_status_idx on public.subscriptions (status);

create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function app.set_updated_at();

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy "subscriptions : lecture par l'artisan ou un admin"
  on public.subscriptions for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));

-- Abonnement donnant accès au service (miroir de subscriptionGrantsAccess, packages/core).
create function app.artisan_subscription_active(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.artisan_id = p_artisan_id and s.status in ('trialing', 'active', 'past_due')
  )
$$;

-- ---------------------------------------------------------------------------
-- Webhooks reçus (idempotence, CLAUDE.md règle 9) : un événement n'est traité qu'une fois.
-- ---------------------------------------------------------------------------
create table public.webhook_events (
  id text primary key check (char_length(id) between 1 and 255),
  source text not null default 'stripe',
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger webhook_events_set_updated_at before update on public.webhook_events
  for each row execute function app.set_updated_at();
alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;
