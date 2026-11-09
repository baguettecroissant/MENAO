-- Fiche publique d'un artisan (lot 23, ADR 0269) : date du dernier contrôle du dossier par l'équipe
-- MENAO, tirée des documents validés (artisan_documents.verified_at), affichée dans « Garanties &
-- Assurances ». Même définition qu'avant (20261019101500_fiches_artisans_publiques.sql), plus
-- `verified_on`.
create or replace function public.artisan_public_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app.artisan_profile_json(a.id) || jsonb_build_object(
    'slug', a.slug,
    'indexable', a.indexable,
    'public_company', app.artisan_public_name(a.nom_commercial, a.raison_sociale, a.sirene_partial),
    'verified_on', (
      select max(d.verified_at)::date
      from public.artisan_documents d
      where d.artisan_id = a.id and d.status = 'valide'
    )
  )
  from public.artisans a
  where a.slug = lower(btrim(p_slug)) and app.artisan_is_visible(a.id)
$$;
revoke execute on function public.artisan_public_page(text) from public;
grant execute on function public.artisan_public_page(text) to anon, authenticated;
