-- Comparatif des formules (F-15, ADR 0200) : accroche et limites des formules, lignes du
-- comparatif lisibles par tous (page Espace Pro), jamais modifiables depuis un compte.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select is(
  (select relrowsecurity from pg_class where oid = 'public.plan_features'::regclass),
  true,
  'RLS activée sur plan_features');
select is(
  (select count(*)::int from public.plan_features
   where not (valeurs ?& array['base', 'premium', 'entreprise'])),
  0,
  'chaque ligne du comparatif donne une valeur pour les 3 formules');
select is((select count(*)::int from public.plans where accroche is null), 0,
  'chaque formule a une accroche');
select results_eq(
  $$ select limites ->> 'demandes_mois', limites ->> 'comptes' from public.plans order by ordre $$,
  $$ values ('10'::text, '1'::text), ('25', '3'), (null, '10') $$,
  'demandes par mois (10, 25, illimitées) et comptes (1, 3, 10)');
select is(
  (select count(*)::int from public.plan_features where valeurs ->> 'base' = 'false'
   and categorie = 'Paiements' and libelle = 'Acompte et solde payés en ligne'),
  0,
  'les paiements en ligne restent dans Base');

-- ---------- Visiteur ----------
set local role anon;
select ok((select count(*) from public.plan_features) > 30, 'visiteur : comparatif lisible');
select throws_ok(
  $$ insert into public.plan_features (categorie, libelle) values ('Pirate', 'Pirate') $$,
  '42501', null, 'visiteur : aucun ajout');
select throws_ok($$ update public.plan_features set libelle = 'Pirate' $$, '42501', null,
  'visiteur : aucune modification');
reset role;

-- ---------- Compte connecté ----------
set local role authenticated;
select ok((select count(*) from public.plan_features) > 30, 'compte connecté : comparatif lisible');
select throws_ok($$ delete from public.plan_features $$, '42501', null,
  'compte connecté : aucune suppression');
select throws_ok($$ update public.plans set accroche = 'Pirate' $$, '42501', null,
  'compte connecté : ne modifie pas les formules');
reset role;

select * from finish();
rollback;
