# ADR 0139 — Espace partenaire et page « Devenir partenaire »

- Statut : accepté
- Date : 19 octobre 2026
- Lot 2 du programme Partenaires (ADR 0136, 0138), seconde partie.

## Contexte
- **Ce que proposent les plateformes de référence** : un tableau de bord pour leurs affiliés et une page de recrutement.
- **Ce qui existait chez MENAO** : liens, widget et kit (ADR 0136, 0138). Seule l'équipe voyait les chiffres d'un partenaire.
- **Contraintes** :
  - pas de compte supplémentaire à gérer (aucun nouveau rôle) ;
  - aucune donnée personnelle des clients ou des artisans montrée au partenaire ;
  - les montants restent ceux décidés par les fondateurs (règle 15) ;
  - partenaires professionnels uniquement (ADR 0136).

## Décision
- **Espace partenaire par lien privé** (`/espace-partenaire/<jeton>`) : jeton de 48 caractères aléatoires, comme l'abonnement à l'agenda (F-44).
  - **Création et renouvellement** par un admin, depuis la fiche du partenaire (`admin_renew_partner_dashboard`, journalisé). L'ancien lien ne répond plus.
  - **Lecture sans compte** par `partner_dashboard` (clé publique) :
    - nom, code et statut ;
    - demandes attribuées et qualifiées, artisans inscrits et abonnés payants ;
    - primes en attente, à facturer et payées ;
    - montants en vigueur (négociés ou par défaut) et délai de validation.
    - Ni SIRET, ni e-mail, ni notes internes, ni aucune donnée des clients ou des artisans.
  - **Ce que voit le partenaire** :
    - ses liens et son kit à copier ;
    - la consigne de facturation (facture à l'adresse de contact, puis virement) ;
    - le rappel de la mention « Publicité » ou « Collaboration commerciale ».
  - **Page dynamique** (jamais en cache), non indexée, sans référent (`no-referrer`).
  - **Ouverte pendant le pré-lancement**, comme le lien de l'agenda : un partenaire recruté avant le lancement peut préparer son intégration.
- **Page publique `/partenaires`** :
  - à qui le programme s'adresse ;
  - les quatre étapes ;
  - ce qui est récompensé (demande qualifiée, artisan abonné), sans montant ;
  - la transparence (aucun traceur, aucune coordonnée transmise) ;
  - le formulaire de candidature.
  - Elle figure dans le sitemap, le llms.txt et le pied de page (« Devenir partenaire »).
- **Candidature** : nom de l'entreprise, SIRET vérifié, e-mail, site (facultatif) et présentation.
  - Elle est envoyée à l'équipe comme un message de contact (`send_contact_message`), avec les mêmes limites d'envoi, et arrive dans « Dossiers et messages ».
  - L'équipe crée ensuite le partenaire dans le back-office : aucune table ni écran de plus.

## Conséquences
- **Un partenaire suit ses résultats en autonomie**, sans compte. L'équipe garde la main sur la création et le renouvellement des liens.
- **Évolutions possibles** : un compte partenaire, si le volume le justifie ; l'export de ses commissions ; le détail mois par mois.
- **[TODO(legal)]** : conditions générales du programme (contrat partenaire, facturation des primes), à publier avant le lancement.
- **Migration `espace_partenaire`** : une colonne et deux fonctions. Pas de nouvelle dépendance.
