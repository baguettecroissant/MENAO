-- Parrainage V2 (F-60, ADR 0154 ; décision des associés du 22 octobre 2026, programme de
-- parrainage du 18 octobre) :
-- - au premier paiement réel du filleul, seul le parrain gagne un mois offert, 12 par année civile
--   (heure de Paris) au plus ; au-delà, le parrainage est récompensé sans mois offert ;
-- - le filleul, qui a déjà ses 2 mois d'essai, reçoit un cadeau de bienvenue à la validation de son
--   dossier : un t-shirt (avec sa taille) ou une casquette, qu'il choisit dans « Mon profil » ; sa
--   demande part à l'équipe comme les récompenses des grades (ticket « recompense ») ;
-- - un filleul de la même entreprise que son parrain (même SIREN) n'est jamais récompensé : le
--   parrainage est annulé à la validation du dossier ou au premier paiement.
-- Les mois déjà offerts aux filleuls (V1) restent dus et sont posés comme avant.

create type public.welcome_gift_item as enum ('tshirt', 'casquette');

create table public.artisan_welcome_gifts (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  referral_id uuid references public.artisan_referrals (id) on delete set null,
  item public.welcome_gift_item,
  size text check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  recipient text check (char_length(recipient) between 1 and 120),
  adresse_ligne text check (char_length(adresse_ligne) between 1 and 300),
  adresse_code_postal text check (adresse_code_postal ~ '^[0-9]{5}$'),
  adresse_commune text check (char_length(adresse_commune) between 1 and 100),
  ticket_id uuid references public.tickets (id) on delete set null,
  chosen_at timestamptz,
  created_at timestamptz not null default now(),
  -- Une taille pour le t-shirt seulement.
  check (case when item = 'tshirt' then size is not null else size is null end),
  -- Choisi : cadeau, destinataire et adresse complets.
  check ((chosen_at is not null) = (item is not null and recipient is not null
    and adresse_ligne is not null and adresse_code_postal is not null and adresse_commune is not null))
);
create index artisan_welcome_gifts_referral_idx on public.artisan_welcome_gifts (referral_id);
create index artisan_welcome_gifts_ticket_idx on public.artisan_welcome_gifts (ticket_id);

alter table public.artisan_welcome_gifts enable row level security;
revoke all on public.artisan_welcome_gifts from anon, authenticated;
grant select on public.artisan_welcome_gifts to authenticated;
create policy "artisan_welcome_gifts : lecture par l'artisan ou l'équipe"
  on public.artisan_welcome_gifts for select to authenticated
  using (artisan_id = (select app.my_artisan_id()) or (select app.is_staff()));

