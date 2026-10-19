-- Qualité des demandes des partenaires (F-59, ADR 0145) : ne rémunérer que de vraies demandes.
--   1. Une demande qualifiée n'est validée qu'avec un vrai contact : visite passée sans annulation,
--      ou devis envoyé. Accepter une demande, c'est déjà fixer un rendez-vous (ADR 0016) : la seule
--      acceptation ne prouve donc rien.
--   2. L'artisan qui annule un chantier indique pourquoi ; un signalement (client injoignable,
--      absent, demande pas sérieuse) annule la prime en attente. Lu par l'équipe seule.
--   3. Doublons : un même client ou un même téléphone ne compte qu'une fois par partenaire et par
--      période de 90 jours.
--   4. Partenaire qui se sert lui-même : e-mail, téléphone du partenaire, SIREN de l'artisan.
--   5. Signaux « à vérifier » : prime bloquée jusqu'à la décision d'un admin.
--   6. Plafond mensuel par partenaire, entonnoir de transformation sur sa fiche.

alter table public.partners
  -- Téléphone du partenaire (facultatif) : repère les demandes qu'il déposerait lui-même.
  add column contact_phone text check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- Plafond propre au partenaire ; null : celui des réglages.
  add column plafond_demandes_mois int check (plafond_demandes_mois between 1 and 10000);

-- Signal « à vérifier » : la validation automatique attend la décision d'un admin.
alter table public.partner_commissions
  add column review_reason text check (char_length(review_reason) <= 300);
create index partner_commissions_review_idx on public.partner_commissions (partner_id)
  where review_reason is not null and status = 'en_attente';

-- ---------------------------------------------------------------------------
-- Signalements des artisans
-- ---------------------------------------------------------------------------
create type public.artisan_report_kind as enum ('client_injoignable', 'client_absent', 'fausse_demande');

