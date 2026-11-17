-- Comparatif des formules repensé (F-175, ADR 0368, maquette lot 70 validée) : cinq rubriques
-- au lieu de huit, dans l'ordre de ce qui compte pour l'artisan. Seuls les noms de rubrique et
-- la place de « Assistants écrits » changent ; libellés, détails et valeurs restent les mêmes.

update public.plan_features set categorie = 'Manon, votre secrétaire'
  where categorie = 'Assistants IA' and libelle <> 'Assistants écrits';

-- Dictée du devis, tickets lus et aide : avec les devis, juste après la dictée intelligente.
update public.plan_features set categorie = 'Devis et plans', ordre = 125
  where categorie = 'Assistants IA' and libelle = 'Assistants écrits';

update public.plan_features set categorie = 'Devis et plans'
  where categorie = 'Devis et signature';

update public.plan_features set categorie = 'Votre argent'
  where categorie in ('Paiements', 'Gestion');

update public.plan_features set categorie = 'Chantiers, équipe et visibilité'
  where categorie in ('Chantiers et planning', 'Visibilité', 'Équipe et accompagnement');
