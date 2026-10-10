# ADR 0027 — Réception des travaux : PV signé par le client, sans ou avec réserves

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-25** : après « Travaux terminés », le client valide la réception (« Tout est conforme ? ») et signe le procès-verbal (PV) de réception, avec la même mécanique que le devis (F-13). Le PV comprend :
  - le numéro, la date, le maître de l'ouvrage, l'entreprise, l'adresse et la nature des travaux ;
  - la case cochée selon le cas réel ;
  - les observations ;
  - le récapitulatif financier (solde = total − acompte).
- **F-26** : « Ajouter des réserves » donne un PV avec réserves et passe le chantier en `reserves_a_lever` ; l'artisan est notifié.
- **F-27** : ordre de fin de chantier : PV, puis solde, puis avis. L'avis ne conditionne jamais un paiement.
- **ADR 0011** : MENAO ne détient pas les fonds, donc ne peut pas suspendre un versement à l'artisan.

## Décisions
- **Un PV par chantier** (`receptions`), créé quand le client ouvre la signature.
  - Numéro `PV-AAAA-RNN`, propre à chaque artisan et à chaque année (compteur transactionnel).
  - Données figées : entreprise, client et chantier du devis signé, devis de référence, acompte versé, date de fin des travaux, réserves.
  - Tant qu'il n'est pas signé, le client peut ajouter ou retirer des réserves : même numéro, nouveau document. La procédure en cours est abandonnée, et une signature tardive de l'ancienne version est ignorée.
- **Contenu du PV** (`@menao/documents`, même modèle pour le PDF et l'aperçu web) :
  - case « sans réserves » ou « avec réserves » cochée selon le cas réel (correction 6 de la spec, §16) ;
  - réserves dans les observations ;
  - solde = total TTC − acompte versé, toujours calculé ;
  - signature du maître de l'ouvrage chez le prestataire.
- **Signature** : même procédure que le devis (DocuSeal, cases à cocher, code à usage unique, ADR 0022).
  - `signature_requests` porte un devis ou un PV.
  - `signature-create` produit le PDF du PV à partir de ses données figées.
  - `signature-webhook` conserve le PV signé et la preuve dans le bucket privé `reception-signatures`, de façon idempotente.
  - `generate-pdf` sert le PV signé.
- **Transitions** :
  - `pv_sans_reserves` → `receptionne` ; `pv_avec_reserves` → `reserves_a_lever` ;
  - l'artisan reçoit « Réception validée » ou « Réserves émises », avec les réserves citées.
- **Parcours client** (maquettes) :
  - « Valider la réception du chantier » (« Tout est conforme ? ») ou « Ajouter des réserves sur ce chantier » ;
  - page de réception par étapes (réserves, signature du PV, paiement du solde), avec l'aperçu du PV tel qu'il sera signé ;
  - au retour du prestataire, la vue du chantier signale un enregistrement en cours si le webhook n'est pas encore arrivé.
- **Solde avec réserves** : le solde est demandé au chantier réceptionné, c'est-à-dire, avec réserves, une fois leur levée confirmée par le client (5b). C'est conforme à la machine à états (spec §9) et à la piste de l'ADR 0011. La spec prévoyait un « versement suspendu » chez MENAO, impossible ici. L'onglet « Laissez votre avis » placé en premier dans les maquettes n'est pas repris (F-27).

## Points à valider (TODO(legal))
- Mentions du PV et vocabulaire : « maître de l'ouvrage » et « entreprise » plutôt que le « maître d'œuvre » des maquettes.
- Signature de l'entreprise : la réception est contradictoire (art. 1792-6 du code civil), mais seul le client signe en V1, comme sur les maquettes.
- Valeur probante de la signature simple (déjà signalée pour le devis, ADR 0022).
- Photos jointes aux réserves (F-26 « + photos ») : non prévues dans la 5a.

## Conséquences
- **5b** : levée des réserves (signalée par l'artisan, confirmée par le client), relance à J+7, escalade au support à J+30.
- **5c** : paiement du solde au chantier réceptionné, facture de solde et clôture ; l'avis (5d) vient ensuite.
