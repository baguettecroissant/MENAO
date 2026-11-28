-- F-195 (lot 84, ADR 0395) : inscription préparée par un conseiller.
--
-- Le conseiller saisit l'entreprise, les métiers, la zone et le contact de l'artisan, avec son
-- accord ; MENAO crée un lien personnel à clé secrète (32 caractères), valable 7 jours, qui porte
-- le code du conseiller. L'artisan l'ouvre sans compte, vérifie, puis finit lui-même son
-- inscription par le parcours habituel (dirigeant, TVA, mot de passe, CGV, code reçu par e-mail).
-- Quand l'inscription est rattachée au conseiller, ses informations personnelles sont effacées ;
-- un lien jamais ouvert est effacé après 7 jours, une inscription pas finie après 30 jours.
-- TODO(legal) : texte d'information de l'artisan sur la saisie préalable, et la case d'accord.

create table public.prepared_signups (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default replace(gen_random_uuid()::text, '-', '') check (key ~ '^[a-f0-9]{32}$'),
  commercial_id uuid not null references public.commercials (id) on delete cascade,
  siret text not null check (siret ~ '^[0-9]{14}$'),
  company_name text check (char_length(company_name) <= 200),
  -- Brouillon du parcours d'inscription (ArtisanSignupDraft, @menao/core) ; effacé à l'inscription.
  draft jsonb check (jsonb_typeof(draft) = 'object' and pg_column_size(draft) <= 16384),
  first_name text check (char_length(first_name) between 1 and 80),
  last_name text check (char_length(last_name) between 1 and 80),
  email text check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- Accord de l'artisan déclaré par le conseiller au moment de la préparation.
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  opened_at timestamptz,
  converted_at timestamptz
);
create index prepared_signups_commercial_idx on public.prepared_signups (commercial_id, created_at desc);
create index prepared_signups_siret_idx on public.prepared_signups (siret);

alter table public.prepared_signups enable row level security;
revoke all on public.prepared_signups from anon, authenticated;
grant select on public.prepared_signups to authenticated;
create policy "prepared_signups : lecture par le conseiller ou un admin"
  on public.prepared_signups for select to authenticated
  using (commercial_id = (select app.my_commercial_id()) or (select app.is_admin()));

