-- Relances de l'inscription artisan abandonnée (ADR 0112). Un artisan dont le compte est créé
-- (adresse e-mail confirmée) mais dont le dossier n'est pas envoyé reçoit trois relances au plus,
-- 1, 3 puis 7 jours après la création de sa fiche, vers « Faire vérifier mon entreprise ». Le
-- texte s'adapte : dossier prêt à envoyer, compléments demandés par l'équipe, ou inscription à
-- finir. Rappel facultatif (préférence « rappels »).

create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- Étapes manquantes avant l'envoi du dossier (miroir de canSubmitOnboarding), extraites de
-- submit_artisan_onboarding pour servir aussi aux relances.
create function app.onboarding_missing_steps(p_artisan_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[] := '{}';
begin
  select * into a from public.artisans where id = p_artisan_id;
  if not found then
    return null;
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
  if not exists (
    select 1 from public.artisan_charter_acceptances c
    where c.artisan_id = a.id and c.version = app.current_charter_version()
  ) then
    v_missing := array_append(v_missing, 'charte');
  end if;
  if (
    select count(*) from public.artisan_documents d
    where d.artisan_id = a.id and d.status in ('en_attente', 'valide') and (
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
  return v_missing;
end;
$$;
revoke execute on function app.onboarding_missing_steps(uuid) from public, anon, authenticated;

-- Même fonction qu'avant (ADR 0104), avec les étapes manquantes calculées par la fonction ci-dessus.
create or replace function public.submit_artisan_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.artisans;
  v_missing text[];
begin
  select * into a from public.artisans where user_id = (select auth.uid());
  if not found then
    raise exception 'Aucune fiche artisan pour cet utilisateur.' using errcode = '42501';
  end if;
  if a.status not in ('brouillon', 'refuse') then
    raise exception 'Le dossier a déjà été envoyé.' using errcode = '22023';
  end if;

  v_missing := app.onboarding_missing_steps(a.id);
  if cardinality(v_missing) > 0 then
    raise exception 'Étapes incomplètes : %', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;

-- p_now : instant de référence (tests). Tâche pg_cron quotidienne. Relance n°1 à J+1, n°2 à J+3
-- (au moins 2 jours après la première), n°3 à J+7 (au moins 4 jours après la deuxième) : jamais
-- plus de trois, même pour une fiche ancienne.
create function app.remind_signup(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_offsets interval[] := array[interval '1 day', interval '3 days', interval '7 days'];
  v_gaps interval[] := array[interval '0', interval '2 days', interval '4 days'];
  v_count integer := 0;
begin
  for r in
    select a.id, a.user_id, a.created_at, a.refusal_reason,
           count(n.id)::int as sent, max(n.created_at) as last_sent
    from public.artisans a
    join auth.users u on u.id = a.user_id
    left join public.notifications n on n.user_id = a.user_id and n.type = 'inscription_relance'
    where a.status = 'brouillon'
      and u.email_confirmed_at is not null
    group by a.id
  loop
    continue when r.sent >= 3;
    continue when r.created_at > p_now - v_offsets[r.sent + 1];
    continue when r.last_sent is not null and r.last_sent > p_now - v_gaps[r.sent + 1];
    perform app.notify(r.user_id, 'inscription_relance', jsonb_build_object(
      'etape', r.sent + 1,
      'pret', cardinality(app.onboarding_missing_steps(r.id)) = 0,
      'complement', r.refusal_reason is not null
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_signup(timestamptz) from public, anon, authenticated;
-- Chaque jour à 8 h UTC : 10 h à Paris l'été, 9 h l'hiver.
select cron.schedule('menao-relance-inscription', '0 8 * * *', 'select app.remind_signup()');
