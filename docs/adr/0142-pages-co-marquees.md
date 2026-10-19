# ADR 0142 — Pages co-marquées des partenaires

- Statut : accepté
- Date : 19 octobre 2026
- Lot 3 du programme Partenaires (ADR 0136, 0138, 0139), sans API.

## Contexte
- **Le constat** : un client qui suit le lien d'un prescripteur (agence, syndic, notaire, assureur) arrive sur la recherche MENAO, la même pour tous. Rien ne lui rappelle qui le lui recommande, alors que cette recommandation est ce qui donne confiance.
- **Choix de l'utilisateur** : des pages co-marquées, avec le nom et le message du partenaire, sans logo. L'API qui permettrait au partenaire de transmettre lui-même les demandes de ses clients est écartée pour l'instant : elle demanderait le consentement des clients, un contrat de sous-traitance et la vérification des demandes.

## Décision
- **Page `/partenaires/<code>`** :
  - « <Partenaire> vous recommande MENAO » et une promesse reprise du site ;
  - le formulaire de demande de travaux sur la page même (`NeedForm` avec le code partenaire : la demande est attribuée au partenaire comme par le lien, sans traceur) ;
  - le message du partenaire, signé de son nom ;
  - une mention de transparence : le partenaire peut être rémunéré lorsque la demande aboutit, et ne reçoit jamais les coordonnées du client ;
  - le lien vers les garanties et le fonctionnement en quatre étapes.
  - Sur mobile, le message du partenaire passe avant le formulaire.
- **Activation par un admin**, partenaire par partenaire, depuis sa fiche : case « Page en ligne » et message de 400 caractères au plus (`admin_save_partner_page`, journalisé).
  - La page répond « introuvable » si elle n'est pas activée ou si le partenaire est suspendu.
  - Lecture sans compte par `partner_page` : nom, code et message seulement.
- **Référencement** : la page est en `noindex, follow` et absente du sitemap, pour ne pas créer de pages presque identiques d'un partenaire à l'autre. Elle reste une page de campagne, à envoyer par e-mail, dans une newsletter ou sur un QR code.
- **Coût** : la page est générée à la première visite, puis gardée en cache une heure (règle 13). Le cache est vidé dès que l'admin enregistre la page ou modifie le partenaire, pour qu'une activation ou une suspension soit visible aussitôt, même après un « introuvable » mis en cache.
- **Liens** : l'adresse de la page s'affiche sur la fiche du partenaire (back-office) et dans son espace partenaire quand elle est en ligne (`partnerLinks().page`).

## Conséquences
- **Un prescripteur dispose d'une page à son nom**, prête à envoyer à ses clients, sans rien installer.
- **Plus tard** : le logo du partenaire (dépôt et vérification d'une image), un QR code à télécharger, et l'API si un partenaire important la demande.
- **Migration `page_partenaire`** : deux colonnes, deux fonctions et la mise à jour de `partner_dashboard`. Pas de nouvelle dépendance.
