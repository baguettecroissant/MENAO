-- Recrutement des commerciaux, lot 79 (F-183, ADR 0382) : la candidature se fait avec un CV
-- (PDF, obligatoire) et, si le candidat le souhaite, son profil LinkedIn ; plus de réservation de
-- réunion juste après l'envoi : l'équipe lit chaque CV et propose un entretien. Les réunions
-- d'information restent possibles depuis le back-office.
-- - Le CV est déposé par le navigateur du candidat (session anonyme) dans « uploads », puis vérifié
--   et rangé par process-upload dans le stockage privé « candidate-cvs/<compte>/<fichier>.pdf ».
--   apply_as_commercial n'accepte qu'un CV rangé dans le dossier du compte qui candidate, une seule
--   fois. Lecture et suppression : administrateurs seulement (URL signées).
-- - Conservation : la candidature et son CV sont supprimés 2 ans après le dernier échange ; la base
--   ne supprime pas les fichiers elle-même (API de stockage) : le CV d'une candidature supprimée
--   entre dans une file, vidée par le back-office (liste des candidats).
-- - E-mail de bonne réception au candidat (recrutement_recue).

alter table public.commercial_candidates
  add column cv_path text unique
    check (cv_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'),
  add column linkedin_url text
    check (char_length(linkedin_url) <= 300
      and linkedin_url ~* '^https://([a-z]{2,3}\.)?linkedin\.com/[^\s]+$');

-- ---------------------------------------------------------------------------------------------
-- Stockage privé des CV : 5 Mo, PDF seulement ; rangé par process-upload (clé serveur).
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('candidate-cvs', 'candidate-cvs', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "candidate-cvs : lecture par un admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'candidate-cvs' and (select app.is_admin()));
create policy "candidate-cvs : suppression par un admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'candidate-cvs' and (select app.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- File des CV à supprimer (candidature supprimée : purge des 2 ans, ou à la main)
-- ---------------------------------------------------------------------------------------------
create table public.candidate_cv_deletions (
  cv_path text primary key,
  created_at timestamptz not null default now()
);
alter table public.candidate_cv_deletions enable row level security;
revoke all on public.candidate_cv_deletions from anon, authenticated;
grant select on public.candidate_cv_deletions to authenticated;
create policy "candidate_cv_deletions : lecture par un admin"
  on public.candidate_cv_deletions for select to authenticated
  using ((select app.is_admin()));

create function app.queue_candidate_cv_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cv_path is not null then
    insert into public.candidate_cv_deletions (cv_path) values (old.cv_path) on conflict do nothing;
  end if;
  return old;
end;
$$;
revoke execute on function app.queue_candidate_cv_deletion() from public, anon, authenticated;

create trigger commercial_candidates_cv_deletion after delete on public.commercial_candidates
  for each row execute function app.queue_candidate_cv_deletion();

-- CV effacés du stockage par le back-office : retirés de la file.
create function public.admin_cv_deletions_done(p_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  delete from public.candidate_cv_deletions where cv_path = any (coalesce(p_paths, '{}'));
end;
$$;
revoke execute on function public.admin_cv_deletions_done(text[]) from public, anon;
grant execute on function public.admin_cv_deletions_done(text[]) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Candidature avec CV
-- ---------------------------------------------------------------------------------------------
drop function public.apply_as_commercial(text, text, text, text, text, text, boolean, text, text,
  text, text, boolean);

-- Mêmes règles qu'avant (lot 77), plus : CV obligatoire, rangé dans le dossier du compte qui
-- candidate (session anonyme du navigateur) et jamais déjà utilisé ; profil LinkedIn facultatif.
-- Envoie l'e-mail de bonne réception.
create function public.apply_as_commercial(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_sector text,
  p_legal_status text,
  p_sees_artisans boolean,
  p_experience text,
  p_availability text,
  p_source text,
  p_motivation text,
  p_consent boolean,
  p_cv_path text,
  p_linkedin_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_last_name text := btrim(coalesce(p_last_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_sector text := btrim(coalesce(p_sector, ''));
  v_motivation text := nullif(btrim(coalesce(p_motivation, '')), '');
  v_linkedin text := nullif(btrim(coalesce(p_linkedin_url, '')), '');
  v_cv text := btrim(coalesce(p_cv_path, ''));
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_token uuid;
begin
  if p_consent is not true then
    raise exception 'Cochez la case pour que nous puissions traiter votre candidature.'
      using errcode = '22023';
  end if;
  if char_length(v_first_name) not between 1 and 60 or char_length(v_last_name) not between 1 and 60 then
    raise exception 'Indiquez votre prénom et votre nom.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de téléphone invalide.' using errcode = '22023';
  end if;
  if char_length(v_sector) not between 2 and 120 then
    raise exception 'Indiquez la ville ou le secteur où vous aimeriez travailler.' using errcode = '22023';
  end if;
  if p_sees_artisans is null
    or coalesce(p_legal_status, '') not in ('auto_entrepreneur', 'societe', 'aucun')
    or coalesce(p_experience, '') not in ('aucune', 'moins_2_ans', 'plus_2_ans')
    or coalesce(p_availability, '') not in ('temps_plein', 'temps_partiel')
    or coalesce(p_source, '') not in ('linkedin', 'facebook', 'indeed', 'leboncoin', 'bouche_a_oreille', 'autre')
  then
    raise exception 'Répondez à toutes les questions du formulaire.' using errcode = '22023';
  end if;
  if char_length(v_motivation) > 1000 then
    raise exception 'Votre message est trop long.' using errcode = '22023';
  end if;
  if v_linkedin is not null and (char_length(v_linkedin) > 300
      or v_linkedin !~* '^https://([a-z]{2,3}\.)?linkedin\.com/[^\s]+$') then
    raise exception 'Lien LinkedIn invalide : copiez l''adresse de votre profil.' using errcode = '22023';
  end if;
  if v_uid is null or v_cv = ''
    or split_part(v_cv, '/', 1) <> v_uid::text
    or not exists (select 1 from storage.objects o where o.bucket_id = 'candidate-cvs' and o.name = v_cv)
    or exists (select 1 from public.commercial_candidates c where c.cv_path = v_cv)
  then
    raise exception 'Ajoutez votre CV en PDF.' using errcode = '22023';
  end if;
  if (select count(*) from public.commercial_candidates
      where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Trop de candidatures reçues en ce moment. Réessayez dans une heure.'
      using errcode = '22023';
  end if;
  if exists (select 1 from public.commercial_candidates
             where (email = v_email or phone = v_phone)
               and created_at > now() - interval '90 days') then
    raise exception 'Nous avons déjà votre candidature : l''équipe revient vers vous très vite.'
      using errcode = '22023';
  end if;
  insert into public.commercial_candidates (first_name, last_name, email, phone, sector,
    legal_status, sees_artisans, experience, availability, source, motivation, cv_path, linkedin_url)
  values (v_first_name, v_last_name, v_email, v_phone, v_sector, p_legal_status, p_sees_artisans,
    p_experience, p_availability, p_source, v_motivation, v_cv, v_linkedin)
  returning id, booking_token into v_id, v_token;
  perform app.notify_candidate(v_id, 'recrutement_recue', '{}'::jsonb);
  return v_token;
end;
$$;
revoke execute on function public.apply_as_commercial(text, text, text, text, text, text, boolean,
  text, text, text, text, boolean, text, text) from public, anon;
grant execute on function public.apply_as_commercial(text, text, text, text, text, text, boolean,
  text, text, text, text, boolean, text, text) to authenticated;