-- Parrain et filleul de la même entreprise : le parrainage en attente est annulé, journalisé.
create function app.cancel_same_company_referral(p_referral uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referred uuid;
  v_reason constant text := 'Même entreprise que le parrain (SIREN identique).';
begin
  update public.artisan_referrals set status = 'annule', cancel_reason = v_reason
  where id = p_referral and status = 'en_attente'
  returning referred_artisan_id into v_referred;
  if v_referred is not null then
    delete from public.artisan_welcome_gifts where referral_id = p_referral and chosen_at is null;
    perform app.audit('parrainage.annule', 'artisan', v_referred,
      jsonb_build_object('parrainage', p_referral, 'motif', v_reason));
  end if;
end;
$$;
revoke execute on function app.cancel_same_company_referral(uuid) from public, anon, authenticated;

-- Validation du dossier d'un filleul : cadeau de bienvenue à choisir, sauf même entreprise.
create function app.referral_on_validation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referral uuid;
  v_status public.referral_status;
  v_referrer_siren text;
begin
  select r.id, r.status, p.siren into v_referral, v_status, v_referrer_siren
  from public.artisan_referrals r
  join public.artisans p on p.id = r.referrer_artisan_id
  where r.referred_artisan_id = new.id and r.status <> 'annule';
  if v_referral is null then
    return new;
  end if;
  if new.siren is not null and new.siren = v_referrer_siren then
    perform app.cancel_same_company_referral(v_referral);
    return new;
  end if;
  insert into public.artisan_welcome_gifts (artisan_id, referral_id)
  values (new.id, v_referral)
  on conflict (artisan_id) do nothing;
  return new;
end;
$$;
revoke execute on function app.referral_on_validation() from public, anon, authenticated;
create trigger artisans_referral_on_validation after update of status on public.artisans
  for each row when (new.status = 'valide' and old.status is distinct from 'valide')
  execute function app.referral_on_validation();

-- Mois offerts gagnés comme parrain sur l'année civile en cours, heure de Paris.
create function app.referrer_months_this_year(p_artisan uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.artisan_free_months g
  join public.artisan_referrals r on r.id = g.referral_id and r.referrer_artisan_id = g.artisan_id
  where g.artisan_id = p_artisan
    and g.created_at >= date_trunc('year', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
$$;
revoke execute on function app.referrer_months_this_year(uuid) from public, anon, authenticated;

-- Premier paiement réel : prime du prescripteur (F-59) et mois offert du parrain (F-60).
create or replace function public.record_subscription_payment(p_stripe_subscription_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_referral uuid;
  v_referrer uuid;
  v_same_company boolean;
begin
  update public.subscriptions set first_paid_at = now()
  where stripe_subscription_id = p_stripe_subscription_id and first_paid_at is null
  returning artisan_id into v_artisan;
  if v_artisan is null then
    return false;
  end if;
  perform app.create_partner_commission('abonne_payant', null, v_artisan);

  select r.id, r.referrer_artisan_id, coalesce(f.siren = p.siren, false)
  into v_referral, v_referrer, v_same_company
  from public.artisan_referrals r
  join public.artisans f on f.id = r.referred_artisan_id
  join public.artisans p on p.id = r.referrer_artisan_id
  where r.referred_artisan_id = v_artisan and r.status = 'en_attente';
  if v_referral is null then
    return true;
  end if;
  if v_same_company then
    perform app.cancel_same_company_referral(v_referral);
    return true;
  end if;
  -- Plafond annuel : deux filleuls qui paient au même instant sont comptés l'un après l'autre.
  perform pg_advisory_xact_lock(hashtextextended('menao.parrainage.' || v_referrer::text, 0));
  update public.artisan_referrals set status = 'recompense', rewarded_at = now() where id = v_referral;
  -- 12 : REFERRAL_MONTHS_PER_YEAR (@menao/core).
  if app.referrer_months_this_year(v_referrer) < 12 then
    insert into public.artisan_free_months (artisan_id, referral_id) values (v_referrer, v_referral);
  end if;
  return true;
end;
$$;

-- « Mon profil » : code (créé à la première demande) et bilan, dont les mois de l'année.
create or replace function public.my_referral()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_code text;
begin
  if v_artisan is null or not exists (
    select 1 from public.artisans where id = v_artisan and status = 'valide'
  ) then
    return null;
  end if;
  select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  if v_code is null then
    insert into public.artisan_referral_codes (artisan_id, code)
    values (v_artisan, app.new_referral_code())
    on conflict (artisan_id) do nothing;
    select code into v_code from public.artisan_referral_codes where artisan_id = v_artisan;
  end if;
  return json_build_object(
    'code', v_code,
    'joined', (select count(*) from public.artisan_referrals
               where referrer_artisan_id = v_artisan and status <> 'annule'),
    'rewarded', (select count(*) from public.artisan_referrals
                 where referrer_artisan_id = v_artisan and status = 'recompense'),
    'months_earned', (select count(*) from public.artisan_free_months where artisan_id = v_artisan),
    'months_this_year', app.referrer_months_this_year(v_artisan)
  );
end;
$$;

-- État d'un cadeau : à choisir, demandé à l'équipe, ou envoyé (ticket résolu).
create function app.welcome_gift_status(p_chosen_at timestamptz, p_ticket_status public.ticket_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_chosen_at is null then 'a_choisir'
    when p_ticket_status = 'resolu' then 'envoye'
    else 'a_envoyer'
  end
$$;
revoke execute on function app.welcome_gift_status(timestamptz, public.ticket_status) from public, anon, authenticated;

-- Cadeau de bienvenue du filleul : adresse pré-remplie avec celle de l'entreprise.
create function public.my_welcome_gift()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'status', app.welcome_gift_status(g.chosen_at, t.status),
    'item', g.item,
    'size', g.size,
    'address', json_build_object(
      'recipient', coalesce(g.recipient,
        nullif(btrim(concat_ws(' ', pr.first_name, pr.last_name)), ''), app.artisan_label(a.id)),
      'ligne', coalesce(g.adresse_ligne, a.adresse_ligne),
      'code_postal', coalesce(g.adresse_code_postal, a.adresse_code_postal),
      'commune', coalesce(g.adresse_commune, a.adresse_commune)
    ),
    'referrer', coalesce(app.artisan_label(r.referrer_artisan_id), 'Un confrère'),
    'sent_at', case when t.status = 'resolu' then t.resolved_at end
  )
  from public.artisan_welcome_gifts g
  join public.artisans a on a.id = g.artisan_id
  left join public.profiles pr on pr.user_id = a.user_id
  left join public.artisan_referrals r on r.id = g.referral_id
  left join public.tickets t on t.id = g.ticket_id
  where g.artisan_id = app.my_artisan_id()
$$;
revoke execute on function public.my_welcome_gift() from public, anon;
grant execute on function public.my_welcome_gift() to authenticated;

-- Choix du cadeau (une seule fois) : la demande part à l'équipe, qui l'envoie puis résout le ticket.
create function public.choose_welcome_gift(
  p_item text,
  p_size text,
  p_recipient text,
  p_adresse_ligne text,
  p_adresse_code_postal text,
  p_adresse_commune text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid := app.my_artisan_id();
  v_chosen timestamptz;
  v_found boolean;
  v_size text := case when p_item = 'tshirt' then upper(btrim(coalesce(p_size, ''))) end;
  v_recipient text := btrim(coalesce(p_recipient, ''));
  v_ligne text := btrim(coalesce(p_adresse_ligne, ''));
  v_cp text := btrim(coalesce(p_adresse_code_postal, ''));
  v_commune text := btrim(coalesce(p_adresse_commune, ''));
  v_label text;
  v_email text;
  v_ticket uuid;
begin
  if v_artisan is null then
    raise exception 'Réservé aux artisans' using errcode = '42501';
  end if;
  select true, chosen_at into v_found, v_chosen
  from public.artisan_welcome_gifts where artisan_id = v_artisan for update;
  if v_found is null then
    raise exception 'Aucun cadeau de bienvenue à choisir.' using errcode = '22023';
  end if;
  if v_chosen is not null then
    raise exception 'Votre cadeau est déjà demandé.' using errcode = '22023';
  end if;
  if coalesce(p_item, '') not in ('tshirt', 'casquette') then
    raise exception 'Choisissez votre cadeau.' using errcode = '22023';
  end if;
  if p_item = 'tshirt' and v_size not in ('S', 'M', 'L', 'XL', 'XXL') then
    raise exception 'Choisissez la taille du t-shirt.' using errcode = '22023';
  end if;
  if char_length(v_recipient) not between 1 and 120 then
    raise exception 'Indiquez le nom du destinataire.' using errcode = '22023';
  end if;
  if char_length(v_ligne) not between 1 and 300 or v_cp !~ '^[0-9]{5}$'
     or char_length(v_commune) not between 1 and 100 then
    raise exception 'Indiquez l''adresse de livraison.' using errcode = '22023';
  end if;

  v_label := case when p_item = 'tshirt' then format('t-shirt taille %s', v_size) else 'casquette' end;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.tickets (type, user_id, contact_email, subject, message)
  values ('recompense', auth.uid(), v_email,
    left(format('Cadeau de bienvenue (parrainage) : %s', v_label), 150),
    left(format('Cadeau de bienvenue du parrainage : %s. Livraison : %s, %s, %s %s.',
      v_label, v_recipient, v_ligne, v_cp, v_commune), 2000))
  returning id into v_ticket;
  update public.artisan_welcome_gifts set
    item = p_item::public.welcome_gift_item, size = v_size, recipient = v_recipient,
    adresse_ligne = v_ligne, adresse_code_postal = v_cp, adresse_commune = v_commune,
    ticket_id = v_ticket, chosen_at = now()
  where artisan_id = v_artisan;
end;
$$;
revoke execute on function public.choose_welcome_gift(text, text, text, text, text, text) from public, anon;
grant execute on function public.choose_welcome_gift(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Back-office (ADR 0143) : cadeaux dans la liste, les chiffres clés et la fiche de l'artisan.
-- ---------------------------------------------------------------------------
drop function public.admin_referrals(text);
create function public.admin_referrals(p_filter text default 'tous')
returns table (
  id uuid,
  created_at timestamptz,
  status public.referral_status,
  rewarded_at timestamptz,
  cancel_reason text,
  referrer_id uuid,
  referrer text,
  referred_id uuid,
  referred text,
  referrer_month public.free_month_status,
  referred_month public.free_month_status,
  gift text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
  select r.id, r.created_at, r.status, r.rewarded_at, r.cancel_reason,
    r.referrer_artisan_id, app.artisan_label(r.referrer_artisan_id),
    r.referred_artisan_id, app.artisan_label(r.referred_artisan_id),
    (select g.status from public.artisan_free_months g
     where g.referral_id = r.id and g.artisan_id = r.referrer_artisan_id limit 1),
    (select g.status from public.artisan_free_months g
     where g.referral_id = r.id and g.artisan_id = r.referred_artisan_id limit 1),
    (select app.welcome_gift_status(w.chosen_at, t.status)
     from public.artisan_welcome_gifts w
     left join public.tickets t on t.id = w.ticket_id
     where w.referral_id = r.id)
  from public.artisan_referrals r
  where coalesce(p_filter, 'tous') = 'tous' or r.status::text = p_filter
  -- Ordre stable pour la pagination de l'interface.
  order by r.created_at desc, r.id;
end;
$$;
revoke execute on function public.admin_referrals(text) from public, anon;
grant execute on function public.admin_referrals(text) to authenticated;

create or replace function public.admin_referral_summary()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return json_build_object(
    'en_attente', (select count(*) from public.artisan_referrals where status = 'en_attente'),
    'recompense', (select count(*) from public.artisan_referrals where status = 'recompense'),
    'annule', (select count(*) from public.artisan_referrals where status = 'annule'),
    'mois_poses', (select count(*) from public.artisan_free_months where status = 'applique'),
    'mois_en_attente', (select count(*) from public.artisan_free_months where status = 'a_appliquer'),
    'cadeaux_a_choisir', (select count(*) from public.artisan_welcome_gifts where chosen_at is null),
    'cadeaux_a_envoyer', (select count(*) from public.artisan_welcome_gifts w
                          left join public.tickets t on t.id = w.ticket_id
                          where w.chosen_at is not null and t.status is distinct from 'resolu')
  );
end;
$$;

-- Annulation d'un abus avant la récompense : le cadeau pas encore choisi disparaît aussi.
create or replace function public.admin_cancel_referral(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 300), '');
  v_referred uuid;
begin
  perform app.require_admin();
  if v_reason is null then
    raise exception 'Indiquez le motif de l''annulation.' using errcode = '22023';
  end if;
  update public.artisan_referrals set status = 'annule', cancel_reason = v_reason
  where id = p_id and status = 'en_attente'
  returning referred_artisan_id into v_referred;
  if v_referred is null then
    raise exception 'Parrainage introuvable ou déjà récompensé.' using errcode = '22023';
  end if;
  delete from public.artisan_welcome_gifts where referral_id = p_id and chosen_at is null;
  perform app.audit('parrainage.annule', 'artisan', v_referred,
    jsonb_build_object('parrainage', p_id, 'motif', v_reason));
end;
$$;

create or replace function public.admin_artisan_referral(p_artisan_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return json_build_object(
    'code', (select c.code from public.artisan_referral_codes c where c.artisan_id = p_artisan_id),
    'parrain', (
      select json_build_object('id', r.referrer_artisan_id, 'nom', app.artisan_label(r.referrer_artisan_id),
        'status', r.status, 'created_at', r.created_at)
      from public.artisan_referrals r where r.referred_artisan_id = p_artisan_id
    ),
    'filleuls', coalesce((
      select json_agg(json_build_object('id', r.referred_artisan_id, 'nom', app.artisan_label(r.referred_artisan_id),
        'status', r.status, 'created_at', r.created_at) order by r.created_at desc)
      from public.artisan_referrals r where r.referrer_artisan_id = p_artisan_id
    ), '[]'::json),
    'mois_poses', (select count(*) from public.artisan_free_months g
                   where g.artisan_id = p_artisan_id and g.status = 'applique'),
    'mois_en_attente', (select count(*) from public.artisan_free_months g
                        where g.artisan_id = p_artisan_id and g.status = 'a_appliquer'),
    'mois_annee', app.referrer_months_this_year(p_artisan_id),
    'cadeau', (
      select json_build_object('status', app.welcome_gift_status(w.chosen_at, t.status),
        'item', w.item, 'size', w.size, 'ticket_id', w.ticket_id)
      from public.artisan_welcome_gifts w
      left join public.tickets t on t.id = w.ticket_id
      where w.artisan_id = p_artisan_id
    )
  );
end;
$$;

-- Filleuls déjà validés dont le parrainage attend encore : ils passent aussi au cadeau.
insert into public.artisan_welcome_gifts (artisan_id, referral_id)
select r.referred_artisan_id, r.id
from public.artisan_referrals r
join public.artisans f on f.id = r.referred_artisan_id and f.status = 'valide'
join public.artisans p on p.id = r.referrer_artisan_id
where r.status = 'en_attente' and f.siren is distinct from p.siren
on conflict (artisan_id) do nothing;
