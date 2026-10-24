-- Notifications manquantes (F-41, ADR 0183), relevées par l'audit du 24 octobre 2026 : chaque
-- étape importante prévient désormais la personne concernée, par e-mail, en push (application) et
-- dans le centre de notifications, avec les mêmes textes (@menao/emails).
-- 1. Demande envoyée : confirmation au particulier (une seule par envoi).
-- 2. Dossier envoyé : accusé de réception à l'artisan.
-- 3. Devis sans réponse : relances du client (3 jours après l'envoi, 3 jours avant la fin de
--    validité) et devis expiré : l'artisan est prévenu.
-- 4. Réponse de l'artisan à un avis : le client est prévenu.
-- 5. Démarrage des travaux demain : rappel au client et à l'artisan.
-- 6. Filleul validé : le parrain est prévenu.

-- Relances et rappels facultatifs (préférence « rappels »), réponse à un avis et filleul validé
-- dans « activité » ; les autres restent transactionnelles (toujours envoyées).
create or replace function app.notification_category(p_type public.notification_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'chantier_nouveautes' then 'activite'
    when 'nouveaux_messages' then 'activite'
    when 'recommandation_partenaire' then 'activite'
    when 'avis_reponse' then 'activite'
    when 'filleul_valide' then 'activite'
    when 'rdv_rappel' then 'rappels'
    when 'avis_relance' then 'rappels'
    when 'levee_relance' then 'rappels'
    when 'acompte_relance' then 'rappels'
    when 'planning_relance' then 'rappels'
    when 'inscription_relance' then 'rappels'
    when 'parrainage_suggestion' then 'rappels'
    when 'devis_relance' then 'rappels'
    when 'demarrage_rappel' then 'rappels'
    else 'transactionnel'
  end
$$;
revoke execute on function app.notification_category(public.notification_type) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Demande envoyée : confirmation au particulier
-- ---------------------------------------------------------------------------
-- Déclencheur différé : il s'exécute à la validation de l'envoi, quand toutes les demandes sont
-- créées (un chantier à plusieurs métiers en crée pour chaque lot). La première demande de l'envoi
-- prévient le client avec le nombre d'artisans contactés ; les suivantes trouvent la notification
-- de la même transaction. Seules les demandes transmises comptent : une demande retenue pour
-- vérification (« a_verifier ») ne se révèle pas.
create function app.requests_notify_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_root uuid;
  v_title text;
  v_count integer;
begin
  if new.status <> 'envoyee' then
    return null;
  end if;
  select coalesce(p.parent_project_id, p.id) into v_root
  from public.projects p where p.id = new.project_id;
  if v_root is null or exists (
    select 1 from public.notifications n
    where n.user_id = new.particulier_id and n.type = 'demande_envoyee'
      and n.data ->> 'project_id' = v_root::text and n.created_at = now()
  ) then
    return null;
  end if;
  select count(*) into v_count
  from public.requests r
  join public.projects p on p.id = r.project_id
  where coalesce(p.parent_project_id, p.id) = v_root
    and r.particulier_id = new.particulier_id
    and r.status = 'envoyee' and r.created_at = now();
  select coalesce(nullif(btrim(p.summary), ''), left(p.description, 80)) into v_title
  from public.projects p where p.id = v_root;
  perform app.notify(new.particulier_id, 'demande_envoyee', jsonb_build_object(
    'project_id', v_root,
    'titre', v_title,
    'nb', v_count
  ));
  return null;
end;
$$;
revoke execute on function app.requests_notify_sent() from public, anon, authenticated;
create constraint trigger requests_notify_sent after insert on public.requests
  deferrable initially deferred
  for each row execute function app.requests_notify_sent();

-- ---------------------------------------------------------------------------
-- 2. Dossier envoyé : accusé de réception à l'artisan (en plus des admins, ADR 0050)
-- ---------------------------------------------------------------------------
create or replace function app.artisans_notify_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'en_verification' and new.submitted_at is not null
    and (old.status is distinct from new.status or old.submitted_at is distinct from new.submitted_at)
  then
    perform app.notify(p.user_id, 'equipe_dossier_a_verifier', jsonb_build_object(
      'artisan_id', new.id, 'entreprise', coalesce(new.nom_commercial, new.raison_sociale)
    ))
    from public.profiles p
    where p.role = 'admin';
    perform app.notify(new.user_id, 'dossier_envoye', jsonb_build_object(
      'renvoi', old.status = 'refuse' or old.submitted_at is not null
    ));
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Devis sans réponse et devis expiré
-- ---------------------------------------------------------------------------
-- Tâche quotidienne (p_now : instant de référence, tests). Dernière version envoyée du devis d'un
-- chantier encore en attente de réponse :
-- - 3 jours après l'envoi sans réponse : relance du client (« sans_reponse ») ;
-- - 3 jours avant la fin de validité : relance du client (« expire_bientot ») ;
-- - validité dépassée depuis moins de 7 jours : l'artisan est prévenu (« devis_expire »).
-- Une seule notification de chaque sorte par devis.
create function app.remind_quotes(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_today date := (p_now at time zone 'Europe/Paris')::date;
  v_count integer := 0;
begin
  for r in
    select q.id as quote_id, q.sent_at, q.valid_until, c.id as chantier_id, c.title,
      c.particulier_id, c.artisan_id, a.user_id as artisan_user,
      nullif(concat_ws(' ', cp.first_name, cp.last_name), '') as client
    from public.quotes q
    join public.chantiers c on c.id = q.chantier_id
    join public.artisans a on a.id = c.artisan_id
    left join public.profiles cp on cp.user_id = c.particulier_id
    where q.status = 'envoye' and q.sent_at is not null and q.valid_until is not null
      and c.status in ('devis_envoye', 'devis_en_revision')
      and not exists (
        select 1 from public.quotes newer
        where newer.chantier_id = q.chantier_id and newer.version > q.version
      )
  loop
    if r.valid_until >= v_today then
      if r.valid_until = v_today + 3 and not exists (
        select 1 from public.notifications n
        where n.type = 'devis_relance' and n.data ->> 'quote_id' = r.quote_id::text
          and n.data ->> 'moment' = 'expire_bientot'
      ) then
        perform app.notify(r.particulier_id, 'devis_relance', jsonb_build_object(
          'moment', 'expire_bientot', 'quote_id', r.quote_id, 'chantier_id', r.chantier_id,
          'titre', r.title, 'artisan', app.artisan_display_name(r.artisan_id),
          'date_fin', r.valid_until
        ));
        v_count := v_count + 1;
      elsif r.sent_at <= p_now - interval '3 days' and r.valid_until > v_today + 3 and not exists (
        select 1 from public.notifications n
        where n.type = 'devis_relance' and n.data ->> 'quote_id' = r.quote_id::text
          and n.data ->> 'moment' = 'sans_reponse'
      ) then
        perform app.notify(r.particulier_id, 'devis_relance', jsonb_build_object(
          'moment', 'sans_reponse', 'quote_id', r.quote_id, 'chantier_id', r.chantier_id,
          'titre', r.title, 'artisan', app.artisan_display_name(r.artisan_id),
          'date_fin', r.valid_until
        ));
        v_count := v_count + 1;
      end if;
    elsif r.valid_until >= v_today - 7 and not exists (
      select 1 from public.notifications n
      where n.type = 'devis_expire' and n.data ->> 'quote_id' = r.quote_id::text
    ) then
      perform app.notify(r.artisan_user, 'devis_expire', jsonb_build_object(
        'quote_id', r.quote_id, 'chantier_id', r.chantier_id, 'titre', r.title,
        'client', r.client, 'date_fin', r.valid_until
      ));
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_quotes(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-relance-devis', '0 9 * * *', 'select app.remind_quotes()');

-- ---------------------------------------------------------------------------
-- 4. Réponse de l'artisan à un avis : le client est prévenu (une réponse unique, F-28)
-- ---------------------------------------------------------------------------
create function app.reviews_notify_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.reply is null and new.reply is not null then
    perform app.notify(new.particulier_id, 'avis_reponse', jsonb_build_object(
      'chantier_id', new.chantier_id,
      'titre', (select c.title from public.chantiers c where c.id = new.chantier_id),
      'artisan', app.artisan_display_name(new.artisan_id),
      'reponse', new.reply
    ));
  end if;
  return null;
end;
$$;
revoke execute on function app.reviews_notify_reply() from public, anon, authenticated;
create trigger reviews_notify_reply after update of reply on public.reviews
  for each row execute function app.reviews_notify_reply();

-- ---------------------------------------------------------------------------
-- 5. Démarrage des travaux demain : rappel au client et à l'artisan
-- ---------------------------------------------------------------------------
-- Tâche quotidienne : chantiers planifiés dont le démarrage tombe le lendemain (heure de Paris).
-- Un rappel par chantier et par date de démarrage (une date modifiée en redonne un).
create function app.remind_chantier_starts(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_tomorrow date := (p_now at time zone 'Europe/Paris')::date + 1;
  v_count integer := 0;
begin
  for r in
    select c.id, c.title, c.particulier_id, c.artisan_id, c.start_at,
      coalesce(c.adresse, nullif(concat_ws(' ', c.code_postal, c.ville_nom), '')) as adresse,
      nullif(concat_ws(' ', cp.first_name, cp.last_name), '') as client
    from public.chantiers c
    left join public.profiles cp on cp.user_id = c.particulier_id
    where c.status = 'planifie' and c.start_at is not null
      and (c.start_at at time zone 'Europe/Paris')::date = v_tomorrow
      and not exists (
        select 1 from public.notifications n
        where n.type = 'demarrage_rappel' and n.data ->> 'chantier_id' = c.id::text
          and n.data -> 'demarrage' = to_jsonb(c.start_at)
      )
  loop
    perform app.notify(r.particulier_id, 'demarrage_rappel', jsonb_build_object(
      'destinataire', 'client', 'chantier_id', r.id, 'titre', r.title,
      'artisan', app.artisan_display_name(r.artisan_id), 'demarrage', r.start_at
    ));
    perform app.notify(a.user_id, 'demarrage_rappel', jsonb_build_object(
      'destinataire', 'artisan', 'chantier_id', r.id, 'titre', r.title,
      'client', r.client, 'adresse', r.adresse, 'demarrage', r.start_at
    ))
    from public.artisans a where a.id = r.artisan_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_chantier_starts(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-rappel-demarrage', '0 8 * * *', 'select app.remind_chantier_starts()');

-- ---------------------------------------------------------------------------
-- 6. Filleul validé : le parrain est prévenu (une fois, parrainage non annulé)
-- ---------------------------------------------------------------------------
-- Même entreprise que le parrain (même SIREN) : le parrainage est annulé à la validation
-- (app.referral_on_validation, ADR 0154), donc pas de notification.
create function app.artisans_notify_referrer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'valide' and old.status is distinct from new.status then
    perform app.notify(p.user_id, 'filleul_valide', jsonb_build_object(
      'artisan_id', new.id,
      'filleul', coalesce(new.nom_commercial, new.raison_sociale)
    ))
    from public.artisan_referrals ar
    join public.artisans p on p.id = ar.referrer_artisan_id
    where ar.referred_artisan_id = new.id and ar.status <> 'annule'
      and (new.siren is null or new.siren is distinct from p.siren)
      and not exists (
        select 1 from public.notifications n
        where n.type = 'filleul_valide' and n.data ->> 'artisan_id' = new.id::text
      );
  end if;
  return null;
end;
$$;
revoke execute on function app.artisans_notify_referrer() from public, anon, authenticated;
create trigger artisans_notify_referrer after update of status on public.artisans
  for each row execute function app.artisans_notify_referrer();
