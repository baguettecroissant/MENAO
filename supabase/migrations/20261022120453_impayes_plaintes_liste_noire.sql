-- Côté artisans : impayés, plaintes, liste noire (lot 3 du plan V1.1, ADR 0158 ; « Plan
-- anti-problèmes V2 », points B4, A6 et B9) :
-- - abonnement impayé : relances à J+3 et J+7, profil retiré des recherches à J+15, de nouveau
--   visible dès le paiement (Stripe repasse l'abonnement en « active ») ;
-- - 2 plaintes de clients en 12 mois contre un même artisan : profil suspendu le temps de
--   l'enquête, équipe alertée par une note sur le ticket ;
-- - radiation : SIREN, téléphone et e-mail du radié inscrits sur une liste noire ; un nouveau
--   dossier qui les reprend ne peut pas être envoyé.

-- ---------------------------------------------------------------------------
-- Impayés
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column past_due_since timestamptz;

-- Début de l'impayé : posé au passage en « past_due » ou « unpaid », effacé au retour à la normale.
create function app.subscriptions_past_due_since()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('past_due', 'unpaid') then
    if tg_op = 'INSERT' or old.status not in ('past_due', 'unpaid') then
      new.past_due_since := coalesce(new.past_due_since, now());
    end if;
  else
    new.past_due_since := null;
  end if;
  return new;
end;
$$;
revoke execute on function app.subscriptions_past_due_since() from public, anon, authenticated;
create trigger subscriptions_past_due_since before insert or update of status on public.subscriptions
  for each row execute function app.subscriptions_past_due_since();
update public.subscriptions set past_due_since = updated_at where status in ('past_due', 'unpaid');

-- Abonnement qui rend visible : essai, actif, ou impayé depuis moins de 15 jours
-- (UNPAID_GRACE_DAYS, @menao/core).
create or replace function app.artisan_subscription_active(p_artisan_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.artisan_id = p_artisan_id and (
      s.status in ('trialing', 'active')
      or (s.status = 'past_due' and coalesce(s.past_due_since, now()) > now() - interval '15 days')
    )
  )
$$;

-- Relances : p_now, instant de référence (tests). Tâche pg_cron quotidienne. Étape 1 à J+3,
-- 2 à J+7, 3 à J+15 (profil retiré) ; une seule fois chacune par épisode d'impayé, et seulement la
-- plus avancée si plusieurs sont dues ensemble.
create function app.remind_unpaid_subscriptions(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_step integer;
  v_count integer := 0;
begin
  for r in
    select s.id, s.past_due_since, a.user_id,
      coalesce((
        select max((n.data ->> 'etape')::int) from public.notifications n
        where n.user_id = a.user_id and n.type = 'abonnement_impaye'
          and n.data ->> 'subscription_id' = s.id::text and n.created_at >= s.past_due_since
      ), 0) as sent
    from public.subscriptions s
    join public.artisans a on a.id = s.artisan_id
    where s.status in ('past_due', 'unpaid') and s.past_due_since is not null
  loop
    v_step := case
      when r.past_due_since <= p_now - interval '15 days' then 3
      when r.past_due_since <= p_now - interval '7 days' then 2
      when r.past_due_since <= p_now - interval '3 days' then 1
      else 0
    end;
    continue when v_step <= r.sent;
    perform app.notify(r.user_id, 'abonnement_impaye', jsonb_build_object(
      'etape', v_step,
      'subscription_id', r.id,
      'depuis', r.past_due_since
    ));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.remind_unpaid_subscriptions(timestamptz) from public, anon, authenticated;
-- Chaque jour à 7 h UTC.
select cron.schedule('menao-relance-impayes', '0 7 * * *', 'select app.remind_unpaid_subscriptions()');

-- Paiement de l'abonnement : jamais rappelé dans l'application (CLAUDE.md règle 10), ni en push.
create or replace function app.notifications_push_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.channel = 'email'
     and new.type <> 'abonnement_impaye'
     and exists (select 1 from public.push_tokens t where t.user_id = new.user_id) then
    new.push_status := 'a_envoyer';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Plaintes
-- ---------------------------------------------------------------------------
alter table public.artisans drop constraint artisans_suspension_reason_check;
alter table public.artisans add constraint artisans_suspension_reason_check
  check (suspension_reason in ('documents_expires', 'decision_admin', 'plaintes'));

-- Litige ouvert par un client : à la 2e plainte de clients en 12 mois (chantiers distincts), profil
-- suspendu s'il était visible, artisan prévenu, note pour l'équipe sur le ticket.
create function app.complaints_watch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_count integer;
  v_user uuid;
begin
  if new.type <> 'litige' or new.chantier_id is null then
    return new;
  end if;
  select c.artisan_id into v_artisan
  from public.chantiers c
  where c.id = new.chantier_id and c.particulier_id = new.user_id;
  if v_artisan is null then
    return new;
  end if;
  select count(distinct t.chantier_id) into v_count
  from public.tickets t
  join public.chantiers c on c.id = t.chantier_id
  where t.type = 'litige' and c.artisan_id = v_artisan and t.user_id = c.particulier_id
    and t.created_at >= now() - interval '12 months';
  if v_count < 2 then
    return new;
  end if;
  update public.artisans set status = 'suspendu', suspension_reason = 'plaintes'
  where id = v_artisan and status = 'valide'
  returning user_id into v_user;
  insert into public.ticket_notes (ticket_id, author_id, body)
  values (new.id, null, format('%s plaintes de clients en 12 mois contre cet artisan%s.', v_count,
    case when v_user is not null
      then ' : profil suspendu automatiquement le temps de l''enquête (« Lever la suspension » sur sa fiche)'
      else '' end));
  if v_user is not null then
    perform app.audit('artisan.suspendu', 'artisan', v_artisan,
      jsonb_build_object('motif', 'plaintes', 'plaintes', v_count));
    perform app.notify(v_user, 'compte_suspendu', jsonb_build_object('par', 'plaintes'));
  end if;
  return new;
end;
$$;
revoke execute on function app.complaints_watch() from public, anon, authenticated;
create trigger tickets_complaints_watch after insert on public.tickets
  for each row execute function app.complaints_watch();

-- Levée de la suspension par l'équipe : décision de l'équipe ou enquête sur des plaintes.
create or replace function public.admin_reactivate_artisan(p_artisan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not app.is_admin() then
    raise exception 'Réservé à l''équipe MENAO' using errcode = '42501';
  end if;
  update public.artisans set status = 'valide', suspension_reason = null
  where id = p_artisan_id and status = 'suspendu' and suspension_reason in ('decision_admin', 'plaintes')
    and app.artisan_insurances_valid(id)
  returning user_id into v_user;
  if not found then
    raise exception 'Réactivation impossible : la suspension n''a pas été décidée par l''équipe, ou les assurances ne sont pas à jour.'
      using errcode = '22023';
  end if;
  perform app.audit('artisan.reactive', 'artisan', p_artisan_id, '{}');
  perform app.notify(v_user, 'compte_reactive', jsonb_build_object(
    'par', 'equipe', 'visible', app.artisan_is_visible(p_artisan_id)
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- Liste noire
-- ---------------------------------------------------------------------------
create table public.blocked_identities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('siren', 'telephone', 'email')),
  value text not null check (char_length(value) between 3 and 254),
  artisan_id uuid references public.artisans (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, value)
);
create index blocked_identities_artisan_idx on public.blocked_identities (artisan_id);
alter table public.blocked_identities enable row level security;
revoke all on public.blocked_identities from anon, authenticated;
grant select on public.blocked_identities to authenticated;
create policy "blocked_identities : lecture par l'équipe"
  on public.blocked_identities for select to authenticated using ((select app.is_staff()));

-- Radiation : SIREN, téléphone et e-mail du radié inscrits.
create function app.blacklist_radiated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.blocked_identities (kind, value, artisan_id)
  select x.kind, x.value, new.id
  from (values
    ('siren', new.siren),
    ('telephone', (select p.phone from public.profiles p where p.user_id = new.user_id)),
    ('email', (select lower(u.email) from auth.users u where u.id = new.user_id))
  ) as x (kind, value)
  where x.value is not null
  on conflict (kind, value) do nothing;
  return new;
end;
$$;
revoke execute on function app.blacklist_radiated() from public, anon, authenticated;
create trigger artisans_blacklist_radiated after update of status on public.artisans
  for each row when (new.status = 'radie' and old.status is distinct from 'radie')
  execute function app.blacklist_radiated();

-- Radiés d'avant cette migration.
insert into public.blocked_identities (kind, value, artisan_id)
select x.kind, x.value, a.id
from public.artisans a
left join public.profiles p on p.user_id = a.user_id
left join auth.users u on u.id = a.user_id
cross join lateral (values ('siren', a.siren), ('telephone', p.phone), ('email', lower(u.email))) as x (kind, value)
where a.status = 'radie' and x.value is not null
on conflict (kind, value) do nothing;

-- Identité d'un autre artisan radié : SIREN, téléphone ou e-mail du compte.
create function app.identity_blocked(p_artisan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artisans a
    left join public.profiles p on p.user_id = a.user_id
    left join auth.users u on u.id = a.user_id
    join public.blocked_identities b on b.artisan_id is distinct from a.id and (
      (b.kind = 'siren' and b.value = a.siren)
      or (b.kind = 'telephone' and b.value = p.phone)
      or (b.kind = 'email' and b.value = lower(u.email))
    )
    where a.id = p_artisan_id
  )
$$;
revoke execute on function app.identity_blocked(uuid) from public, anon, authenticated;

-- Envoi du dossier (ADR 0104, 0112) : même fonction, plus la liste noire.
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
  -- Liste noire (ADR 0158) : identité d'un artisan radié.
  if app.identity_blocked(a.id) then
    raise exception 'Votre inscription ne peut pas aboutir. Contactez l''équipe MENAO.' using errcode = '42501';
  end if;

  update public.artisans
  set status = 'en_verification', submitted_at = now(), refusal_reason = null
  where id = a.id;
end;
$$;