-- Préparer une inscription. Une préparation encore ouverte du même conseiller pour le même SIRET
-- est remplacée. Refusée si l'entreprise est déjà inscrite sur MENAO. Retourne la clé du lien.
create function public.commercial_prepare_signup(
  p_siret text,
  p_company_name text,
  p_draft jsonb,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_first text := nullif(btrim(coalesce(p_first_name, '')), '');
  v_last text := nullif(btrim(coalesce(p_last_name, '')), '');
  v_key text;
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  if p_siret is null or p_siret !~ '^[0-9]{14}$' then
    raise exception 'SIRET invalide.' using errcode = '22023';
  end if;
  if exists (select 1 from public.artisans a where a.siret = p_siret) then
    raise exception 'Cette entreprise est déjà inscrite sur MENAO.' using errcode = '22023';
  end if;
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' or pg_column_size(p_draft) > 16384 then
    raise exception 'Préparation invalide.' using errcode = '22023';
  end if;
  if v_first is null or char_length(v_first) > 80 or char_length(v_last) > 80 then
    raise exception 'Prénom ou nom invalide.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Téléphone invalide : format international, par exemple +33612345678.' using errcode = '22023';
  end if;
  delete from public.prepared_signups ps
  where ps.commercial_id = v_me and ps.siret = p_siret and ps.converted_at is null;
  insert into public.prepared_signups
    (commercial_id, siret, company_name, draft, first_name, last_name, email, phone)
  values (v_me, p_siret, left(nullif(btrim(coalesce(p_company_name, '')), ''), 200), p_draft,
    v_first, v_last, v_email, p_phone)
  returning key into v_key;
  return v_key;
end;
$$;
revoke execute on function public.commercial_prepare_signup(text, text, jsonb, text, text, text, text) from public, anon;
grant execute on function public.commercial_prepare_signup(text, text, jsonb, text, text, text, text) to authenticated;

-- Suivi du conseiller : ses préparations, et pour celles devenues des inscriptions, l'étape du
-- dossier (mêmes étapes manquantes que « Mon code »).
create function public.commercial_prepared_signups()
returns table (
  id uuid,
  key text,
  siret text,
  company_name text,
  first_name text,
  phone text,
  created_at timestamptz,
  expires_at timestamptz,
  opened_at timestamptz,
  converted_at timestamptz,
  artisan_status public.artisan_status,
  manque text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  return query
  select ps.id, ps.key, ps.siret, ps.company_name, ps.first_name, ps.phone, ps.created_at,
    ps.expires_at, ps.opened_at, ps.converted_at, a.status,
    case
      when a.id is null then '{}'::text[]
      when a.status = 'brouillon' then app.onboarding_missing_steps(a.id)
      when a.status = 'valide' and not app.artisan_is_visible(a.id) then app.activation_missing_steps(a.id)
      else '{}'::text[]
    end
  from public.prepared_signups ps
  left join public.artisans a
    on a.siret = ps.siret and ps.converted_at is not null
    and exists (
      select 1 from public.commercial_attributions ca
      where ca.artisan_id = a.id and ca.commercial_id = v_me
    )
  where ps.commercial_id = v_me
  order by ps.created_at desc
  limit 200;
end;
$$;
revoke execute on function public.commercial_prepared_signups() from public, anon;
grant execute on function public.commercial_prepared_signups() to authenticated;

-- Retirer une préparation (le conseiller s'est trompé, ou l'artisan ne veut plus).
create function public.commercial_delete_prepared_signup(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.my_commercial_id();
begin
  if v_me is null then
    raise exception 'Réservé aux commerciaux' using errcode = '42501';
  end if;
  delete from public.prepared_signups ps
  where ps.id = p_id and ps.commercial_id = v_me and ps.converted_at is null;
end;
$$;
revoke execute on function public.commercial_delete_prepared_signup(uuid) from public, anon;
grant execute on function public.commercial_delete_prepared_signup(uuid) to authenticated;

-- Le lien de l'artisan, ouvert sans compte : ce qui a été préparé, le prénom et le code du
-- conseiller. Note la première ouverture. Rien si le lien est inconnu, déjà utilisé ou expiré sans
-- avoir été ouvert.
create function public.prepared_signup_open(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.prepared_signups;
  v_result jsonb;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{32}$' then
    return null;
  end if;
  select * into v_row from public.prepared_signups ps where ps.key = p_key for update;
  if v_row.id is null or v_row.converted_at is not null
     or (v_row.opened_at is null and v_row.expires_at <= now()) then
    return null;
  end if;
  update public.prepared_signups set opened_at = coalesce(opened_at, now()) where id = v_row.id;
  select jsonb_build_object(
    'advisor', coalesce(nullif(pr.first_name, ''), split_part(c.nom, ' ', 1)),
    'code', case when c.status = 'actif' then c.code end,
    'company_name', v_row.company_name,
    'siret', v_row.siret,
    'draft', v_row.draft,
    'first_name', v_row.first_name,
    'last_name', v_row.last_name,
    'email', v_row.email,
    'phone', v_row.phone
  ) into v_result
  from public.commercials c
  left join public.profiles pr on pr.user_id = c.user_id
  where c.id = v_row.commercial_id;
  return v_result;
end;
$$;
revoke execute on function public.prepared_signup_open(text) from public;
grant execute on function public.prepared_signup_open(text) to anon, authenticated;

-- « Ce n'est pas moi » ou « Je ne veux pas m'inscrire » : l'artisan efface ce qui a été préparé.
create function public.prepared_signup_forget(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_key is null or p_key !~ '^[a-f0-9]{32}$' then
    return;
  end if;
  delete from public.prepared_signups ps where ps.key = p_key and ps.converted_at is null;
end;
$$;
revoke execute on function public.prepared_signup_forget(text) from public;
grant execute on function public.prepared_signup_forget(text) to anon, authenticated;

-- Inscription rattachée au conseiller : sa préparation pour ce SIRET devient « inscrit » et ses
-- informations personnelles sont effacées (l'artisan a désormais son propre compte).
create function app.convert_prepared_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prepared_signups ps set
    converted_at = now(), draft = null, first_name = null, last_name = null, email = null, phone = null
  from public.artisans a
  where a.id = new.artisan_id and ps.siret = a.siret
    and ps.commercial_id = new.commercial_id and ps.converted_at is null;
  return new;
end;
$$;
revoke execute on function app.convert_prepared_signup() from public, anon, authenticated;
create trigger commercial_attributions_convert_prepared
  after insert on public.commercial_attributions
  for each row execute function app.convert_prepared_signup();

-- Back-office : la préparation d'une inscription d'artisan (qui, quand, ouverte, finie).
create function public.admin_artisan_prepared_signup(p_artisan uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return (
    select jsonb_build_object(
      'commercial_id', c.id,
      'commercial', c.nom,
      'code', c.code,
      'created_at', ps.created_at,
      'opened_at', ps.opened_at,
      'converted_at', ps.converted_at
    )
    from public.artisans a
    join public.prepared_signups ps on ps.siret = a.siret and ps.converted_at is not null
    join public.commercials c on c.id = ps.commercial_id
    where a.id = p_artisan
    order by ps.converted_at desc
    limit 1
  );
end;
$$;
revoke execute on function public.admin_artisan_prepared_signup(uuid) from public, anon;
grant execute on function public.admin_artisan_prepared_signup(uuid) to authenticated;

-- Purge quotidienne : lien jamais ouvert après 7 jours, inscription pas finie après 30 jours.
create function app.purge_prepared_signups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.prepared_signups ps
  where ps.converted_at is null
    and ((ps.opened_at is null and ps.expires_at <= now())
      or ps.created_at < now() - interval '30 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function app.purge_prepared_signups() from public, anon, authenticated;

select cron.schedule('menao-purge-inscriptions-preparees', '50 3 * * *', 'select app.purge_prepared_signups()');
