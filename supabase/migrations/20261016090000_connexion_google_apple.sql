-- Connexion avec Google ou Apple pour les clients (ADR 0108). Un compte créé ainsi est un compte
-- particulier, sans acceptation des CGU ni téléphone : il porte le marqueur `signup_pending` dans
-- app_metadata (lisible dans le jeton, jamais modifiable par l'utilisateur, règle 7) jusqu'à
-- « Finaliser mon compte » (complete_oauth_signup). Les artisans s'inscrivent toujours par
-- e-mail : SIRET et CGV à l'inscription (ADR 0006).

-- Rôle par défaut et marqueur des comptes Google et Apple.
create or replace function app.before_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := nullif(new.raw_app_meta_data ->> 'role', '');
begin
  if requested is null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role',
      case when new.raw_user_meta_data ->> 'account_type' = 'artisan' then 'artisan_en_attente' else 'particulier' end
    );
  elsif not app.is_valid_role(requested) then
    raise exception 'Rôle inconnu : %', requested using errcode = '22023';
  end if;
  if new.raw_app_meta_data ->> 'provider' in ('google', 'apple') then
    new.raw_app_meta_data := new.raw_app_meta_data || '{"signup_pending": true}'::jsonb;
  end if;
  return new;
end;
$$;

-- Profil : prénom et nom de l'inscription, sinon ceux de Google ou Apple (given_name et
-- family_name, ou nom complet coupé au premier espace). Apple ne les donne qu'à la première
-- connexion, et seulement si l'utilisateur l'accepte : « Finaliser mon compte » les complète.
create or replace function app.after_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  phone text := meta ->> 'phone';
  v_siret text := meta ->> 'siret';
  v_role public.app_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  v_full text := btrim(coalesce(meta ->> 'full_name', meta ->> 'name', ''));
  v_first text := coalesce(nullif(btrim(meta ->> 'first_name'), ''), nullif(btrim(meta ->> 'given_name'), ''));
  v_last text := coalesce(nullif(btrim(meta ->> 'last_name'), ''), nullif(btrim(meta ->> 'family_name'), ''));
begin
  if v_first is null and v_last is null and v_full <> '' and v_full !~ '@' then
    v_first := split_part(v_full, ' ', 1);
    v_last := nullif(btrim(substr(v_full, char_length(v_first) + 1)), '');
  end if;

  insert into public.profiles (user_id, role, first_name, last_name, phone, marketing_opt_in)
  values (
    new.id,
    v_role,
    nullif(left(v_first, 100), ''),
    nullif(left(v_last, 100), ''),
    case when phone ~ '^\+[1-9][0-9]{7,14}$' then phone end,
    coalesce(meta -> 'marketing_opt_in' = 'true'::jsonb, false)
  );

  insert into public.legal_acceptances (user_id, document, version)
  select new.id, d.key::public.legal_document, left(btrim(d.value), 50)
  from jsonb_each_text(
    case when jsonb_typeof(meta -> 'legal') = 'object' then meta -> 'legal' else '{}'::jsonb end
  ) as d
  where d.key = any (enum_range(null::public.legal_document)::text[])
    and nullif(btrim(d.value), '') is not null;

  -- Fiche artisan en brouillon. Un SIRET invalide ou déjà utilisé n'est pas repris :
  -- l'artisan le saisira à l'étape « Entreprise ».
  if v_role = 'artisan_en_attente' then
    insert into public.artisans (user_id, siret)
    values (
      new.id,
      case
        when app.is_valid_siret(v_siret)
          and not exists (select 1 from public.artisans a where a.siret = v_siret)
        then v_siret
      end
    );
  end if;

  update auth.users
  set raw_user_meta_data = raw_user_meta_data
    - array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type']
  where id = new.id
    and raw_user_meta_data ?| array['phone', 'marketing_opt_in', 'legal', 'siret', 'account_type'];

  return null;
end;
$$;

-- « Finaliser mon compte » : prénom, nom, téléphone facultatif, acceptation des CGU et de la
-- politique de confidentialité (versions en vigueur, envoyées par le site ou l'application comme
-- à l'inscription), newsletters. Une seule fois, par le titulaire d'un compte Google ou Apple.
-- Le jeton doit ensuite être rafraîchi pour ne plus porter le marqueur.
create function public.complete_oauth_signup(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_marketing_opt_in boolean,
  p_legal jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_first text := btrim(coalesce(p_first_name, ''));
  v_last text := btrim(coalesce(p_last_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if v_user is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = v_user and u.raw_app_meta_data -> 'signup_pending' = 'true'::jsonb
  ) then
    raise exception 'Votre compte est déjà finalisé.' using errcode = '22023';
  end if;
  if char_length(v_first) not between 1 and 100 or char_length(v_last) not between 1 and 100 then
    raise exception 'Indiquez votre prénom et votre nom.' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_legal) is distinct from 'object'
     or nullif(btrim(p_legal ->> 'cgu'), '') is null
     or nullif(btrim(p_legal ->> 'confidentialite'), '') is null then
    raise exception 'Acceptez les conditions d''utilisation et la politique de confidentialité.'
      using errcode = '22023';
  end if;

  update public.profiles
  set first_name = left(v_first, 100), last_name = left(v_last, 100), phone = v_phone,
      marketing_opt_in = coalesce(p_marketing_opt_in, false)
  where user_id = v_user;

  insert into public.legal_acceptances (user_id, document, version)
  select v_user, d.key::public.legal_document, left(btrim(d.value), 50)
  from jsonb_each_text(p_legal) as d
  where d.key in ('cgu', 'confidentialite') and nullif(btrim(d.value), '') is not null
  on conflict (user_id, document, version) do nothing;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data - 'signup_pending'
  where id = v_user;
end;
$$;
revoke execute on function public.complete_oauth_signup(text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.complete_oauth_signup(text, text, text, boolean, jsonb) to authenticated;

-- Supabase Auth réécrit parfois app_metadata depuis sa copie en mémoire, sans le rôle posé par
-- before_auth_user_insert : création par l'API d'administration ou par « Add user » du tableau
-- de bord (fournisseurs mis à jour juste après l'insertion). Le rôle est alors conservé, au lieu
-- d'être refusé par after_auth_user_role_update. Un changement de rôle reste toujours possible.
create function app.before_auth_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(new.raw_app_meta_data ->> 'role', '') is null
     and nullif(old.raw_app_meta_data ->> 'role', '') is not null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', old.raw_app_meta_data ->> 'role');
  end if;
  return new;
end;
$$;
revoke execute on function app.before_auth_user_update() from public, anon, authenticated;
create trigger before_auth_user_update
  before update of raw_app_meta_data on auth.users
  for each row execute function app.before_auth_user_update();
