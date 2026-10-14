# ADR 0077 — Application, espace artisan : devis et factures (lot 6c, partie 8)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, l'artisan retrouve ses devis (à envoyer, envoyés) et ses factures (F-35).
  - Chaque facture s'ouvre en PDF.
  - Un export CSV est prévu pour son comptable.
- Le CSV était fabriqué dans la route d'export du site.
- L'application ouvrait les devis depuis chaque chantier, sans liste d'ensemble ni accès aux factures.

## Décision
- **Export CSV commun** : `invoicesCsv` et `invoiceCsvParties` passent dans `@menao/documents` (testés), sans pdf-lib. La route d'export du site les utilise, sans changement du fichier produit.
- **Écran « Devis »** (`/pro-devis`), comme sur le site :
  - onglets « Devis à envoyer » et « Devis envoyés » (`artisan_quotes`) ;
  - montant, numéro, client, visite, brouillon avec nombre de lignes et version, date d'envoi ou état ;
  - un brouillon ouvre la préparation du devis, un devis envoyé ouvre le chantier.
- **Écran « Factures »** (`/pro-factures`), comme sur le site :
  - factures de la plus récente à la plus ancienne, avec type, date, client, chantier et montant ;
  - chaque facture se partage en PDF (generate-pdf, comme ailleurs dans l'application) ;
  - « Exporter pour le comptable (CSV) » écrit le même fichier que le site dans le cache de l'application, puis le propose au partage (e-mail, Fichiers…).
- **Accès** : section « Devis et factures » du tableau de bord.
- Aucune nouvelle dépendance (expo-file-system et expo-sharing servent déjà aux PDF), aucun changement côté serveur.

## Conséquences
- **Lot 6e** : notifications push.
