# ADR 0061 — Application : réception et solde (lot 6b, partie 5b)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- La partie 5a (ADR 0060) a mis dans l'application le devis, sa signature et l'acompte, avec la fenêtre sécurisée et la page de retour du site.
- Il restait la fin du chantier côté client, déjà en place sur le site :
  - réception des travaux, avec ou sans réserves, et PV signé chez DocuSeal (F-25, F-26, ADR 0027) ;
  - levée des réserves confirmée par le client (ADR 0028) ;
  - paiement du solde (F-32, ADR 0029).

## Décision
- **Vue d'un chantier**, mêmes règles que le site :
  - **travaux terminés** : « Valider la réception du chantier » ou « Ajouter des réserves sur ce chantier » ;
  - **réserves à lever** : « Vos réserves », levée signalée par l'artisan (avec son message), puis « Confirmer la levée des réserves ». La question « Le chantier est-il parfait ? » s'ouvre dans la page, avec le rappel du solde ;
  - **chantier réceptionné** : réception validée, puis « Payer le solde » ;
  - **chantier clôturé** : date de fin du paiement sous l'avancement ;
  - le **PV signé** rejoint le dossier : PDF produit par `generate-pdf`, puis partagé.
- **Écran « Réception des travaux »** :
  - réserves éventuelles, contrôlées par `reservesSchema` (10 caractères au moins) ;
  - aperçu du PV tel qu'il sera signé : même modèle que le PDF, case cochée selon le cas réel ;
  - les quatre cases (`receptionConsentsSchema`), puis DocuSeal dans la fenêtre sécurisée. Retour par la page du site (`etat=reception`).
- **Écran « Paiement du solde »** :
  - montant déjà payé, solde restant (total TTC − acomptes, toujours calculé), bénéficiaire ;
  - Stripe Checkout sur le compte de l'artisan (règle 12). Retour par la page du site (`etat=paiement`).
- **Aperçu du PV partagé** : `receptionPreviewData` (`@menao/documents`) remplace la construction faite dans la page du site. Le site et l'application l'utilisent. Un test vérifie qu'elle donne les mêmes données que le PV signé.
- **Rechargement** : la vue d'un chantier se recharge après la confirmation de la levée et au retour d'une signature ou d'un paiement, jusqu'à l'arrivée du webhook.
- Plus aucune action du particulier ne renvoie vers le site. Les liens restants mènent aux conditions (CGU, confidentialité, DocuSeal).

## Conséquences
- Aucun changement côté serveur : `signature-create` et `deposit-checkout` acceptent déjà `app: true` (ADR 0060).
- **Partie 6** : messagerie et notifications. Viendront ensuite :
  - l'avis du client (F-28) ;
  - le signalement d'un problème ;
  - l'annulation d'un chantier ;
  - les garanties après la réception ;
  - « Faire de nouveau appel à l'artisan ».
