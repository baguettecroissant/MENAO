# ADR 0368 — Comparatif des formules repensé pour Premium

- Statut : accepté (maquette lot 70 validée le 17/11/2026)
- Fonctionnalité : F-175

## Contexte

Le comparatif de /pro/formules alignait 48 lignes identiques en apparence : rien ne faisait
ressortir ce que Premium (500 € HT / mois, formule recommandée) apporte de plus que Base.

## Décision

- **Bandeau de la formule recommandée** avant le tableau : « Premium : tout Base, plus N
  fonctions », six cartes (Manon, demandes, devis prêt, paiements, marge, équipe), le prix et un
  bouton d'essai. N est compté par `planAddedFeatures` (core) ; minutes, demandes et comptes sont
  lus dans `plans.limites`, jamais écrits en dur.
- **Seulement ce qui change par défaut** (`splitPlanComparison`, core) : les lignes identiques
  dans les trois formules deviennent des pastilles « Incluses dans toutes les formules ».
  « Tout voir » remet toutes les lignes.
- **Colonne recommandée surlignée** de haut en bas (fond bleuté, bordure, valeurs en gras,
  coches pleines), seul bouton plein ; boutons de choix en haut et en bas de chaque colonne.
- **Téléphone** : onglets par formule (la recommandée choisie d'office), chaque ligne dit ce que
  Base n'a pas ou dans quelle formule la trouver.
- **Cinq rubriques au lieu de huit** (migration `20261117180000_comparatif_rubriques`) :
  Demandes de chantier, Manon votre secrétaire, Devis et plans, Votre argent, Chantiers équipe et
  visibilité. Les libellés et valeurs ne changent pas ; « Assistants écrits » rejoint les devis.

## Conséquences

- Le composant `Collapsible` disparaît (plus utilisé).
- L'écran « Ma formule » de l'application et l'assistant des pages Pro lisent les nouvelles
  rubriques sans changement de code.
- Aucun chiffre inventé : tous les nombres affichés viennent de la base.
