-- Fiches artisans publiques (SEO phase D, F-61, ADR 0144) : une adresse stable par artisan validé
-- (`/artisans/<nom-commune>`), indexée par Google par défaut, avec une case pour s'en retirer, et
-- les lectures publiques de la fiche et de la liste des fiches (plan du site, pages métier × ville,
-- badge « Assuré et vérifié par MENAO »). Mêmes données que la fiche de la recherche : jamais de
-- coordonnées, de SIRET ni d'adresse.

alter table public.artisans
  add column slug text unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  add column indexable boolean not null default true;

-- L'artisan choisit lui-même si sa fiche apparaît dans Google ; l'adresse ne change pas.
-- TODO(legal) : indexation par défaut et droit de s'y opposer à inscrire dans les CGV artisans.
grant update (indexable) on public.artisans to authenticated;

-- Texte en adresse : minuscules sans accents, mots séparés par des tirets (« Côte d'Azur » →
-- « cote-d-azur »). Vide → null.
create function app.slugify(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Accents retirés avant le passage en minuscules : `lower` ne dépend alors pas de la locale.
  select nullif(trim(both '-' from regexp_replace(
    lower(translate(
      replace(replace(replace(replace(coalesce(p_text, ''), 'œ', 'oe'), 'Œ', 'OE'), 'æ', 'ae'), 'Æ', 'AE'),
      'àâäáãåçéèêëíìîïñóòôöõøúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸ',
      'aaaaaaceeeeiiiinoooooouuuuyyAAAAAACEEEEIIIINOOOOOOUUUUYY'
    )),
    '[^a-z0-9]+', '-', 'g'
  )), '')
$$;
revoke execute on function app.slugify(text) from public, anon, authenticated;

-- Nom public : nom commercial, sinon raison sociale, sauf diffusion partielle à l'INSEE (l'artisan
-- a demandé que son identité ne soit pas publiée) : jamais la raison sociale dans ce cas.
create function app.artisan_public_name(p_nom_commercial text, p_raison_sociale text, p_sirene_partial boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(p_nom_commercial), ''),
    case when not coalesce(p_sirene_partial, false) then nullif(btrim(p_raison_sociale), '') end
  )
$$;
revoke execute on function app.artisan_public_name(text, text, boolean) from public, anon, authenticated;

-- Adresse libre pour un artisan : nom public (sinon son premier métier) et commune de base (sinon
-- la première commune de sa zone), suffixe -2, -3… si elle est déjà prise.
create function app.artisan_new_slug(
  p_artisan_id uuid,
  p_nom_commercial text,
  p_raison_sociale text,
  p_sirene_partial boolean,
  p_base_label text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_base text := coalesce(
    app.slugify(app.artisan_public_name(p_nom_commercial, p_raison_sociale, p_sirene_partial)),
    app.slugify((
      select t.label from public.artisan_trades at join public.trades t on t.code = at.trade_code
      where at.artisan_id = p_artisan_id order by t.sort_order limit 1
    )),
    'artisan');
  v_city text := app.slugify(coalesce(
    app.base_commune(p_base_label),
    (select z.nom from public.artisan_zones z where z.artisan_id = p_artisan_id order by z.nom limit 1)
  ));
  v_slug text;
  v_n int := 1;
begin
  -- La commune n'est ajoutée que si le nom ne la contient pas déjà (« plomberie-nice »).
  if v_city is not null and v_base !~ ('(^|-)' || v_city || '(-|$)') then
    v_base := v_base || '-' || v_city;
  end if;
  v_base := trim(both '-' from left(v_base, 72));
  v_slug := v_base;
  while exists (select 1 from public.artisans a where a.slug = v_slug and a.id <> p_artisan_id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;
  return v_slug;
end;
$$;
revoke execute on function app.artisan_new_slug(uuid, text, text, boolean, text) from public, anon, authenticated;

-- L'adresse est fixée à la validation du dossier, puis ne change plus (liens et référencement
-- stables), même si le nom commercial change ou si l'artisan est suspendu puis rétabli.
create function app.artisans_assign_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.slug is null and new.status = 'valide' then
    new.slug := app.artisan_new_slug(
      new.id, new.nom_commercial, new.raison_sociale, new.sirene_partial, new.base_label);
  end if;
  return new;
end;
$$;
revoke execute on function app.artisans_assign_slug() from public, anon, authenticated;
create trigger artisans_assign_slug before insert or update of status on public.artisans
  for each row execute function app.artisans_assign_slug();

-- Artisans déjà validés.
do $$
declare
  r record;
begin
  for r in select a.id from public.artisans a where a.status = 'valide' and a.slug is null order by a.created_at loop
    update public.artisans a
    set slug = app.artisan_new_slug(a.id, a.nom_commercial, a.raison_sociale, a.sirene_partial, a.base_label)
    where a.id = r.id;
  end loop;
end;
$$;

-- Fiche publique par son adresse : artisans visibles seulement (validés, abonnés, paiements
-- actifs), avec l'adresse, le nom d'entreprise publiable (titre de la page ; absent en diffusion
-- partielle sans nom commercial) et le choix de l'artisan pour Google.
create function public.artisan_public_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app.artisan_profile_json(a.id) || jsonb_build_object(
    'slug', a.slug,
    'indexable', a.indexable,
    'public_company', app.artisan_public_name(a.nom_commercial, a.raison_sociale, a.sirene_partial)
  )
  from public.artisans a
  where a.slug = lower(btrim(p_slug)) and app.artisan_is_visible(a.id)
$$;
revoke execute on function public.artisan_public_page(text) from public;
grant execute on function public.artisan_public_page(text) to anon, authenticated;

-- Fiches publiques existantes : plan du site (fiches indexables) et liens des pages métier × ville.
create function public.public_artisan_pages()
returns table (artisan_id uuid, slug text, indexable boolean, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.slug, a.indexable, a.updated_at
  from public.artisans a
  where a.slug is not null and app.artisan_is_visible(a.id)
  order by a.slug
$$;
revoke execute on function public.public_artisan_pages() from public;
grant execute on function public.public_artisan_pages() to anon, authenticated;
