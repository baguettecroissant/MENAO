# ADR 0112 — Relances de l'inscription artisan abandonnée

- Statut : accepté
- Date : 17 octobre 2026
- Suite des ADR 0110 et 0111 ; même mécanique que le rappel du planning (ADR 0107).

## Contexte
- Un artisan qui crée son profil (ADR 0110) mais ne termine pas « Faire vérifier mon entreprise » (ADR 0111) n'apparaît jamais auprès des clients. C'est souvent à ce moment-là qu'on perd le plus d'artisans.
- La maquette validée proposait « Plus tard, envoyez-moi un rappel ».

## Décision
- **Qui est relancé** :
  - un artisan dont la fiche est en brouillon (dossier pas envoyé, ou compléments demandés par l'équipe) ;
  - et dont l'adresse e-mail est confirmée.
- **Qui ne l'est pas** :
  - une adresse non confirmée : elle peut être erronée ou appartenir à quelqu'un d'autre ;
  - un parcours abandonné avant la création du compte : son brouillon reste dans le navigateur et aucune adresse n'est connue.
- **Rythme** :
  - trois relances au plus, 1, 3 puis 7 jours après la création de la fiche ;
  - au moins 2 jours entre la première et la deuxième, et 4 jours entre la deuxième et la troisième, même pour une fiche ancienne ;
  - jamais deux le même jour ;
  - tâche `pg_cron` quotidienne à 8 h UTC (`app.remind_signup`).
- **Texte** (`packages/emails`, notification `inscription_relance`), avec un lien vers « Faire vérifier mon entreprise » :
  - relance 1 : l'inscription n'est pas terminée ;
  - relance 2 : les documents en photo depuis le téléphone ;
  - relance 3 : dernier rappel, le profil attend sa vérification ;
  - dossier complet mais pas envoyé : « envoyez-le » ;
  - compléments demandés : « votre dossier attend vos compléments ».
- **Préférence « rappels »** : relance facultative, comme les autres relances (ADR 0033). Le centre de notifications la garde.
- **Étapes manquantes** : `app.onboarding_missing_steps` est extraite de `submit_artisan_onboarding` (même calcul, mêmes messages). La relance s'en sert pour savoir si le dossier est prêt.
- **« Votre profil est créé »** annonce le rappel : « Pas le temps maintenant ? Nous vous enverrons un rappel par e-mail. »

## Conséquences
- **Déploiement** : appliquer les migrations et redéployer la fonction `notify`, qui doit connaître le nouveau type pour rédiger l'e-mail.
- **Adresses réservées** : les comptes de test (`.test`, `example.*`) ne reçoivent pas d'e-mail (`isDeliverableAddress`, `packages/emails`). Les relances restent visibles dans leur centre de notifications.
