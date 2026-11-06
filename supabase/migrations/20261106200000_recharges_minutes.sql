-- Agents IA, lot 2 : recharges de minutes de voix (F-84, ADR 0233).
--
-- Premium et Entreprise peuvent acheter des minutes en plus de celles incluses (Base non :
-- `plans.limites.agents.recharges`). Achat sur le site uniquement (règle 10), paiement unique par
-- Stripe Checkout avec facture ; le webhook signé crédite les minutes une seule fois par session.
-- Minutes rechargées (et minutes offertes par l'équipe) valables 12 mois ; elles ne repartent pas
-- à zéro chaque mois. À l'échéance, ce qui reste d'une recharge expire : les minutes les plus
-- anciennes sont consommées en premier.
-- Catalogue réglable en base : 100 minutes à 19 € HT (rapport « Agents IA de MENAO », validé le
-- 6 novembre 2026). TODO(legal) : caractère non remboursable des minutes achetées, dans les CGV
-- artisans.

create table public.voice_topup_offers (
  code text primary key check (code ~ '^[a-z0-9_]{1,40}$'),
  nom text not null check (char_length(nom) between 1 and 80),
  minutes int not null check (minutes between 10 and 10000),
  prix_ht_centimes int not null check (prix_ht_centimes between 100 and 1000000),
  stripe_lookup_key text not null unique check (stripe_lookup_key ~ '^[a-z0-9_]{1,60}$'),
  validite_mois smallint not null default 12 check (validite_mois between 1 and 36),
  active boolean not null default true,
  ordre smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger voice_topup_offers_set_updated_at before update on public.voice_topup_offers
  for each row execute function app.set_updated_at();
insert into public.voice_topup_offers (code, nom, minutes, prix_ht_centimes, stripe_lookup_key, ordre)
values ('recharge_100', 'Recharge 100 minutes', 100, 1900, 'menao_recharge_100', 1);
alter table public.voice_topup_offers enable row level security;
-- Lecture publique (catalogue, script de mise en place Stripe) ; écriture par migration seulement.
create policy "voice_topup_offers : lecture par tous"
  on public.voice_topup_offers for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Registre des minutes : recharges payées, échéance, expiration.
-- ---------------------------------------------------------------------------
alter table public.voice_credits
  drop constraint voice_credits_reason_check,
  drop constraint voice_credits_check,
  drop constraint voice_credits_seconds_check,
  add column expires_at timestamptz,
  add column stripe_session_id text unique check (char_length(stripe_session_id) <= 200),
  add column amount_ht_cents int check (amount_ht_cents >= 0),
  add column expired_processed_at timestamptz,
  add constraint voice_credits_reason_check
    check (reason in ('recharge', 'geste', 'consommation', 'expiration')),
  add constraint voice_credits_sign_check
    check ((reason in ('consommation', 'expiration')) = (seconds < 0)),
  add constraint voice_credits_seconds_check
    check (seconds <> 0 and seconds between -1000000 and 1000000),
  add constraint voice_credits_recharge_check
    check (reason <> 'recharge' or (stripe_session_id is not null and expires_at is not null));
create index voice_credits_expiring_idx on public.voice_credits (expires_at)
  where expires_at is not null and expired_processed_at is null;
-- Minutes offertes avant ce lot : valables 12 mois à partir d'aujourd'hui.
update public.voice_credits set expires_at = now() + interval '12 months'
where reason = 'geste' and expires_at is null;

create or replace function public.admin_grant_voice_minutes(p_artisan_id uuid, p_minutes int, p_note text)
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
  insert into public.voice_credits (artisan_id, seconds, reason, reference, created_by, expires_at)
  values (p_artisan_id, p_minutes * 60, 'geste', v_note, (select auth.uid()), now() + interval '12 months');
  perform app.audit('agents.minutes_offertes', 'artisan', p_artisan_id,
    jsonb_build_object('minutes', p_minutes, 'motif', v_note));
end;
$$;

-- Session Checkout payée (stripe-webhook, rôle service) : minutes créditées une seule fois.
create function public.voice_credit_topup(
  p_artisan_id uuid,
  p_stripe_session_id text,
  p_offer_code text,
  p_amount_ht_cents int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.voice_topup_offers;
begin
  if coalesce(p_stripe_session_id, '') = '' then
    raise exception 'Session Stripe manquante' using errcode = '22023';
  end if;
  if exists (select 1 from public.voice_credits where stripe_session_id = p_stripe_session_id) then
    return 'deja';
  end if;
  select * into v_offer from public.voice_topup_offers where code = p_offer_code;
  if not found then
    raise exception 'Recharge inconnue' using errcode = '22023';
  end if;
  if not exists (select 1 from public.artisans where id = p_artisan_id) then
    raise exception 'Artisan introuvable' using errcode = '22023';
  end if;
  insert into public.voice_credits (artisan_id, seconds, reason, reference, stripe_session_id,
    amount_ht_cents, expires_at)
  values (p_artisan_id, v_offer.minutes * 60, 'recharge', v_offer.code, p_stripe_session_id,
    greatest(coalesce(p_amount_ht_cents, 0), 0), now() + make_interval(months => v_offer.validite_mois))
  on conflict (stripe_session_id) do nothing;
  return case when found then 'credite' else 'deja' end;
end;
$$;
revoke execute on function public.voice_credit_topup(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.voice_credit_topup(uuid, text, text, int) to service_role;

-- Échéance des minutes rechargées ou offertes : ce qui reste expire. Les minutes les plus anciennes
-- sont consommées en premier : le reste d'une ligne est ce que les débits (consommation et
-- expirations déjà passées) n'ont pas encore couvert, jusqu'à cette ligne comprise.
create function app.expire_voice_credits(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_credited int;
  v_debited int;
  v_left int;
  v_count int := 0;
begin
  for c in
    select * from public.voice_credits
    where seconds > 0 and expires_at <= p_now and expired_processed_at is null
    order by artisan_id, created_at, id
  loop
    select coalesce(sum(seconds), 0) into v_credited
    from public.voice_credits
    where artisan_id = c.artisan_id and seconds > 0 and (created_at, id) <= (c.created_at, c.id);
    select coalesce(-sum(seconds), 0) into v_debited
    from public.voice_credits
    where artisan_id = c.artisan_id and seconds < 0;
    v_left := least(c.seconds, greatest(v_credited - v_debited, 0));
    if v_left > 0 then
      insert into public.voice_credits (artisan_id, seconds, reason, reference)
      values (c.artisan_id, -v_left, 'expiration', c.id::text);
    end if;
    update public.voice_credits set expired_processed_at = p_now where id = c.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function app.expire_voice_credits(timestamptz) from public, anon, authenticated;
select cron.schedule('menao-expiration-minutes', '30 3 * * *', 'select app.expire_voice_credits()');

-- « Mes agents IA » : prochaine échéance des minutes rechargées, pour l'afficher.
create function public.my_voice_topups()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'prochaine_echeance', (
      select min(expires_at) from public.voice_credits
      where artisan_id = app.my_artisan_id() and seconds > 0 and expired_processed_at is null
    ),
    'offres', coalesce((
      select jsonb_agg(jsonb_build_object('code', o.code, 'nom', o.nom, 'minutes', o.minutes,
        'prix_ht_centimes', o.prix_ht_centimes, 'validite_mois', o.validite_mois) order by o.ordre)
      from public.voice_topup_offers o where o.active
    ), '[]'::jsonb)
  )
$$;
revoke execute on function public.my_voice_topups() from public, anon;
grant execute on function public.my_voice_topups() to authenticated;
