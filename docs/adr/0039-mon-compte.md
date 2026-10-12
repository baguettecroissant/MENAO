# ADR 0039 — « Mon compte » : informations, identifiants, consentement et données personnelles

- Statut : accepté
- Date : 12 octobre 2026
- Complète F-08 (compte particulier), F-41 (préférences de notification) et la spec §18 (RGPD).

## Contexte
- Ni le particulier ni l'artisan ne pouvaient modifier leurs informations personnelles (nom, téléphone), leur adresse e-mail ou leur mot de passe depuis leur espace. Seul « Mot de passe oublié » permettait d'en changer.
- Le consentement aux communications marketing, recueilli à l'inscription, ne pouvait plus être retiré. Le RGPD impose de pouvoir le retirer aussi simplement qu'il a été donné.
- La spec §18 demande l'export et la suppression des données à la demande.

## Décision
- **Page `/compte`**, commune au particulier et à l'artisan. Elle est accessible depuis le menu du compte et, côté artisan, depuis « Paramètres du compte » dans le menu latéral.
  - Les sessions anonymes (recherche en cours) n'y ont pas accès.
  - L'équipe MENAO non plus : elle gère son compte depuis le back-office, et ses droits de lecture couvrent toute la base, ce qui rendrait l'export inadapté.
- **Mes informations** : prénom, nom et téléphone, avec les mêmes règles qu'à l'inscription. Le téléphone reste obligatoire pour un compte professionnel.
- **Adresse e-mail** : `updateUser` avec double confirmation (`double_confirm_changes`).
  - Un lien est envoyé à chacune des deux adresses (modèle `email_change`, lien `token_hash` vers `/auth/confirm`, qui accepte désormais ce type).
  - L'adresse ne change qu'une fois les deux liens ouverts. Entre-temps, la page affiche le changement en attente, puis un message intermédiaire après le premier lien.
- **Mot de passe** : l'actuel est vérifié par une nouvelle connexion. C'est ce qu'exige `secure_password_change`, qui ne permet le changement qu'avec une session récente.
  - Le nouveau mot de passe doit différer de l'actuel.
  - Les sessions des autres appareils sont ensuite révoquées (`signOut({ scope: "others" })`). Elles cessent au plus tard à l'expiration de leur jeton (une heure) ; le message reste donc mesuré : « devront se reconnecter ».
- **Communications** : case `marketing_opt_in`. La base date chaque choix (`marketing_updated_at`, posé par trigger, jamais par le client), ce qui prouve le consentement et son retrait. Un lien mène aux préférences de notification existantes.
- **Mes données** : `GET /compte/donnees` renvoie un fichier JSON (articles 15 et 20) de tout ce que le compte peut lire avec sa propre session.
  - Les droits de lecture de la base limitent chaque table à ses propres données.
  - Lecture par pages de 1 000 lignes, la limite de l'API.
  - Photos et documents restent téléchargeables depuis l'espace ; l'export en donne les références.
- **Suppression du compte** : `request_account_deletion()` crée un ticket `suppression_compte` pour l'équipe, à traiter sous un mois (article 12).
  - Une seule demande ouverte à la fois (index unique partiel). Une nouvelle demande est possible une fois la précédente traitée.
  - L'effacement reste fait par l'équipe tant que les durées de conservation ne sont pas validées : les devis, factures et PV restent chez l'artisan au titre de ses obligations. `TODO(legal)`.
- **Sécurité** : « Me déconnecter de tous mes appareils » (`signOut({ scope: "global" })`), puis retour à la connexion avec un message.

## Conséquences
- À déployer : deux migrations (type de ticket, puis colonne, trigger et fonction) et le modèle d'e-mail `email_change`. En production, celui-ci dépend du SMTP dédié, comme les autres e-mails d'authentification.
- À faire valider par l'avocat avant tout effacement automatique : durées de conservation, anonymisation des données liées aux documents envoyés et formulation de la page.
- Les demandes de suppression apparaissent dans « Dossiers et messages » du back-office.
