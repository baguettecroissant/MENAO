# ADR 0364 — Exemples de l'espace artisan : secrétaire, suivi, bibliothèque, échéancier (F-173)

- Date : 17/11/2026
- Fonctionnalité : F-173, premier pas (site). Complète l'ADR 0184 (espace rempli d'exemples) et
  s'appuie sur les ADR 0244 (secrétaire), 0237 (suivi), 0293 (bibliothèque) et 0301 (échéancier).

## Contexte

L'espace d'exemples (`/pro/decouvrir`) montrait les demandes, chantiers, devis, factures,
dépenses, messages, agenda et la vitrine. Son menu affichait pourtant « Secrétaire » et l'onglet
« Suivi », qui menaient à des pages absentes ; la bibliothèque y était masquée et « Mes
paiements » retiré. L'utilisateur a demandé le 17/11/2026 un maximum d'exemples sur chaque
fonction, dans l'ordre : secrétaire, suivi et échéancier, bibliothèque, puis dépenses dans
l'application et appels d'offres.

## Décision

- **Données dans `packages/core`** (`space-examples.ts`), testées : `exampleSecretary` (trois
  appels à traiter dont un urgent et un rendez-vous pris, deux appels traités, réglages, minutes),
  `exampleMoneyOverview` (mois en cours et précédent, un solde en retard déjà relancé, un acompte
  récent, un paiement reçu sans facture, sur les chantiers d'exemple) et `exampleLibrary` (sept
  fournitures, six ouvrages composés dont un vendu à perte, réglages de chiffrage). Personnes,
  numéros et fournisseurs fictifs ; identifiants d'exemple (`isExampleId`).
- **Les mêmes vues que l'espace réel** : `SecretaryView` et `MoneyOverviewView` reçoivent `base`
  et `example` ; la page de la bibliothèque est séparée en chargement (page) et affichage
  (`LibraryView`), et `pricedLibrary` calcule coûts, prix et marges des lignes brutes, de la base
  comme de l'exemple. Aucun calcul n'est recopié pour les exemples.
- **Boutons visibles mais inactifs** (`ExampleLock`), comme ailleurs dans les exemples. Les onglets
  et la recherche fonctionnent. « Mes paiements » fait exception : l'échéancier se règle et
  l'exemple chiffré suit, seul « Enregistrer » est désactivé.
- **Rien n'est lu ni écrit en base**, et aucun appel à l'IA.

## Conséquences

- Le bouton « Mes paiements » de la rubrique Argent apparaît aussi dans les exemples.
- Les ouvrages d'exemple n'ont pas de fiche : leur nom n'est pas un lien.
- Restent à faire : les dépenses d'exemple dans l'application, puis les appels d'offres sur le
  site (la fiche d'un appel d'offres est à séparer en vue de la même façon).
