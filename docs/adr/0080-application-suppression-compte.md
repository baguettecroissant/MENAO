# ADR 0080 — Application : suppression du compte (lot 6f)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Apple exige qu'une application qui permet de créer un compte permette aussi d'en demander la suppression depuis l'application (règle 5.1.1 v). Google Play a la même exigence.
- Sur le site, « Supprimer mon compte » (F-52, RGPD) crée une demande (`request_account_deletion`) :
  - c'est un ticket pour l'équipe MENAO, traité sous un mois ;
  - les documents que la loi impose de conserver (factures) sont gardés.

## Décision
- **Carte « Supprimer mon compte »** dans l'écran « Compte » de l'application, pour tout compte connecté (particulier, artisan, artisan en cours d'inscription). Elle donne l'explication du site, puis « Demander la suppression de mon compte ». Si une demande est en cours, sa date est affichée.
- **Écran de demande** (`/suppression-compte`), comme sur le site :
  - remarque facultative et case de confirmation (`accountDeletionSchema`) ;
  - puis `request_account_deletion`, qui ne crée jamais deux demandes en cours ;
  - le délai d'un mois et la conservation des documents légaux sont annoncés avant l'envoi, comme le demande Apple quand la suppression n'est pas immédiate.
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Conséquences
- Le reste du lot 6f dépend de l'utilisateur : comptes de développeur Apple et Google, identifiants APNs et FCM, identifiant `fr.menao.app` à confirmer, icône des notifications, mention de l'inscription des artisans [À VALIDER].
