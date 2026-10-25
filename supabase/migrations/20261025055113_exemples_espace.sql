-- Exemples de l'espace artisan (ADR 0184) : tant qu'il n'a reçu aucune demande, l'artisan voit
-- des demandes et des chantiers d'exemple dans son espace (données fictives, jamais enregistrées).
-- Il peut les masquer : le choix est gardé sur sa fiche, le même sur le site et dans l'application.
alter table public.artisans add column examples_hidden_at timestamptz;

create function public.hide_space_examples()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.artisans set examples_hidden_at = coalesce(examples_hidden_at, now())
  where user_id = auth.uid()
$$;
revoke execute on function public.hide_space_examples() from public, anon;
grant execute on function public.hide_space_examples() to authenticated;
