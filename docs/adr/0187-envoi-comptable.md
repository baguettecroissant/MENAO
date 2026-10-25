# ADR 0187 — Envoi au comptable (F-63)

- Statut : accepté
- Date : 25 octobre 2026
- Deuxième lot du plan « dépenses → envoi au comptable → bibliothèque d'ouvrages et marge » (ADR 0186), demandé par l'utilisateur le 25 octobre 2026 (« fais l'envoi au comptable maintenant »), sur le modèle de l'« Envoi vers mon comptable » d'un concurrent.

## Décision
- **L'artisan règle l'envoi une fois** :
  - l'e-mail de son comptable ;
  - le rythme : chaque mois (le 1er, pour le mois précédent) ou chaque trimestre (le 1er du trimestre, pour le trimestre précédent) ;
  - les parties envoyées : ses factures (tableau et PDF), ses dépenses (tableau et pièces), ou les deux ;
  - l'activation de l'envoi automatique.
- **Ce que reçoit le comptable** : un e-mail MENAO avec un **lien de téléchargement valable 30 jours** vers une archive ZIP, plutôt que des pièces jointes.
  - L'archive contient `factures.csv`, `factures/<numéro>.pdf`, `depenses.csv`, `depenses/<date>_<fournisseur>_<numéro>.<ext>` et un `LISEZ-MOI.txt`.
  - Les tableaux ont le même format que les exports du site et de l'application.
  - Le pied de page explique pourquoi il reçoit l'e-mail. Une réponse va directement à l'artisan (en-tête de réponse).
- **Envoi automatique** les 7 premiers jours du mois ou du trimestre suivant, avec rattrapage si un envoi échoue.
  - Un seul envoi automatique réussi par période ; on arrête après 3 échecs.
  - Une période sans facture ni dépense part quand même (« 0 facture et 0 dépense ») : le comptable sait qu'il n'y a rien.
- **« Envoyer maintenant »** envoie la dernière période complète, 5 fois par heure au plus.
- **Historique des 12 derniers envois** : période, date, destinataire, automatique ou à la main, nombre de factures et de dépenses, envoyé ou échec.
- **Confidentialité** :
  - réglages et historique sont lisibles par l'artisan seul (pas par l'équipe MENAO) ;
  - l'archive reste dans un espace privé, servie par une URL signée, puis retirée après 60 jours ;
  - aucune adresse ni aucun montant dans les journaux.
- Pas de notification à l'artisan à chaque envoi : l'historique suffit pour ce premier lot.

## Technique
- **Cœur métier** : `packages/core/src/accountant.ts`, autonome car importé par l'Edge Function.
  - `accountantPeriodRange` : dernière période complète, libellé « septembre 2026 » ou « 3e trimestre 2026 ».
  - `accountantSendDue`, `nextAccountantSend` et `accountantRangeLabel`.
- **Archive** : `packages/documents/src/accountant-export.ts` (`accountantArchive`, noms de fichiers sans accents ni doublons).
  - Nouvelle dépendance **fflate** 0.8.3 : ZIP en JavaScript pur, sans module natif, léger et maintenu, utilisable dans Node (tests) et Deno (Edge Function).
  - Les pièces, déjà compressées, sont rangées sans recompression.
- **E-mail** : `renderAccountantExport` (`packages/emails`), mise en page commune des e-mails avec un pied de page propre au comptable. `NotificationProvider` accepte une adresse de réponse (`replyTo`, `reply_to` chez Resend).
- **Base** (test pgTAP `103_envoi_comptable`) :
  - tables `accountant_settings` et `accountant_exports` ;
  - `artisan_save_accountant_settings` (espace pro seulement) ;
  - `accountant_exports_due(p_today, p_limit)`, mêmes règles que le cœur métier, réservée au serveur ;
  - index unique : un envoi automatique réussi par période ;
  - espace `accountant-exports`, privé, sans accès direct.
- **Planification** : `app.dispatch_accountant_exports()` toutes les heures (à :20). La fonction n'appelle l'Edge Function que s'il y a des envois dus ou des archives à retirer.
  - Elle utilise la même adresse de base et le même secret partagé que la fonction notify (Vault `menao_notify_url`, `menao_notify_secret`) : aucun réglage nouveau par environnement. Sans eux (local, CI), rien n'est appelé.
- **Edge Function `accountant-export`** :
  - mode automatique (secret de notify, 10 artisans par appel) ;
  - mode manuel (jeton de l'artisan) ;
  - le PDF des factures passe par `_shared/invoice-pdf.ts`, désormais commun avec generate-pdf (produit une fois, conservé tel qu'émis).
- **Site** : page `/pro/comptable` (réglages, envoi à la main, historique), liens depuis Factures et Dépenses, page protégée par le filtre de session.
- **Application** : écran `/pro-comptable`, depuis « Mon profil » (rubrique Argent).
