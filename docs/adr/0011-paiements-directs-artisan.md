# ADR 0011 — Paiements des chantiers : directement sur le compte de l'artisan

- Statut : accepté (décision des fondateurs du 9 octobre 2026, option 1)
- Date : 9 octobre 2026

## Contexte
Le business plan V6 affirme que MENAO ne perçoit aucun flux financier lié aux chantiers (« ni commission, ni marge, ni détention de fonds ») ; CLAUDE.md (règle 12) l'impose. La spec V1 (F-26, F-30 à F-34) décrivait au contraire des « charges et transferts séparés » : fonds conservés sur le solde de la plateforme, acompte versé à l'artisan 48 h avant le début, solde suspendu jusqu'à la levée des réserves.

## Décision
**Option 1 : paiement direct.** Les paiements des clients sont des *direct charges* Stripe créées sur le compte Connect de l'artisan, qui est le marchand :
- aucun `application_fee`, aucun transfert : rien ne transite par MENAO ;
- comptes Connect configurés avec `controller.fees.payer = account` (l'artisan paie les frais Stripe), `controller.losses.payments = stripe` (Stripe porte le risque de pertes), `controller.stripe_dashboard.type = full` (l'artisan gère paiements, remboursements et litiges dans son propre tableau de bord Stripe), `requirement_collection = stripe` (inscription hébergée par Stripe) ;
- l'artisan est visible et reçoit des demandes s'il est validé, abonné et capable d'encaisser (`charges_enabled`).

## Conséquences
- **Décisions de la spec tranchées** : D5 (Stripe Connect, sans détention de fonds : la limite de 90 jours ne s'applique plus) ; D6 (frais de paiement payés par l'artisan, et non par MENAO) ; D12 (compte au tableau de bord Stripe complet plutôt qu'Express : cohérent avec des paiements directs et sans risque porté par MENAO).
- **Fonctionnalités de la spec à revoir en phase 4** : pas de versement différé de l'acompte (F-31), pas de solde « suspendu » chez MENAO (F-26, F-32), remboursements et litiges gérés par l'artisan dans Stripe (F-34). Piste pour les réserves : le paiement du solde n'est demandé au client qu'après la levée des réserves (protection du client sans détention de fonds). À valider en phase 4.
- **Aucune protection financière du client par MENAO** en cas de litige : à expliquer clairement dans les CGU (TODO(legal)).
- Accounts v2 de Stripe recommandés pour les nouvelles plateformes : la V1 utilise Accounts v1 (contrôleur), migration possible ensuite.
