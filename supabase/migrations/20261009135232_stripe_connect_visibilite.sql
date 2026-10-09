-- F-14 étape 6 — compte Stripe Connect de l'artisan et visibilité (ADR 0011 : paiements directs,
-- MENAO ne détient aucun fonds). Écrit uniquement par le serveur (Edge Functions, webhook).
alter table public.artisans
  add column stripe_account_id text unique,
  add column connect_charges_enabled boolean not null default false,
  add column connect_payouts_enabled boolean not null default false,
  add column connect_details_submitted boolean not null default false,
  add column connect_updated_at timestamptz;

-- Visible des particuliers et destinataire des demandes : validé + abonnement actif + compte de
-- paiement capable d'encaisser (miroir de artisanVisibility, packages/core).
create function app.artisan_is_visible(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.artisans a
    where a.id = p_artisan_id and a.status = 'valide' and a.connect_charges_enabled
      and app.artisan_subscription_active(a.id)
  )
$$;
