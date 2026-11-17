-- Comparatif en cinq rubriques (F-175, ADR 0368) : les rubriques renommées, aucune ligne perdue,
-- « Assistants écrits » rangé avec les devis, et l'ordre des rubriques suit celui des lignes.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select results_eq(
  $$ select categorie from public.plan_features group by categorie order by min(ordre) $$,
  $$ values ('Demandes de chantier'::text), ('Manon, votre secrétaire'), ('Devis et plans'),
            ('Votre argent'), ('Chantiers, équipe et visibilité') $$,
  'cinq rubriques, dans l''ordre de la maquette');
select is(
  (select count(*)::int from public.plan_features), 48,
  'aucune ligne perdue : 48 lignes');
select is(
  (select categorie from public.plan_features where libelle = 'Assistants écrits'),
  'Devis et plans',
  'les assistants écrits sont rangés avec les devis');
select is(
  (select count(*)::int from public.plan_features
   where categorie in ('Assistants IA', 'Devis et signature', 'Paiements', 'Gestion',
                       'Chantiers et planning', 'Visibilité', 'Équipe et accompagnement')),
  0,
  'plus aucune ancienne rubrique');

set local role anon;
select is(
  (select count(distinct categorie)::int from public.plan_features), 5,
  'visiteur : les cinq rubriques sont lisibles');
reset role;

select * from finish();
rollback;
