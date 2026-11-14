# ADR 0316 — Étapes du dossier artisan sur ordinateur en version « Nette » (lot 47)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-152 (maquette lot 47 validée) ; suite du lot 9 (ADR 0254) et de l'audit du
  14/11/2026

## Décision

- **En-tête des étapes** : titre complet et chapeau pour Entreprise, Métiers, Zone et Paiements
  (`stepPages`), comme les maquettes ; les autres étapes gardent leur nom court.
- **Même cadre que le lot 9** : formulaire à gauche, aide ou aperçu à droite.
  - Zone : modes en cartes sur trois colonnes, avec une précision sous chacun (option `grid` de
    `RadioGroup`) ; à droite « Comment ça marche » et « Bon à savoir ».
  - Métiers : métiers en pastilles (case cachée, nom accessible gardé), spécialités du métier
    coché dans un encadré, expérience et diplôme côte à côte ; à droite, le RGE vérifié avec ses
    domaines et les certifications avec leur état (vérifiée ou en vérification).
  - Entreprise : vérification INSEE avec la pastille verte et la fiche en lignes, puis le nom
    commercial et la TVA en deux cartes ; à droite, le logo et le rappel du SIRET bloqué.
  - Paiements, formulaire Stripe intégré : le formulaire dans une carte, « Comment vous êtes
    payé » à droite (`PaymentHow`, partagé avec l'étape Paiements).
- Aucune règle ni donnée changée ; test de bout en bout adapté au titre « Votre entreprise ».
