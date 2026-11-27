-- Nouveaux prix des formules (F-193, ADR 0393), plaquette des commerciaux du 27/11/2026 :
-- Base 150 €, Premium 350 € (au lieu de 500 €), Ultimate 950 € (au lieu de 1 500 €) HT par mois.
-- Le paiement à l'année reste 12 mois au prix de 10 (ANNUAL_FREE_MONTHS de @menao/core) : les prix
-- Stripe sont recréés par `pnpm stripe:setup`, qui transfère la clé de recherche au nouveau prix.
-- Accroches reprises de la plaquette, chevauchement des tailles d'entreprise corrigé (décision du
-- 27/11/2026). Les primes des commerciaux (30, 100 et 200 €) ne changent pas.

update public.plans
set prix_mensuel_ht_centimes = 35000,
    accroche = 'Pour les auto-entrepreneurs et les entreprises jusqu''à 10 salariés'
where code = 'premium';

update public.plans
set prix_mensuel_ht_centimes = 95000,
    accroche = 'Pour les entreprises de plus de 10 salariés'
where code = 'entreprise';

update public.plans
set accroche = 'Accessible à toutes les entreprises'
where code = 'base';
