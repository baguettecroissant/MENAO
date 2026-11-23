-- Ouverture de la vitrine (F-188, ADR 0387) : l'équipe peut retirer une fiche du site public
-- (comptes de test, démonstrations) sans changer son statut. La fiche n'apparaît plus aux
-- particuliers, ni dans le plan du site, et ne reçoit plus de demandes ; le compte reste utilisable.
-- Écrite par l'équipe seulement (aucun droit de modification pour les utilisateurs connectés).
alter table public.artisans
  add column masque_public boolean not null default false;

comment on column public.artisans.masque_public is
  'Fiche retirée du site public par l''équipe (comptes de test, démonstrations), ADR 0387.';

-- Visible des particuliers et destinataire des demandes : validé + abonnement actif + compte de
-- paiement capable d'encaisser + fiche non retirée du site public.
create or replace function app.artisan_is_visible(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.artisans a
    where a.id = p_artisan_id and a.status = 'valide' and a.connect_charges_enabled
      and app.artisan_subscription_active(a.id) and not a.masque_public
  )
$$;