-- Table à part : le journal du chantier est lu par le client, un signalement ne doit pas l'être.
create table public.chantier_reports (
  chantier_id uuid primary key references public.chantiers (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  kind public.artisan_report_kind not null,
  created_at timestamptz not null default now()
);
create index chantier_reports_project_idx on public.chantier_reports (project_id);
create index chantier_reports_artisan_idx on public.chantier_reports (artisan_id);
alter table public.chantier_reports enable row level security;
revoke all on public.chantier_reports from anon, authenticated;
grant select on public.chantier_reports to authenticated;
create policy "chantier_reports : lecture par l'équipe"
  on public.chantier_reports for select to authenticated using ((select app.is_staff()));

-- Annulation par l'artisan (F-18) : même règle qu'avant, avec le signalement éventuel. Le message
-- reste destiné au client ; le signalement ne l'est jamais.
drop function public.artisan_cancel_chantier(uuid, text);
create function public.artisan_cancel_chantier(
  p_chantier_id uuid,
  p_reason text,
  p_report public.artisan_report_kind default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chantiers;
begin
  select * into v from public.chantiers
  where id = p_chantier_id and artisan_id = app.my_artisan_id()
  for update;
  if not found then
    raise exception 'Chantier introuvable' using errcode = '42501';
  end if;
  if v.status not in ('rdv_planifie', 'devis_envoye', 'devis_en_revision') then
    raise exception 'Ce chantier ne peut plus être annulé' using errcode = '22023';
  end if;
  perform public.transition_chantier(p_chantier_id, 'annulation', jsonb_strip_nulls(jsonb_build_object(
    'par', 'artisan',
    'motif', nullif(btrim(left(p_reason, 500)), '')
  )));
  update public.appointments set status = 'annule' where chantier_id = p_chantier_id and status = 'planifie';
  update public.requests set status = 'annulee' where id = v.request_id;

  if p_report is not null then
    insert into public.chantier_reports (chantier_id, project_id, artisan_id, kind)
    values (v.id, v.project_id, v.artisan_id, p_report)
    on conflict (chantier_id) do nothing;
    update public.partner_commissions set
      status = 'annulee',
      review_reason = null,
      cancel_reason = 'Signalée par l''artisan : ' || case p_report
        when 'client_injoignable' then 'client injoignable'
        when 'client_absent' then 'client absent au rendez-vous'
        else 'demande pas sérieuse'
      end
    where project_id = v.project_id and kind = 'demande_qualifiee' and status = 'en_attente';
  end if;
end;
$$;
revoke execute on function public.artisan_cancel_chantier(uuid, text, public.artisan_report_kind) from public, anon;
grant execute on function public.artisan_cancel_chantier(uuid, text, public.artisan_report_kind) to authenticated;

-- ---------------------------------------------------------------------------
-- Contact établi
-- ---------------------------------------------------------------------------
-- Vrai contact sur un projet : un devis envoyé, ou une visite dont la date est passée sans que le
-- chantier ait été annulé avant ; jamais sur un chantier signalé par l'artisan. Donne aussi la
-- prochaine visite prévue, pour attendre qu'elle ait lieu.
create function app.partner_lead_contact(p_project_id uuid)
returns table (contact boolean, next_visit timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.chantiers c
      where c.project_id = p_project_id
        and not exists (select 1 from public.chantier_reports r where r.chantier_id = c.id)
        and (
          exists (select 1 from public.quotes q where q.chantier_id = c.id and q.status <> 'brouillon')
          or exists (
            select 1 from public.appointments a
            where a.chantier_id = c.id and a.starts_at <= now()
              and not exists (
                select 1 from public.chantier_events e
                where e.chantier_id = c.id and e.event = 'annulation' and e.created_at <= a.starts_at
              )
          )
        )
    ),
    (
      select min(a.starts_at)
      from public.chantiers c
      join public.appointments a on a.chantier_id = c.id
      where c.project_id = p_project_id and a.status = 'planifie' and a.starts_at > now()
    )
$$;
revoke execute on function app.partner_lead_contact(uuid) from public, anon, authenticated;

-- Téléphone du client d'un projet : celui donné à l'envoi de la demande, sinon celui du profil.
create function app.project_contact_phone(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.contact_phone from public.requests r
     where r.project_id = p_project_id and r.contact_phone is not null
     order by r.created_at limit 1),
    (select pr.phone from public.projects p join public.profiles pr on pr.user_id = p.user_id
     where p.id = p_project_id)
  )
$$;
revoke execute on function app.project_contact_phone(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Création des commissions : garde-fous et signaux
-- ---------------------------------------------------------------------------
-- Annulée d'office : partenaire lui-même (e-mail, téléphone, SIREN de l'artisan), plafond mensuel
-- atteint, même client ou même téléphone déjà compté pour ce partenaire depuis moins de 90 jours.
-- À vérifier : 5 demandes ou plus en 24 h pour le partenaire, téléphone utilisé par un autre
-- compte client. `p_artisan_id` : l'artisan qui accepte (demande) ou l'abonné (prime d'abonné).
create or replace function app.create_partner_commission(
  p_kind public.partner_commission_kind,
  p_project_id uuid,
  p_artisan_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_settings public.partner_settings;
  v_user uuid;
  v_phone text;
  v_siret text;
  v_cap int;
  v_reason text;
  v_review text;
begin
  select p.* into v_partner
  from public.partner_attributions a
  join public.partners p on p.id = a.partner_id and p.status = 'actif'
  where (p_kind = 'demande_qualifiee' and a.project_id = p_project_id)
     or (p_kind = 'abonne_payant' and a.artisan_id = p_artisan_id);
  if v_partner.id is null then
    return;
  end if;
  select * into v_settings from public.partner_settings;
  v_cap := coalesce(v_partner.plafond_demandes_mois, v_settings.plafond_demandes_mois);

  if p_kind = 'demande_qualifiee' then
    select user_id into v_user from public.projects where id = p_project_id;
    v_phone := app.project_contact_phone(p_project_id);
  else
    select a.user_id, pr.phone into v_user, v_phone
    from public.artisans a left join public.profiles pr on pr.user_id = a.user_id
    where a.id = p_artisan_id;
  end if;
  select siret into v_siret from public.artisans where id = p_artisan_id;

  if exists (select 1 from auth.users u where u.id = v_user and lower(u.email) = lower(v_partner.contact_email)) then
    v_reason := 'Compte du partenaire lui-même';
  elsif v_partner.contact_phone is not null and v_phone = v_partner.contact_phone then
    v_reason := 'Téléphone du partenaire lui-même';
  elsif v_siret is not null and left(v_siret, 9) = left(v_partner.siret, 9) then
    v_reason := 'Entreprise du partenaire lui-même';
  elsif p_kind = 'demande_qualifiee' and v_cap is not null and (
    select count(*) from public.partner_commissions c
    where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'
      and date_trunc('month', c.created_at at time zone 'Europe/Paris')
        = date_trunc('month', now() at time zone 'Europe/Paris')
  ) >= v_cap then
    v_reason := 'Plafond mensuel de demandes atteint';
  elsif p_kind = 'demande_qualifiee' and exists (
    select 1 from public.partner_commissions c
    join public.projects p on p.id = c.project_id
    where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'
      and c.created_at > now() - interval '90 days' and p.user_id = v_user
  ) then
    v_reason := 'Même client déjà compté il y a moins de 90 jours';
  elsif p_kind = 'demande_qualifiee' and v_phone is not null and exists (
    select 1 from public.partner_commissions c
    where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'
      and c.created_at > now() - interval '90 days' and c.project_id is distinct from p_project_id
      and app.project_contact_phone(c.project_id) = v_phone
  ) then
    v_reason := 'Même téléphone qu''une demande déjà comptée il y a moins de 90 jours';
  end if;

  if v_reason is null and p_kind = 'demande_qualifiee' then
    if (
      select count(*) from public.partner_commissions c
      where c.partner_id = v_partner.id and c.kind = 'demande_qualifiee' and c.status <> 'annulee'
        and c.created_at > now() - interval '24 hours'
    ) >= 4 then
      v_review := 'Beaucoup de demandes en 24 h pour ce partenaire';
    elsif v_phone is not null and (
      exists (select 1 from public.profiles pr where pr.phone = v_phone and pr.user_id <> v_user)
      or exists (select 1 from public.requests r where r.contact_phone = v_phone and r.particulier_id <> v_user)
    ) then
      v_review := 'Téléphone utilisé par un autre compte client';
    end if;
  end if;

  insert into public.partner_commissions (partner_id, kind, project_id, artisan_id, amount_cents,
    status, cancel_reason, review_reason, validate_after)
  values (
    v_partner.id,
    p_kind,
    case when p_kind = 'demande_qualifiee' then p_project_id end,
    case when p_kind = 'abonne_payant' then p_artisan_id end,
    case p_kind
      when 'demande_qualifiee' then coalesce(v_partner.montant_demande_centimes, v_settings.montant_demande_centimes, 0)
      else coalesce(v_partner.montant_abonne_centimes, v_settings.montant_abonne_centimes, 0)
    end,
    case when v_reason is null then 'en_attente' else 'annulee' end::public.partner_commission_status,
    v_reason,
    v_review,
    now() + make_interval(days => v_settings.delai_validation_jours)
  )
  on conflict do nothing;
end;
$$;

-- Demande qualifiée : la première acceptation d'un artisan, transmis pour le contrôle du SIREN.
create or replace function app.partner_on_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.create_partner_commission('demande_qualifiee', new.project_id, new.artisan_id);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Validation quotidienne
-- ---------------------------------------------------------------------------
-- Après le délai anti-fraude, hors primes « à vérifier » et partenaires suspendus :
--   - abonné payant : validée si l'abonnement est toujours actif, sinon annulée ;
--   - demande qualifiée : validée s'il y a eu un vrai contact ; visite encore à venir : on attend
--     trois jours après elle (180 jours au plus après la demande) ; sinon annulée.
create or replace function app.validate_partner_commissions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_contact boolean;
  v_next timestamptz;
  v_count int := 0;
begin
  for r in
    select c.id, c.kind, c.project_id, c.artisan_id, c.created_at
    from public.partner_commissions c
    join public.partners p on p.id = c.partner_id and p.status = 'actif'
    where c.status = 'en_attente' and c.validate_after <= now() and c.review_reason is null
    order by c.validate_after
    for update of c skip locked
  loop
    v_count := v_count + 1;
    if r.kind = 'abonne_payant' then
      if exists (select 1 from public.subscriptions s where s.artisan_id = r.artisan_id and s.status = 'active') then
        update public.partner_commissions set status = 'validee', validated_at = now() where id = r.id;
      else
        update public.partner_commissions
        set status = 'annulee', cancel_reason = 'Abonnement inactif à la fin du délai de validation'
        where id = r.id;
      end if;
      continue;
    end if;

    select l.contact, l.next_visit into v_contact, v_next from app.partner_lead_contact(r.project_id) l;
    if coalesce(v_contact, false) then
      update public.partner_commissions set status = 'validee', validated_at = now() where id = r.id;
    elsif v_next is not null and v_next <= r.created_at + interval '180 days' then
      update public.partner_commissions set validate_after = v_next + interval '3 days' where id = r.id;
    else
      update public.partner_commissions
      set status = 'annulee', cancel_reason = 'Ni visite ni devis dans le délai de validation'
      where id = r.id;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Back-office
-- ---------------------------------------------------------------------------
-- Prime « à vérifier » jugée correcte : le signal est levé, la validation suit son cours (délai et
-- contact toujours exigés).
create function public.admin_clear_commission_review(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_partner uuid;
begin
  perform app.require_admin();
  select review_reason, partner_id into v_reason, v_partner from public.partner_commissions
  where id = p_id and status = 'en_attente' and review_reason is not null
  for update;
  if v_reason is null then
    raise exception 'Commission introuvable ou déjà traitée.' using errcode = '22023';
  end if;
  update public.partner_commissions set review_reason = null where id = p_id;
  perform app.audit('partenaires.commission_verifiee', 'partenaire', v_partner,
    jsonb_build_object('commission', p_id, 'signal', v_reason));
end;
$$;
revoke execute on function public.admin_clear_commission_review(uuid) from public, anon;
grant execute on function public.admin_clear_commission_review(uuid) to authenticated;

-- Entonnoir d'un partenaire : demandes attribuées, envoyées à un artisan, acceptées (rendez-vous
-- fixé), avec un vrai contact, avec un devis signé ; primes à vérifier.
create function public.admin_partner_funnel(p_partner_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return (
    select json_build_object(
      'demandes', count(*),
      'envoyees', count(*) filter (where exists (
        select 1 from public.requests r where r.project_id = a.project_id)),
      'acceptees', count(*) filter (where exists (
        select 1 from public.chantiers c where c.project_id = a.project_id)),
      'contact', count(*) filter (where (select l.contact from app.partner_lead_contact(a.project_id) l)),
      'signees', count(*) filter (where exists (
        select 1 from public.chantiers c join public.quotes q on q.chantier_id = c.id
        where c.project_id = a.project_id and q.status = 'signe')),
      'a_verifier', (
        select count(*) from public.partner_commissions pc
        where pc.partner_id = p_partner_id and pc.status = 'en_attente' and pc.review_reason is not null)
    )
    from public.partner_attributions a
    where a.partner_id = p_partner_id and a.project_id is not null
  );
end;
$$;
revoke execute on function public.admin_partner_funnel(uuid) from public, anon;
grant execute on function public.admin_partner_funnel(uuid) to authenticated;

-- Fiche du partenaire : téléphone et plafond en plus (paramètres ajoutés à la fin).
drop function public.admin_save_partner(text, text, text, text, public.partner_status, int, int, text, uuid);
create function public.admin_save_partner(
  p_code text,
  p_nom text,
  p_siret text,
  p_contact_email text,
  p_status public.partner_status,
  p_montant_demande_centimes int default null,
  p_montant_abonne_centimes int default null,
  p_notes text default null,
  -- Absent : création ; sinon modification (le code ne change pas).
  p_id uuid default null,
  p_contact_phone text default null,
  p_plafond_demandes_mois int default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_nom text := btrim(coalesce(p_nom, ''));
  v_siret text := regexp_replace(coalesce(p_siret, ''), '\s', '', 'g');
  v_email text := lower(btrim(coalesce(p_contact_email, '')));
  v_phone text := nullif(regexp_replace(coalesce(p_contact_phone, ''), '[\s.-]', '', 'g'), '');
begin
  perform app.require_admin();
  if char_length(v_nom) not between 2 and 120 then
    raise exception 'Indiquez le nom du partenaire.' using errcode = '22023';
  end if;
  if not app.is_valid_siret(v_siret) then
    raise exception 'SIRET invalide : le programme est réservé aux professionnels.' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail de contact invalide.' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Téléphone invalide : format international, par exemple +33612345678.' using errcode = '22023';
  end if;
  if p_montant_demande_centimes not between 0 and 100000 or p_montant_abonne_centimes not between 0 and 1000000 then
    raise exception 'Montant hors limites.' using errcode = '22023';
  end if;
  if p_plafond_demandes_mois not between 1 and 10000 then
    raise exception 'Plafond mensuel : entre 1 et 10 000 demandes.' using errcode = '22023';
  end if;

  if p_id is null then
    if v_code !~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' then
      raise exception 'Code invalide : 3 à 32 caractères, minuscules, chiffres et tirets.' using errcode = '22023';
    end if;
    -- Un code de parrainage (F-60) occupe aussi l'espace des liens /p/<code>.
    if exists (select 1 from public.partners where code = v_code)
       or exists (select 1 from public.artisan_referral_codes where code = v_code) then
      raise exception 'Ce code est déjà utilisé.' using errcode = '22023';
    end if;
    insert into public.partners (code, nom, siret, contact_email, contact_phone, status,
      montant_demande_centimes, montant_abonne_centimes, plafond_demandes_mois, notes, created_by)
    values (v_code, v_nom, v_siret, v_email, v_phone, coalesce(p_status, 'actif'), p_montant_demande_centimes,
      p_montant_abonne_centimes, p_plafond_demandes_mois, nullif(left(btrim(coalesce(p_notes, '')), 2000), ''),
      (select auth.uid()))
    returning id into v_id;
    perform app.audit('partenaire.cree', 'partenaire', v_id, jsonb_build_object('code', v_code));
  else
    -- Le code ne change jamais : les liens déjà diffusés restent valables.
    update public.partners set
      nom = v_nom, siret = v_siret, contact_email = v_email, contact_phone = v_phone,
      status = coalesce(p_status, status),
      montant_demande_centimes = p_montant_demande_centimes,
      montant_abonne_centimes = p_montant_abonne_centimes,
      plafond_demandes_mois = p_plafond_demandes_mois,
      notes = nullif(left(btrim(coalesce(p_notes, '')), 2000), '')
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Partenaire introuvable.' using errcode = '22023';
    end if;
    perform app.audit('partenaire.modifie', 'partenaire', v_id, jsonb_build_object('statut', p_status));
  end if;
  return v_id;
end;
$$;
revoke execute on function public.admin_save_partner(text, text, text, text, public.partner_status, int, int, text, uuid, text, int)
  from public, anon;
grant execute on function public.admin_save_partner(text, text, text, text, public.partner_status, int, int, text, uuid, text, int)
  to authenticated;
