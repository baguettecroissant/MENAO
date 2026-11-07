-- Rappels automatiques aux clients par SMS, lot 6 des agents IA (F-88, ADR 0239). Premium
-- (`plans.limites.agents.rappels` = 'sms') et Entreprise ('appel' : SMS aujourd'hui, appel plus
-- tard).
--
-- Les rappels au client existent déjà par e-mail et notification, pour toutes les formules :
-- veille du rendez-vous, veille du démarrage, acompte à régler (J+2 et relances du lot 5),
-- demande d'avis. Pour ces formules, chaque rappel part aussi par SMS sur le portable donné par
-- le client dans sa demande, au nom de l'entreprise, selon les réglages de l'artisan et dans la
-- limite des SMS inclus chaque mois. Le numéro n'est jamais stocké dans la notification : il est
-- lu au moment de l'envoi. Envoi par Brevo (fonction notify, NotificationProvider, règle 14).
-- TODO(legal) : SMS de service à un particulier au nom de l'artisan ; contrat de sous-traitance
-- avec Brevo (données d'un client de l'artisan).

-- SMS inclus chaque mois (réglables en base, sans redéploiement).
update public.plans set limites = jsonb_set(limites, '{agents,sms_mois}', '0') where code = 'base';
update public.plans set limites = jsonb_set(limites, '{agents,sms_mois}', '100') where code = 'premium';
update public.plans set limites = jsonb_set(limites, '{agents,sms_mois}', '300') where code = 'entreprise';

