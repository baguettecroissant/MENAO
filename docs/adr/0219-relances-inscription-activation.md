# ADR 0219 — Relances de l'inscription : compléments, activation, compte non finalisé

- Statut : accepté
- Date : 4 novembre 2026
- F-70, demandé le 4 novembre 2026 (« go pour la relance des inscriptions abandonnées »). Complète l'ADR 0112 (relances du dossier en brouillon) ; deuxième brique des « agents commerciaux IA » après l'ADR 0218.

## Contexte
- L'ADR 0112 relance déjà un dossier en brouillon (J+1, J+3, J+7, trois au plus), par e-mail, push et centre de notifications.
- Trous relevés le 4 novembre 2026 :
  - un artisan **validé mais pas visible** (paiements Stripe non activés ou formule non choisie) n'est jamais relancé, alors que c'est la perte la plus coûteuse ;
  - un compte **Google ou Apple jamais finalisé** n'a pas de fiche artisan, donc aucune relance ;
  - le compteur de l'ADR 0112 vaut pour toute la vie du compte : après une **demande de compléments**, un artisan déjà relancé trois fois ne reçoit plus rien ;
  - la **liste noire** n'est pas vérifiée ;
  - l'équipe et les commerciaux ne voient pas **où chaque inscrit s'est arrêté** ;
  - les e-mails n'ont **aucun lien vers les préférences** ; la relance n°2 demande encore le Kbis (remplacé par l'ADR 0217).

## Décision
- **Dossier en brouillon** (`app.remind_signup`, remplacée) : même rythme, mais compté depuis le début du cycle (`app.signup_cycle_start` : création de la fiche ou dernière demande de compléments) ; identités sur liste noire exclues ; étapes manquantes jointes (`manque`) et listées dans l'e-mail (« Il vous reste : la charte qualité et vos documents. »). Relance n°2 : décennale, RC Pro, URSSAF et pièce d'identité ; Kbis seulement si la vérification au registre échoue.
- **Validé mais pas visible** (`activation_relance`, `app.remind_activation`, tâche `menao-relance-activation` à 8 h 10 UTC) : J+1, J+3 et J+7 après la dernière validation, trois au plus ; ce qui manque est calculé par `app.activation_missing_steps` (paiements, formule) et dicte le bouton (« Activer mes paiements » ou « Choisir ma formule »). **E-mail seulement** : jamais en push ni dans l'application, puisqu'elle renvoie vers la formule payante (CLAUDE.md règle 10 ; `WEB_ONLY_NOTIFICATIONS`, déclencheur `notifications_push_status`).
- **Compte Google ou Apple non finalisé** (`finalisation_relance`, `app.remind_finalization`, tâche `menao-relance-finalisation` à 8 h 20 UTC) : J+1 et J+4, deux au plus, comptes de moins de 30 jours, adresse confirmée par le fournisseur ; texte neutre (particulier ou artisan), vers `/finaliser-compte`.
- Les trois relances sont dans la catégorie « rappels » : désactivables par l'utilisateur.
- **Pied de page des e-mails de notification** : lien « Gérer mes e-mails » vers `/notifications` (HTML et texte).
- **Back-office** : `/admin/artisans/inscriptions` (`public.admin_stalled_signups`, équipe seulement) liste les inscriptions bloquées, les plus anciennes d'abord : état (dossier, compléments, validé non visible), étapes manquantes, attente, relances envoyées depuis le début de l'attente.
- **Espace commercial** : `my_commercial_signups` renvoie aussi les étapes manquantes de chaque inscrit, affichées sous son nom (« Il manque : documents, charte »), pour l'appeler au bon moment.
- Pas d'IA pour rédiger ces e-mails : un texte précis, construit à partir des étapes réellement manquantes, est plus fiable et gratuit.

## Conséquences
- Redéployer l'Edge Function `notify` après les migrations (nouveaux types de notification).
- Écartés (lot 2, à décider) : adresse jamais confirmée (risque d'écrire à une adresse mal saisie ; renvoi du code de confirmation à étudier), dossier refusé (décision de l'équipe), désinscription en un clic sans connexion et en-tête `List-Unsubscribe`, SMS (coût).
- Mesure : entonnoir des tableaux de lancement (inscrits, dossiers envoyés, validés, abonnés), avant et après.
