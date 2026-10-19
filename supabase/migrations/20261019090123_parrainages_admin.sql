-- Parrainages dans le back-office (F-60, ADR 0143) : liste des parrainages avec le parrain, le
-- filleul et les mois offerts de chacun, chiffres clés, annulation d'un abus avant la récompense
-- (motif obligatoire, journalisée), et parrainage d'un artisan sur sa fiche. Réservé aux admins.

alter table public.artisan_referrals
  add column cancel_reason text check (char_length(cancel_reason) <= 300);
alter table public.artisan_referrals add constraint artisan_referrals_motif_annulation
  check (status <> 'annule' or cancel_reason is not null);

-- Nom affiché d'un artisan : nom commercial, sinon raison sociale, sinon nom du compte.
create function app.artisan_label(p_artisan_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(a.nom_commercial), ''),
    nullif(btrim(a.raison_sociale), ''),
    nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'Artisan'
  )
  from public.artisans a
  left join public.profiles p on p.user_id = a.user_id
  where a.id = p_artisan_id
$$;
revoke execute on function app.artisan_label(uuid) from public, anon, authenticated;

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
  referred_month public.free_month_status
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
     where g.referral_id = r.id and g.artisan_id = r.referred_artisan_id limit 1)
  from public.artisan_referrals r
  where coalesce(p_filter, 'tous') = 'tous' or r.status::text = p_filter
  order by r.created_at desc
  limit 200;
end;
$$;
revoke execute on function public.admin_referrals(text) from public, anon;
grant execute on function public.admin_referrals(text) to authenticated;

create function public.admin_referral_summary()
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
    'mois_en_attente', (select count(*) from public.artisan_free_months where status = 'a_appliquer')
  );
end;
$$;
revoke execute on function public.admin_referral_summary() from public, anon;
grant execute on function public.admin_referral_summary() to authenticated;

-- Abus repéré avant la récompense (artisan qui se parraine avec une seconde entreprise…).
create function public.admin_cancel_referral(p_id uuid, p_reason text)
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
  perform app.audit('parrainage.annule', 'artisan', v_referred,
    jsonb_build_object('parrainage', p_id, 'motif', v_reason));
end;
$$;
revoke execute on function public.admin_cancel_referral(uuid, text) from public, anon;
grant execute on function public.admin_cancel_referral(uuid, text) to authenticated;

-- Fiche d'un artisan : son code, son parrain, ses filleuls et ses mois offerts.
create function public.admin_artisan_referral(p_artisan_id uuid)
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
                        where g.artisan_id = p_artisan_id and g.status = 'a_appliquer')
  );
end;
$$;
revoke execute on function public.admin_artisan_referral(uuid) from public, anon;
grant execute on function public.admin_artisan_referral(uuid) to authenticated;
