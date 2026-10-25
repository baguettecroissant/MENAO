# ADR 0188 — Menu regroupé de l'espace artisan

- Statut : accepté
- Date : 25 octobre 2026
- Demande de l'utilisateur du 25 octobre 2026 : l'espace artisan devenait une « usine à gaz » (12 entrées de menu, plus des sous-pages), loin de la simplicité attendue par des artisans peu à l'aise avec l'informatique. Proposition validée telle quelle (« vas-y avec tes propositions »). Lot 1 sur 3 : le menu ; les lots 2 et 3 reprendront les listes et les fiches.

## Décision
- **Sept rubriques au lieu de douze**, sur le site comme dans l'application :
  - Accueil (tableau de bord), Demandes, Chantiers, Agenda, Messages ;
  - **Argent** : devis, factures et dépenses, avec des onglets en haut de ces pages ; l'envoi au comptable y est rattaché ;
  - **Ma vitrine** : fiche publique, avis et grade, avec des onglets ;
  - en dessous, « Mon profil » (entreprise, documents, paiements).
- **Les adresses ne changent pas** (`/pro/devis`, `/pro/factures`, `/pro/depenses`, `/pro/profil`, `/pro/avis`, `/pro/grade`) : liens des e-mails, notifications et favoris continuent de fonctionner. Retour en arrière possible en annulant la PR.
- **Application** :
  - barre du bas « Accueil · Demandes · (+) · Chantiers · Argent » ;
  - l'onglet Argent bascule entre devis, factures et dépenses d'une puce ;
  - les messages passent en icône dans l'en-tête, avec leur pastille, comme sur la version téléphone du site ;
  - l'onglet Chantiers ne montre plus que les chantiers.

## Technique
- **Site** :
  - `PRO_NAV` (`nav-config.ts`) : une section de sept rubriques et une section « Compte » ;
  - la rubrique Argent porte le compteur des devis à envoyer, Ma vitrine celui des avis à traiter ;
  - groupes de routes `(argent)` et `(vitrine)` sous `/pro` et `/pro/decouvrir`, sans effet sur les adresses, avec une mise en page qui affiche `SectionTabs` ;
  - les onglets n'apparaissent que sur les listes, pas sur une fiche ni un formulaire ;
  - le test de bout en bout des routes protégées parcourt les groupes de routes.
- **Application** :
  - écran `pro/argent` (`?vue=devis|factures|depenses`) ;
  - écrans des factures et des dépenses devenus des composants, aussi ouverts depuis « Mon profil » ;
  - `MoneySwitcher` remplace `WorkSwitcher` ;
  - anciens liens (`/pro/devis`, `?vue=devis` de l'onglet Chantiers, liens du site) redirigés vers l'onglet Argent.
