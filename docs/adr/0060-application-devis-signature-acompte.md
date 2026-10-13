# ADR 0060 — Application : devis, signature et acompte (lot 6b, partie 5a)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Depuis l'ADR 0059, la signature du devis, le paiement de l'acompte et les PDF s'ouvraient sur le site.
- La phase 6 demande que les parcours des phases 2 à 5 fonctionnent dans l'application.
- La signature se fait sur la page hébergée de DocuSeal (ADR 0022), le paiement sur Stripe Checkout, sur le compte de l'artisan (ADR 0023). Ces deux choix prévoyaient déjà le même parcours dans l'application.
- À la fin, DocuSeal et Stripe renvoient vers une adresse fixée par MENAO. Elle menait aux pages de l'espace client du site, qui demandent d'être connecté au site.

## Décision
- **Écrans natifs**, mêmes données et mêmes règles que le site :
  - « Devis » : le devis tel qu'il a été envoyé, mis en page à partir du même modèle que le PDF (`@menao/documents`), avec son statut et les messages selon l'état. Boutons « Signer », « Demander une modification », « Refuser », puis « Payer l'acompte » ;
  - « Signature du devis » : rappel du devis et de l'échéancier, puis les quatre cases du site (`signatureConsentsSchema`), avec les versions des conditions ;
  - « Paiement de l'acompte » : montant de l'échéancier figé, bénéficiaire, moyens de paiement ;
  - « Refuser le devis » et « Demander une modification » : mêmes schémas et mêmes fonctions SQL que le site.
- **Fenêtre sécurisée du téléphone** pour DocuSeal et Stripe (`openAuthSessionAsync` d'expo-web-browser) :
  - session éphémère : aucun cookie partagé avec le navigateur, ni demande de connexion du système ;
  - elle se ferme d'elle-même dès qu'une page la renvoie vers `menao://`.
- **Retour dans l'application** :
  - `signature-create` et `deposit-checkout` acceptent `app: true`. L'adresse de fin devient alors la page publique `/retour-application` du site, avec l'écran, l'identifiant et l'état (`signature`, `reception`, `paiement`, `annule`) ;
  - cette page, statique, rouvre l'application sur l'écran d'origine (`menao://devis/<id>?retour=paiement`). Elle propose aussi la page équivalente du site ;
  - **pas de redirection libre** : seuls des écrans et des états connus sont acceptés, avec un identifiant au format UUID. Les règles sont dans `@menao/core` (`app-return.ts`) et testées ;
  - au retour, l'écran affiche « en cours d'enregistrement » et se recharge quelques fois, jusqu'à l'arrivée du webhook.
- **PDF** (devis, factures) :
  - produits par `generate-pdf` avec le jeton du compte, comme sur le site ;
  - enregistrés dans le cache de l'application (expo-file-system), puis proposés au partage du téléphone (expo-sharing) : enregistrer dans Fichiers, imprimer, envoyer.
- **Nouvelles dépendances** : expo-file-system et expo-sharing, modules Expo maintenus et inclus dans Expo Go, aux versions du SDK 57. Leur extension de configuration ne sert qu'à recevoir des partages : elle n'est pas activée.
- **Règles inchangées** :
  - aucun argent ne transite par MENAO (règle 12) : même charge directe sur le compte de l'artisan ;
  - rien ne mène à l'abonnement artisan (règle 10).

## Limites connues
- Une signature déjà ouverte est reprise avec son lien, donc avec son adresse de fin d'origine. Si elle a été ouverte sur le site puis reprise dans l'application (ou l'inverse), il faut fermer la fenêtre à la fin. L'écran se recharge alors normalement.
- **Expo Go sur Android** ne connaît pas le schéma `menao://` : il faut aussi y fermer la fenêtre à la main. L'application publiée déclare ce schéma (6f).
- **Apple Pay** dans la fenêtre sécurisée est à vérifier sur iPhone. La carte bancaire reste toujours proposée par Stripe.

## Conséquences
- **Mise en service** : déployer `signature-create` et `deposit-checkout` sur staging. Sans ce déploiement, l'application fonctionne, mais la fenêtre ne se ferme pas d'elle-même à la fin.
- **Partie 5b** : réception (PV, réserves, levée) et paiement du solde, avec les mêmes briques (fenêtre sécurisée, page de retour, cases à cocher).
