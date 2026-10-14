# ADR 0098 — Remplacement des photos générées par de vraies photos

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- **Revue des visuels manquants** (point 9), demandée par l'utilisateur le 14 octobre 2026.
- **Photos actuelles** : le site montre des photos générées par IA, avec des personnes fictives (bandeau de l'accueil et une photo par métier). C'est documenté dans `docs/images/photos-generees.md`. Les images de partage (ADR 0094) en dérivent.
- **Objectif** : pour le lancement, de vraies photos d'artisans du pilote, prises avec leur accord, renforceraient la confiance. Elles dépendent de l'utilisateur, qui doit les faire prendre et recueillir les autorisations.
- **Contraintes** :
  - dépôt public, sans donnée personnelle (règle 11) ;
  - pas d'optimisation d'images Vercel (règle 13) ;
  - pas de nouvelle dépendance ;
  - doute juridique signalé, jamais tranché seul.

## Décision
- **Cahier des charges** `docs/images/photos-reelles.md` :
  - les 16 emplacements, avec leurs formats et l'endroit où chacun apparaît ;
  - les photos attendues : situation réelle, protections, rien qui identifie le client ou le lieu, cadrage ;
  - les autorisations, conservées hors du dépôt, avec un `TODO(legal)` pour le modèle d'autorisation ;
  - la procédure de mise en ligne et un registre sans donnée personnelle.
- **Outil** `apps/web/scripts/photos-reelles.mjs` (Chromium de Playwright, déjà utilisé par les tests de bout en bout) :
  - photos nommées par emplacement, cadrage facultatif dans le nom (`plombier@50,30.jpg`) ;
  - recadrage aux formats du site (1536 × 1024, 800 × 1200), WebP sans métadonnées (ni position GPS) ;
  - conversion des photos HEIC de l'iPhone avec `sips` ;
  - images de partage refaites avec le même gabarit que l'ADR 0094 (`--partage` pour les refaire seules).
- **Transparence** : `photos-generees.md` signale aussi les images de partage dérivées des photos générées.

## Conséquences
- **Aucune photo n'est remplacée** par cette décision. Les photos générées restent en ligne jusqu'à l'arrivée des vraies photos et de leurs autorisations.
- **Au remplacement**, une PR contiendra les WebP et les images de partage refaites, ainsi que les documents mis à jour (registre, `photos-generees.md`, commentaire de `lib/site/images.ts`).
- **Avant les prises de vue**, le modèle d'autorisation (droit à l'image, prise de vue dans un lieu privé) doit être validé par un juriste.
