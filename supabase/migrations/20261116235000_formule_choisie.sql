-- Formule choisie avant la validation (F-163, lot 62, ADR 0353). Pendant qu'il prépare son dossier
-- ou attend la vérification, l'artisan choisit sa formule sans rien payer : le choix est gardé ici,
-- le paiement (Stripe Billing) n'est proposé qu'une fois l'entreprise validée.

-- Simple code de formule, contrôlé par la fonction ci-dessous (formule existante et ouverte).
alter table public.artisans
  add column plan_choisi text check (plan_choisi ~ '^[a-z]{2,30}$');

comment on column public.artisans.plan_choisi is
  'Formule choisie avant la validation, sans paiement (ADR 0353). L''abonnement réel est dans subscriptions.';

-- Le titulaire du compte choisit (ou change) sa formule parmi celles qui sont ouvertes. Refusé pour
-- un dossier refusé, suspendu ou radié, et pour un membre de l'équipe.
create function public.artisan_choose_plan(p_plan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.plans p where p.code = p_plan and p.ouverte) then
    raise exception 'plan_unavailable' using errcode = '22023';
  end if;
  update public.artisans a
  set plan_choisi = p_plan
  where a.user_id = (select auth.uid())
    and a.status in ('brouillon', 'en_verification', 'valide');
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.artisan_choose_plan(text) from public, anon;
grant execute on function public.artisan_choose_plan(text) to authenticated;
