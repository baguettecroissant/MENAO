-- Candidature des commerciaux : CV facultatif (F-187, ADR 0386), décision du 23/11/2026.
-- Sans CV, la candidature est reçue ; un CV joint garde les mêmes contrôles (rangé dans le dossier
-- du compte qui candidate, présent dans le stockage, jamais déjà utilisé). Le reste ne change pas.
-- CREATE OR REPLACE : même signature, droits conservés.

create or replace function public.apply_as_commercial(
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
  v_cv text := nullif(btrim(coalesce(p_cv_path, '')), '');
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
  if v_uid is null then
    raise exception 'Session expirée : rechargez la page pour envoyer votre candidature.'
      using errcode = '22023';
  end if;
  if v_cv is not null and (split_part(v_cv, '/', 1) <> v_uid::text
    or not exists (select 1 from storage.objects o where o.bucket_id = 'candidate-cvs' and o.name = v_cv)
    or exists (select 1 from public.commercial_candidates c where c.cv_path = v_cv))
  then
    raise exception 'Votre CV n''a pas pu être joint : choisissez-le à nouveau, en PDF.'
      using errcode = '22023';
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