-- ---------------------------------------------------------------------------
-- Réglages de l'artisan : rendez-vous et démarrage activés par défaut, acompte et avis à activer.
-- ---------------------------------------------------------------------------
create table public.client_reminder_settings (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  rdv boolean not null default true,
  demarrage boolean not null default true,
  acompte boolean not null default false,
  avis boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.client_reminder_settings enable row level security;
revoke all on public.client_reminder_settings from anon, authenticated;
grant select on public.client_reminder_settings to authenticated;
create policy "client_reminder_settings : lecture par l'artisan"
  on public.client_reminder_settings for select to authenticated
  using (artisan_id = (select app.my_artisan_id()));

create function public.save_client_reminder_settings(
  p_rdv boolean,
  p_demarrage boolean,
  p_acompte boolean,
  p_avis boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  if coalesce(app.artisan_agents(v_artisan) -> 'agents' ->> 'rappels', 'non') = 'non' then
    raise exception 'Les rappels par SMS sont inclus dans les formules Premium et Entreprise.'
      using errcode = '42501';
  end if;
  insert into public.client_reminder_settings (artisan_id, rdv, demarrage, acompte, avis)
  values (v_artisan, coalesce(p_rdv, true), coalesce(p_demarrage, true), coalesce(p_acompte, false),
    coalesce(p_avis, false))
  on conflict (artisan_id) do update set
    rdv = excluded.rdv, demarrage = excluded.demarrage, acompte = excluded.acompte,
    avis = excluded.avis, updated_at = now();
end;
$$;
revoke execute on function public.save_client_reminder_settings(boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.save_client_reminder_settings(boolean, boolean, boolean, boolean) to authenticated;

-- SMS du mois (heure de Paris) d'un artisan : envoyés ou en cours, pas les échecs ni les ignorés.
create function app.artisan_sms_used(p_artisan_id uuid, p_at timestamptz default now())
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.notifications n
  where n.channel = 'sms'
    and n.data ->> 'artisan_id' = p_artisan_id::text
    and n.status in ('a_envoyer', 'en_cours', 'envoyee')
    and n.created_at >= (app.paris_month(p_at)::timestamp at time zone 'Europe/Paris')
$$;
revoke execute on function app.artisan_sms_used(uuid, timestamptz) from public, anon, authenticated;

-- « Rappels à vos clients » (Ma formule) : droit, réglages et SMS du mois.
create function public.my_client_reminders()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with a as (select app.my_artisan_id() as id),
  g as (select a.id, app.artisan_agents(a.id) as agents from a where a.id is not null)
  select jsonb_build_object(
    'inclus', coalesce(g.agents -> 'agents' ->> 'rappels', 'non') <> 'non',
    'sms_inclus', coalesce((g.agents -> 'agents' ->> 'sms_mois')::int, 0),
    'sms_utilises', app.artisan_sms_used(g.id),
    'rdv', coalesce(s.rdv, true),
    'demarrage', coalesce(s.demarrage, true),
    'acompte', coalesce(s.acompte, false),
    'avis', coalesce(s.avis, false)
  )
  from g
  left join public.client_reminder_settings s on s.artisan_id = g.id
$$;
revoke execute on function public.my_client_reminders() from public, anon;
grant execute on function public.my_client_reminders() to authenticated;

-- ---------------------------------------------------------------------------
-- Copie SMS d'un rappel au client : formule, réglage, portable français, SMS restants.
-- ---------------------------------------------------------------------------
create function app.copy_reminder_as_sms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chantiers;
  v_agents jsonb;
  v_kind text;
  v_enabled boolean;
  v_phone text;
  v_company text;
begin
  v_kind := case new.type
    when 'rdv_rappel' then 'rdv'
    when 'demarrage_rappel' then 'demarrage'
    when 'acompte_relance' then 'acompte'
    when 'paiement_relance' then 'acompte'
    when 'avis_relance' then 'avis'
  end;
  if v_kind is null or new.data ->> 'chantier_id' is null then
    return new;
  end if;
  select * into c from public.chantiers where id = (new.data ->> 'chantier_id')::uuid;
  -- Seulement le rappel adressé au client du chantier (pas la copie de l'artisan).
  if c.id is null or c.particulier_id <> new.user_id then
    return new;
  end if;
  v_agents := app.artisan_agents(c.artisan_id);
  if coalesce(v_agents -> 'agents' ->> 'rappels', 'non') = 'non' then
    return new;
  end if;
  select case v_kind
      when 'rdv' then coalesce(s.rdv, true)
      when 'demarrage' then coalesce(s.demarrage, true)
      when 'acompte' then coalesce(s.acompte, false)
      else coalesce(s.avis, false)
    end into v_enabled
  from (select 1) x
  left join public.client_reminder_settings s on s.artisan_id = c.artisan_id;
  if not v_enabled then
    return new;
  end if;
  select r.contact_phone into v_phone from public.requests r where r.id = c.request_id;
  if v_phone is null or v_phone !~ '^\+33[67][0-9]{8}$' then
    return new;
  end if;
  if app.artisan_sms_used(c.artisan_id) >= coalesce((v_agents -> 'agents' ->> 'sms_mois')::int, 0) then
    return new;
  end if;
  select coalesce(a.nom_commercial, a.raison_sociale, app.artisan_display_name(a.id)) into v_company
  from public.artisans a where a.id = c.artisan_id;
  insert into public.notifications (user_id, type, channel, data, send_after)
  values (new.user_id, new.type, 'sms',
    new.data || jsonb_build_object('artisan_id', c.artisan_id, 'entreprise', v_company),
    new.send_after);
  return new;
end;
$$;
revoke execute on function app.copy_reminder_as_sms() from public, anon, authenticated;
create trigger notifications_copy_reminder_as_sms
  after insert on public.notifications
  for each row
  when (new.channel = 'email' and new.type in ('rdv_rappel', 'demarrage_rappel', 'acompte_relance', 'paiement_relance', 'avis_relance'))
  execute function app.copy_reminder_as_sms();

-- ---------------------------------------------------------------------------
-- Envoi des SMS (fonction notify, service_role) : lot verrouillé, portable lu au moment de
-- l'envoi dans la demande du chantier. Préférences du client respectées comme pour l'e-mail.
-- ---------------------------------------------------------------------------
create function public.claim_sms_notifications(p_limit int default 20)
returns table (
  id uuid,
  type public.notification_type,
  data jsonb,
  phone text
)
language sql
security definer
set search_path = ''
as $$
  with skipped as (
    update public.notifications n
    set status = 'ignoree', updated_at = now()
    where n.channel = 'sms' and n.status = 'a_envoyer' and n.send_after <= now()
      and not app.email_wanted(n.user_id, n.type)
    returning n.id
  ),
  picked as (
    select n.id from public.notifications n
    where n.channel = 'sms'
      and n.attempts < 5
      and ((n.status = 'a_envoyer' and n.send_after <= now())
           or (n.status = 'en_cours' and n.locked_at < now() - interval '10 minutes'))
      and app.email_wanted(n.user_id, n.type)
    order by n.created_at, n.id
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.notifications n
    set status = 'en_cours', attempts = n.attempts + 1, locked_at = now()
    from picked
    where n.id = picked.id
    returning n.id, n.type, n.data
  )
  select c.id, c.type, c.data, r.contact_phone
  from claimed c
  left join public.chantiers ch on ch.id = (c.data ->> 'chantier_id')::uuid
  left join public.requests r on r.id = ch.request_id
$$;
revoke execute on function public.claim_sms_notifications(int) from public, anon, authenticated;
grant execute on function public.claim_sms_notifications(int) to service_role;

-- La fonction notify est appelée aussi quand des SMS attendent.
create or replace function app.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.notifications
    where channel in ('email', 'sms')
      and attempts < 5
      and ((status = 'a_envoyer' and send_after <= now())
           or (status = 'en_cours' and locked_at < now() - interval '10 minutes'))
  ) and not exists (
    select 1 from public.notifications
    where push_attempts < 3
      and ((push_status = 'a_envoyer')
           or (push_status = 'en_cours' and push_locked_at < now() - interval '10 minutes'))
  ) and not exists (
    select 1 from public.message_pushes
    where attempts < 3
      and created_at >= now() - interval '1 hour'
      and (status = 'a_envoyer' or (status = 'en_cours' and locked_at < now() - interval '2 minutes'))
  ) then
    return;
  end if;
  perform app.kick_notify();
end;
$$;

-- Centre de notifications (ADR 0033) : la copie SMS d'un rappel n'y figure pas (l'original y est).
create or replace function public.my_notifications(p_limit int default 50)
returns table (
  notification_id uuid,
  type public.notification_type,
  data jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.type, n.data, n.created_at, n.read_at
  from public.notifications n
  where n.user_id = auth.uid() and n.channel <> 'sms'
  order by n.created_at desc, n.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

create or replace function public.my_unread_notifications()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.notifications
  where user_id = auth.uid() and read_at is null and channel <> 'sms'
$$;
