-- Entreprise déjà inscrite (ADR 0175) : à l'inscription, un SIRET déjà rattaché à un compte était
-- ignoré sans rien dire (app.after_auth_user_insert) et l'artisan se retrouvait avec un dossier
-- sans entreprise. Le parcours demande désormais, dès l'étape « entreprise », si ce SIRET a déjà un
-- compte. Réponse oui ou non seulement, sans rien dire du compte existant.
create function public.siret_registered(p_siret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.is_valid_siret(p_siret), false)
    and exists (select 1 from public.artisans a where a.siret = p_siret)
$$;
revoke execute on function public.siret_registered(text) from public;
grant execute on function public.siret_registered(text) to anon, authenticated;
