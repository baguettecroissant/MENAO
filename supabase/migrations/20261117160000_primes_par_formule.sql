-- Primes des commerciaux selon la formule choisie (F-174, ADR 0366) : barème réel du 17/11/2026
-- (« Simulation de gains 2027 ») : 110 € à chaque artisan validé, puis, quand il devient abonné
-- payant après ses 2 mois offerts, 30 € (Base, 150 €), 100 € (Premium, 500 €) ou 200 €
-- (Entreprise, 1 500 €). La prime d'abonnement existante devient celle de Base ; Premium et
-- Entreprise ont la leur (vide : même montant que Base).

alter table public.commercial_bonus_settings
  add column prime_abonnement_premium_centimes int
    check (prime_abonnement_premium_centimes between 0 and 1000000),
  add column prime_abonnement_entreprise_centimes int
    check (prime_abonnement_entreprise_centimes between 0 and 1000000);

-- Montants : réglés dans le back-office (Commerciaux › Réglages des primes), pas ici.

-- Réglages : deux montants de plus, en fin de liste (les appels existants restent valables).
drop function public.admin_save_commercial_bonus_settings(int, int, int, int);
create function public.admin_save_commercial_bonus_settings(
  p_prime_validation_centimes int default null,
  p_prime_abonnement_centimes int default null,
  p_delai_validation_jours int default null,
  p_objectif_valides_mois int default null,
  p_prime_abonnement_premium_centimes int default null,
  p_prime_abonnement_entreprise_centimes int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  if p_prime_validation_centimes not between 0 and 1000000
     or p_prime_abonnement_centimes not between 0 and 1000000
     or p_prime_abonnement_premium_centimes not between 0 and 1000000
     or p_prime_abonnement_entreprise_centimes not between 0 and 1000000 then
    raise exception 'Montant hors limites.' using errcode = '22023';
  end if;
  if p_delai_validation_jours is null or p_delai_validation_jours not between 0 and 180 then
    raise exception 'Délai de vérification : entre 0 et 180 jours.' using errcode = '22023';
  end if;
  if p_objectif_valides_mois not between 1 and 1000 then
    raise exception 'Objectif mensuel : entre 1 et 1 000, ou vide.' using errcode = '22023';
  end if;
  update public.commercial_bonus_settings set
    prime_validation_centimes = p_prime_validation_centimes,
    prime_abonnement_centimes = p_prime_abonnement_centimes,
    prime_abonnement_premium_centimes = p_prime_abonnement_premium_centimes,
    prime_abonnement_entreprise_centimes = p_prime_abonnement_entreprise_centimes,
    delai_validation_jours = p_delai_validation_jours,
    objectif_valides_mois = p_objectif_valides_mois,
    updated_by = (select auth.uid())
  where id;
  perform app.audit('commerciaux.reglages_primes', 'commerciaux', null, jsonb_build_object(
    'prime_validation_centimes', p_prime_validation_centimes,
    'prime_abonnement_centimes', p_prime_abonnement_centimes,
    'prime_abonnement_premium_centimes', p_prime_abonnement_premium_centimes,
    'prime_abonnement_entreprise_centimes', p_prime_abonnement_entreprise_centimes,
    'delai_validation_jours', p_delai_validation_jours,
    'objectif_valides_mois', p_objectif_valides_mois));
end;
$$;
revoke execute on function public.admin_save_commercial_bonus_settings(int, int, int, int, int, int)
  from public, anon;
grant execute on function public.admin_save_commercial_bonus_settings(int, int, int, int, int, int)
  to authenticated;

-- Montant de la prime d'abonnement selon la formule ; vide pour Premium ou Entreprise : celui de Base.
create function app.commercial_subscription_bonus_cents(p_plan_code text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case p_plan_code
    when 'premium' then coalesce(s.prime_abonnement_premium_centimes, s.prime_abonnement_centimes)
    when 'entreprise' then coalesce(s.prime_abonnement_entreprise_centimes, s.prime_abonnement_centimes)
    else s.prime_abonnement_centimes
  end
  from public.commercial_bonus_settings s;
$$;
revoke execute on function app.commercial_subscription_bonus_cents(text) from public, anon, authenticated;

-- Vérification quotidienne et « Mes résultats » : complétées en place (jamais recopiées).
do $$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_get_functiondef('app.validate_commercial_bonuses()'::regprocedure);
  v_new := replace(v_def,
    'v_amount := v_settings.prime_abonnement_centimes;',
    'v_amount := app.commercial_subscription_bonus_cents((
        select s.plan_code from public.subscriptions s
        where s.artisan_id = r.artisan_id and s.status = ''active''
        order by s.created_at desc limit 1));');
  if v_new = v_def then
    raise exception 'validate_commercial_bonuses : montant de l''abonnement introuvable';
  end if;
  execute v_new;

  v_def := pg_get_functiondef('public.commercial_results()'::regprocedure);
  v_new := replace(v_def,
    '''prime_abonnement_centimes'', v_settings.prime_abonnement_centimes,',
    '''prime_abonnement_centimes'', v_settings.prime_abonnement_centimes,
    ''prime_abonnement_premium_centimes'',
      coalesce(v_settings.prime_abonnement_premium_centimes, v_settings.prime_abonnement_centimes),
    ''prime_abonnement_entreprise_centimes'',
      coalesce(v_settings.prime_abonnement_entreprise_centimes, v_settings.prime_abonnement_centimes),');
  if v_new = v_def then
    raise exception 'commercial_results : primes introuvables';
  end if;
  execute v_new;
end;
$$;
