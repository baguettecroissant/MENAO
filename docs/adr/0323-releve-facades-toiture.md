# ADR 0323 — Relevé des façades et de la toiture (F-158, PR 2)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-158 ; suite de l'ADR 0322, même tableau (maquette du lot 52)

## Constat

Le couvreur, le charpentier, le façadier et le serrurier n'avaient qu'un poste d'attente dans le
DPGF créé depuis les plans. Les ouvrages mesurés (ADR 0322) leur servent tels quels, mais une
façade ou un versant portent rarement leur surface écrite : le plan donne des cotes, ou la surface
au sol de la toiture et sa pente.

## Décision

- **Consigne de lecture** étendue aux façades et à la toiture : une ligne par façade ou par
  versant, gouttières, faîtage, rives, descentes, fenêtres de toit, garde-corps.
- **Deux calculs de surface dans `packages/core`**, toujours avec des valeurs lues, jamais faits
  par le modèle, et toujours affichés :
  - deux cotes écrites de la surface elle-même : « 12,40 m × 6,20 m » ;
  - surface au sol écrite et pente écrite d'un versant : coefficient √(1 + p²) pour une pente en
    pourcentage, 1 ÷ cos(angle) pour une pente en degrés, arrondi au millième et affiché
    (« 86,00 m² × 1,221 (pente 35°) »).
- **Rien d'autre n'est déduit** : une seule cote, une pente sans unité ou hors bornes (plus de
  300 % ou de 75°), une surface au sol sans pente laissent la quantité « à compléter ». Un
  linéaire (gouttière, garde-corps) n'est jamais calculé. Les ouvertures ne sont pas déduites d'une
  façade : la surface est brute, l'artisan la corrige.
- **Sortie structurée** : 13 champs facultatifs sur les 16 admis par le fournisseur (test dédié).
- Aucun changement de base ni d'écran : les lots des quatre métiers reçoivent leurs ouvrages par
  la règle de l'ADR 0322.

## Limites connues

- Une façade en pignon ou un versant non rectangulaire ne sont pas calculés avec deux cotes : la
  consigne demande de laisser les valeurs vides.
- La consigne n'a pas encore été mesurée sur de vrais plans : c'est l'objet de la PR 3
  (évaluation, estimation du coût avant tout appel payant).
