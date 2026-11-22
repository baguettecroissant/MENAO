-- La formule à 1 500 € HT par mois s'appelle « Ultimate » (F-186, ADR 0385), décision du 22/11/2026.
-- Le code interne `entreprise` ne change pas (abonnements, limites, clé Stripe) : seul le nom affiché
-- et les messages qui le citent changent. Ajoute aussi le montant versé au commercial pour un artisan
-- venu de nos publicités (50 € décidés le 22/11/2026), à la place de la prime de validation ; les
-- primes d'abonnement restent les mêmes. Son versement arrive avec le lot 2 (artisans confiés).

update public.plans set nom = 'Ultimate' where code = 'entreprise';

-- Messages des fonctions qui citent la formule (« … inclus dans la formule Entreprise. ») : chaque
-- fonction concernée est redéfinie à l'identique, nom remplacé (droits et réglages conservés par
-- CREATE OR REPLACE).
do $$
declare
  r record;
  v_def text;
begin
  for r in
    select p.oid
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app')
      and (p.prosrc like '%Premium et Entreprise%' or p.prosrc like '%formule Entreprise%')
  loop
    v_def := pg_catalog.pg_get_functiondef(r.oid);
    v_def := replace(v_def, 'Premium et Entreprise', 'Premium et Ultimate');
    v_def := replace(v_def, 'formule Entreprise', 'formule Ultimate');
    execute v_def;
  end loop;
end;
$$;

-- Montant pour un artisan venu de nos publicités, confié au commercial (vide : non réglé).
alter table public.commercial_bonus_settings
  add column prime_validation_pub_centimes int
    check (prime_validation_pub_centimes between 0 and 1000000);

-- Réglages : un montant de plus, en fin de liste (les appels existants restent valables).
drop function public.admin_save_commercial_bonus_settings(int, int, int, int, int, int);
create function public.admin_save_commercial_bonus_settings(
  p_prime_validation_centimes int default null,
  p_prime_abonnement_centimes int default null,
  p_delai_validation_jours int default null,
  p_objectif_valides_mois int default null,
  p_prime_abonnement_premium_centimes int default null,
  p_prime_abonnement_entreprise_centimes int default null,
  p_prime_validation_pub_centimes int default null
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
     or p_prime_abonnement_entreprise_centimes not between 0 and 1000000
     or p_prime_validation_pub_centimes not between 0 and 1000000 then
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
    prime_validation_pub_centimes = p_prime_validation_pub_centimes,
    delai_validation_jours = p_delai_validation_jours,
    objectif_valides_mois = p_objectif_valides_mois,
    updated_by = (select auth.uid())
  where id;
  perform app.audit('commerciaux.reglages_primes', 'commerciaux', null, jsonb_build_object(
    'prime_validation_centimes', p_prime_validation_centimes,
    'prime_abonnement_centimes', p_prime_abonnement_centimes,
    'prime_abonnement_premium_centimes', p_prime_abonnement_premium_centimes,
    'prime_abonnement_entreprise_centimes', p_prime_abonnement_entreprise_centimes,
    'prime_validation_pub_centimes', p_prime_validation_pub_centimes,
    'delai_validation_jours', p_delai_validation_jours,
    'objectif_valides_mois', p_objectif_valides_mois));
end;
$$;
revoke execute on function public.admin_save_commercial_bonus_settings(int, int, int, int, int, int, int)
  from public, anon;
grant execute on function public.admin_save_commercial_bonus_settings(int, int, int, int, int, int, int)
  to authenticated;
