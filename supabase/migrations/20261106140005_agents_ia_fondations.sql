-- Agents IA des formules, lot 1 : les fondations (F-82, ADR 0231).
--
-- Droits par formule : `plans.limites.agents`, réglable en base sans déploiement.
--   - voix_minutes : minutes de voix incluses chaque mois civil (heure de Paris) ;
--   - secretaire, devis_conversation, comptable_avance : agents inclus ;
--   - rappels : 'non', 'sms' ou 'appel' ;
--   - lignes : lignes de secrétaire ;
--   - recharges : la formule peut acheter des minutes.
-- Base garde tous les agents écrits (devis dicté dans l'appli, dépenses, assistant) sans voix ;
-- Premium : 300 minutes ; Entreprise : 1 000 minutes et plusieurs lignes (rapport « Agents IA de
-- MENAO : coûts et formules », validé le 6 novembre 2026).
--
-- Minutes : chaque appel d'un agent vocal pour un artisan est compté une seule fois (identifiant
-- d'appel). Les minutes incluses servent d'abord ; au-delà, les minutes rechargées (lot 2) sont
-- débitées dans un registre. Alerte à 80 % des minutes incluses, puis à épuisement, une fois par
-- mois chacune.

update public.plans set limites = limites || jsonb_build_object('agents', jsonb_build_object(
  'voix_minutes', 0, 'secretaire', false, 'devis_conversation', false, 'comptable_avance', false,
  'rappels', 'non', 'lignes', 0, 'recharges', false
)) where code = 'base';
update public.plans set limites = limites || jsonb_build_object('agents', jsonb_build_object(
  'voix_minutes', 300, 'secretaire', true, 'devis_conversation', true, 'comptable_avance', true,
  'rappels', 'sms', 'lignes', 1, 'recharges', true
)) where code = 'premium';
update public.plans set limites = limites || jsonb_build_object('agents', jsonb_build_object(
  'voix_minutes', 1000, 'secretaire', true, 'devis_conversation', true, 'comptable_avance', true,
  'rappels', 'appel', 'lignes', 3, 'recharges', true
)) where code = 'entreprise';

-- ---------------------------------------------------------------------------
-- Appels comptés
-- ---------------------------------------------------------------------------
create table public.voice_usage (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  call_id text not null unique check (char_length(call_id) between 1 and 100),
  agent text not null check (agent in ('secretaire', 'devis', 'rappel')),
  seconds int not null check (seconds between 0 and 86400),
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now()
);
create index voice_usage_artisan_month_idx on public.voice_usage (artisan_id, month);
alter table public.voice_usage enable row level security;
create policy "voice_usage : lecture par l'artisan ou l'équipe"
  on public.voice_usage for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- Registre des minutes rechargées : recharge (lot 2) ou geste de l'équipe en plus, consommation en
-- moins. En secondes.
create table public.voice_credits (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  seconds int not null check (seconds <> 0 and seconds between -86400 and 1000000),
  reason text not null check (reason in ('recharge', 'geste', 'consommation')),
  reference text check (char_length(reference) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((reason = 'consommation') = (seconds < 0))
);
create index voice_credits_artisan_idx on public.voice_credits (artisan_id);
alter table public.voice_credits enable row level security;
create policy "voice_credits : lecture par l'artisan ou l'équipe"
  on public.voice_credits for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- Alertes déjà envoyées (une par mois et par niveau).
create table public.voice_alerts (
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  month date not null,
  level text not null check (level in ('80', '100')),
  sent_at timestamptz not null default now(),
  primary key (artisan_id, month, level)
);
-- Aucune politique : écrit par app.record_voice_usage seulement.
alter table public.voice_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- Droits et minutes d'un artisan
-- ---------------------------------------------------------------------------
create function app.paris_month(p_at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('month', p_at at time zone 'Europe/Paris')::date
$$;

-- Formule en cours (essai compris, impayé de moins de 15 jours compris), agents inclus et minutes
-- du mois. Sans abonnement actif : aucun agent vocal.
create function app.artisan_agents(p_artisan_id uuid, p_at timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_agents jsonb;
  v_month date := app.paris_month(p_at);
  v_used int;
  v_included int;
  v_credits int;
begin
  if app.artisan_subscription_active(p_artisan_id) then
    select s.plan_code into v_plan from public.subscriptions s where s.artisan_id = p_artisan_id;
  end if;
  select p.limites -> 'agents' into v_agents from public.plans p where p.code = v_plan;
  v_agents := coalesce(v_agents, '{}'::jsonb);
  v_included := greatest(coalesce((v_agents ->> 'voix_minutes')::int, 0), 0) * 60;
  select coalesce(sum(u.seconds), 0)::int into v_used
  from public.voice_usage u where u.artisan_id = p_artisan_id and u.month = v_month;
  select coalesce(sum(c.seconds), 0)::int into v_credits
  from public.voice_credits c where c.artisan_id = p_artisan_id;
  return jsonb_build_object(
    'formule', v_plan,
    'agents', v_agents,
    'mois', v_month,
    'secondes_incluses', v_included,
    'secondes_utilisees', v_used,
    'secondes_recharge', greatest(v_credits, 0),
    'secondes_restantes', greatest(v_included - v_used, 0) + greatest(v_credits, 0)
  );
end;
$$;
revoke execute on function app.artisan_agents(uuid, timestamptz) from public, anon, authenticated;

-- Appel terminé d'un agent vocal (Edge Function, rôle service) : compté une seule fois ; le
-- dépassement des minutes incluses est débité des minutes rechargées ; alertes du mois.
create function public.voice_record_usage(
  p_artisan_id uuid,
  p_call_id text,
  p_seconds int,
  p_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := app.paris_month(now());
  v_state jsonb;
  v_included int;
  v_before int;
  v_after int;
  v_overflow int;
  v_user uuid;
  v_remaining int;
begin
  if p_seconds is null or p_seconds < 0 then
    raise exception 'Durée invalide' using errcode = '22023';
  end if;
  if exists (select 1 from public.voice_usage where call_id = p_call_id) then
    return app.artisan_agents(p_artisan_id);
  end if;
  v_state := app.artisan_agents(p_artisan_id);
  v_included := (v_state ->> 'secondes_incluses')::int;
  v_before := (v_state ->> 'secondes_utilisees')::int;
  insert into public.voice_usage (artisan_id, call_id, agent, seconds, month)
  values (p_artisan_id, p_call_id, p_agent, least(p_seconds, 86400), v_month);
  v_after := v_before + least(p_seconds, 86400);
  v_overflow := greatest(v_after - v_included, 0) - greatest(v_before - v_included, 0);
  if v_overflow > 0 then
    insert into public.voice_credits (artisan_id, seconds, reason, reference)
    values (p_artisan_id, -v_overflow, 'consommation', p_call_id);
  end if;

  v_state := app.artisan_agents(p_artisan_id);
  v_remaining := (v_state ->> 'secondes_restantes')::int;
  select a.user_id into v_user from public.artisans a where a.id = p_artisan_id;
  if v_included > 0 and v_after >= v_included * 0.8 and v_remaining > 0 then
    insert into public.voice_alerts (artisan_id, month, level) values (p_artisan_id, v_month, '80')
    on conflict do nothing;
    if found then
      perform app.notify(v_user, 'agents_minutes_80', jsonb_build_object(
        'minutes_restantes', v_remaining / 60, 'minutes_incluses', v_included / 60
      ));
    end if;
  end if;
  if v_remaining = 0 and (v_included > 0 or v_overflow > 0) then
    insert into public.voice_alerts (artisan_id, month, level) values (p_artisan_id, v_month, '100')
    on conflict do nothing;
    if found then
      perform app.notify(v_user, 'agents_minutes_epuisees', jsonb_build_object(
        'minutes_incluses', v_included / 60
      ));
    end if;
  end if;
  return v_state;
end;
$$;
revoke execute on function public.voice_record_usage(uuid, text, int, text) from public, anon, authenticated;
grant execute on function public.voice_record_usage(uuid, text, int, text) to service_role;

-- Droits et minutes d'un artisan, pour l'Edge Function (rôle service).
create function public.voice_artisan_agents(p_artisan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select app.artisan_agents(p_artisan_id)
$$;
revoke execute on function public.voice_artisan_agents(uuid) from public, anon, authenticated;
grant execute on function public.voice_artisan_agents(uuid) to service_role;

-- « Mes agents IA » : droits, minutes du mois et derniers appels de l'artisan connecté.
create function public.my_ai_agents()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
begin
  if v_artisan is null then
    return null;
  end if;
  return app.artisan_agents(v_artisan) || jsonb_build_object('appels', coalesce((
    select jsonb_agg(jsonb_build_object('agent', u.agent, 'secondes', u.seconds, 'le', u.created_at)
      order by u.created_at desc)
    from (
      select * from public.voice_usage where artisan_id = v_artisan order by created_at desc limit 10
    ) u
  ), '[]'::jsonb));
end;
$$;
revoke execute on function public.my_ai_agents() from public, anon;
grant execute on function public.my_ai_agents() to authenticated;

-- Minutes offertes par un admin (geste commercial, essais), journalisées.
create function public.admin_grant_voice_minutes(p_artisan_id uuid, p_minutes int, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(left(coalesce(p_note, ''), 200)), '');
begin
  perform app.require_admin();
  if p_minutes is null or p_minutes not between 1 and 10000 then
    raise exception 'Entre 1 et 10 000 minutes.' using errcode = '22023';
  end if;
  if v_note is null then
    raise exception 'Indiquez le motif.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.artisans where id = p_artisan_id) then
    raise exception 'Artisan introuvable' using errcode = '22023';
  end if;
  insert into public.voice_credits (artisan_id, seconds, reason, reference, created_by)
  values (p_artisan_id, p_minutes * 60, 'geste', v_note, (select auth.uid()));
  perform app.audit('agents.minutes_offertes', 'artisan', p_artisan_id,
    jsonb_build_object('minutes', p_minutes, 'motif', v_note));
end;
$$;
revoke execute on function public.admin_grant_voice_minutes(uuid, int, text) from public, anon;
grant execute on function public.admin_grant_voice_minutes(uuid, int, text) to authenticated;

-- Back-office : minutes de voix par artisan sur un mois (le mois en cours par défaut).
create function public.admin_voice_usage(p_month date default null)
returns table (artisan_id uuid, entreprise text, formule text, appels int, secondes int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select a.id, coalesce(a.nom_commercial, a.raison_sociale), s.plan_code,
    count(*)::int, sum(u.seconds)::int
  from public.voice_usage u
  join public.artisans a on a.id = u.artisan_id
  left join public.subscriptions s on s.artisan_id = a.id
  where u.month = coalesce(date_trunc('month', p_month)::date, app.paris_month(now()))
  group by a.id, a.nom_commercial, a.raison_sociale, s.plan_code
  order by sum(u.seconds) desc
  limit 200;
end;
$$;
revoke execute on function public.admin_voice_usage(date) from public, anon;
grant execute on function public.admin_voice_usage(date) to authenticated;
