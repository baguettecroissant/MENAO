# ADR 0303 — Échéancier réglable : application

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-146 (maquette lot 40), PR 3 sur 3 ; base : ADR 0301, site : ADR 0302

## Décision

- **Envoi du devis (artisan)** : comme la maquette de l'application, total TTC, barre de
  l'échéancier et trois tranches (acompte, démarrage, solde calculé) préremplies avec
  l'échéancier par défaut, 0 % possible ; « En faire mon échéancier par défaut » garde le
  réglage. Plus de choix « par défaut / personnalisé » : l'échéancier par défaut est le point de
  départ, modifiable sur place.
- **Client** : carte violette « Paiement au démarrage » sur le chantier pendant les travaux,
  écran `chantier/[id]/demarrage` (frise, Stripe Checkout sur le compte de l'artisan, retour dans
  l'application), carte « Sans acompte » sur le devis, case « échéancier » écrite tranche par
  tranche, étape « acompte » absente sans acompte ; accueil et « Mes chantiers » proposent
  « Payer au démarrage ».
- **Fiche chantier (artisan)** : ligne « Au démarrage » dans l'argent du chantier.
- Pièces communes `components/pro/payment-schedule.tsx` (barre, ligne réglable, frise), jeton
  `violet` de `@menao/ui-tokens`.

## Conséquences

- « Mes paiements » reste sur le site (Argent) : l'application n'a pas d'écran de réglage à
  part, l'envoi du devis suffit pour changer l'échéancier par défaut.
- Aucun achat d'abonnement dans l'application (règle 10) : rien ne change de ce côté.
