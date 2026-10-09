-- F-14 (partie 2) — documents de l'artisan, profil public, stockage des fichiers, envoi en vérification.

-- ---------------------------------------------------------------------------
-- Stockage (F-43). Les fichiers sont d'abord déposés par le navigateur dans « uploads »
-- (privé, dossier = identifiant de l'utilisateur), puis vérifiés par l'Edge Function
-- process-upload (type réel, taille, métadonnées supprimées) qui les range dans leur
-- espace définitif. Personne n'écrit directement dans les espaces définitifs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('artisan-documents', 'artisan-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png']),
  ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "uploads : dépôt dans son propre dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Kbis, assurances, pièce d'identité : propriétaire et admin uniquement (spec F-43), par URL signées.
create policy "artisan-documents : lecture par le propriétaire ou un admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'artisan-documents'
    and ((storage.foldername(name))[1] = (select app.my_artisan_id())::text or (select app.is_admin()))
  );

create policy "portfolio : suppression de ses photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select app.my_artisan_id())::text);

-- ---------------------------------------------------------------------------
-- Documents de l'artisan (F-14 étape 4)
-- ---------------------------------------------------------------------------
create type public.document_type as enum ('kbis', 'decennale', 'rc_pro', 'identite');
create type public.document_status as enum ('en_attente', 'valide', 'refuse');

create table public.artisan_documents (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  type public.document_type not null,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes int not null check (size_bytes between 1 and 10485760),
  date_emission date,
  date_fin date,
  numero text check (char_length(numero) <= 60),
  assureur text check (char_length(assureur) <= 120),
  couverture text check (char_length(couverture) <= 200),
  status public.document_status not null default 'en_attente',
  refusal_reason text check (char_length(refusal_reason) <= 500),
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un seul document courant par type : un nouveau dépôt remplace le précédent.
  unique (artisan_id, type)
);
create index artisan_documents_date_fin_idx on public.artisan_documents (date_fin);
create index artisan_documents_status_idx on public.artisan_documents (status);
create index artisan_documents_verified_by_idx on public.artisan_documents (verified_by);

create trigger artisan_documents_set_updated_at before update on public.artisan_documents
  for each row execute function app.set_updated_at();

alter table public.artisan_documents enable row level security;
revoke all on public.artisan_documents from anon, authenticated;
grant select on public.artisan_documents to authenticated;

create policy "artisan_documents : lecture par le propriétaire ou un admin"
  on public.artisan_documents for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_admin()));

-- ---------------------------------------------------------------------------
-- Profil public (F-14 étape 5)
-- ---------------------------------------------------------------------------
alter table public.artisans
  add column presentation text check (char_length(presentation) <= 2000),
  add column submitted_at timestamptz;

grant update (presentation) on public.artisans to authenticated;

-- La photo de profil est déposée par process-upload uniquement (chemin contrôlé).
revoke update (avatar_path) on public.profiles from authenticated;

create table public.artisan_photos (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 300),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artisan_photos_artisan_id_idx on public.artisan_photos (artisan_id);

create trigger artisan_photos_set_updated_at before update on public.artisan_photos
  for each row execute function app.set_updated_at();

alter table public.artisan_photos enable row level security;
revoke all on public.artisan_photos from anon, authenticated;
grant select, delete on public.artisan_photos to authenticated;

create policy "artisan_photos : lecture des siennes, ou par l'équipe MENAO"
  on public.artisan_photos for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));
create policy "artisan_photos : suppression des siennes"
  on public.artisan_photos for delete to authenticated
  using (artisan_id = (select app.my_artisan_id()));

-- ---------------------------------------------------------------------------
-- Envoi du dossier en vérification (miroir de canSubmitOnboarding, packages/core)
-- ---------------------------------------------------------------------------
create function public.submit_artisan_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where user_id = (select auth.uid());
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  if not (a.sirene_checked_at is not null and a.sirene_active and a.raison_sociale is not null
          and a.assujetti_tva is not null) then
    v_missing := array_append(v_missing, 'entreprise');
  end if;
  if not exists (select 1 from public.artisan_trades t where t.artisan_id = a.id) then
    v_missing := array_append(v_missing, 'metiers');
  end if;
  if not ((a.zone_mode = 'rayon' and a.base_location is not null and a.radius_km is not null)
          or (a.zone_mode = 'communes' and exists (select 1 from public.artisan_zones z where z.artisan_id = a.id))) then
    v_missing := array_append(v_missing, 'zone');
  end if;
  if (
    select count(*) from public.artisan_documents d
    where d.artisan_id = a.id and d.status <> 'refuse' and (
      (d.type = 'kbis' and d.date_emission >= (current_date - interval '3 months')::date)
      or (d.type in ('decennale', 'rc_pro') and d.date_fin >= current_date)
      or (d.type = 'identite' and (d.date_fin is null or d.date_fin >= current_date))
    )
  ) < 4 then
    v_missing := array_append(v_missing, 'documents');
  end if;
  if not (char_length(coalesce(a.presentation, '')) >= 100
          and exists (select 1 from public.profiles p where p.user_id = a.user_id and p.avatar_path is not null)) then
    v_missing := array_append(v_missing, 'profil');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'Étapes incomplètes : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;

revoke execute on function public.submit_artisan_onboarding() from public, anon;
grant execute on function public.submit_artisan_onboarding() to authenticated;
