# ADR 0302 — Échéancier réglable : écrans du site

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-146 (maquette lot 40), PR 2 sur 3 ; base et règles : ADR 0301

## Décision

- **Argent › « Mes paiements »** (`/pro/paiements`, patron et chef d'équipe) : bouton dans
  l'en-tête d'Argent (`SectionTabs`, action de rubrique, absente des exemples). Modèles en un
  clic (30 / 70, 30 / 40 / 30, 0 / 100, 50 / 50), barre de l'échéancier, acompte et démarrage
  réglables, solde calculé, exemple chiffré sur 4 800 € et conseil. Enregistrement par
  `set_payment_defaults` (schéma `paymentDefaultsSchema`).
- **Envoi du devis** : l'échéancier personnalisé passe à trois tranches avec montants en direct ;
  à droite, total, barre et récapitulatif de l'échéancier choisi ; lien vers « Mes paiements ».
- **Pièces communes** (`components/pro/payment-schedule.tsx`) : couleur de chaque moment
  (acompte bleu, démarrage violet, réception encre), barre segmentée, lignes de montants, ligne
  réglable. Nouveau jeton `violet` / `violet-soft` dans `@menao/ui-tokens`.
- **Client** : carte violette « Paiement au démarrage » sur le chantier pendant les travaux et
  page `/mon-espace/chantiers/[id]/demarrage` (frise signature / démarrage / réception, paiement
  Stripe) ; carte « Sans acompte » sur le devis ; case « échéancier » de la signature écrite
  tranche par tranche ; étape « acompte » absente pour un devis sans acompte.
- **Fiche du chantier (artisan)** : ligne « Au démarrage » dans l'argent du chantier.
- **Aide** : FAQ Pro et guide de l'assistant de l'espace artisan mis à jour.

## Écart à la maquette

L'encadré « À faire valider par l'avocat » de la maquette est une note de travail : il n'est pas
affiché aux artisans. Le point reste en `TODO(legal)` (ADR 0301).

## Conséquences

- Déploiement : `deposit-checkout` (retour vers la page du paiement au démarrage) et
  `artisan-assistant` (guide) après la fusion.
- L'application suit en PR 3.
