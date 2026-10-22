# ADR 0158 — Côté artisans : impayés, plaintes, liste noire, conseil sur l'acompte

- Statut : accepté
- Date : 22 octobre 2026
- Lot 3 du plan V1.1, d'après le « Plan anti-problèmes V2 » de Mickaël (18 octobre 2026) : points B4 (abonnement impayé), A6 (acompte, plaintes) et B9 (radié qui revient).

## Décision
- **Abonnement impayé** :
  - **Début de l'impayé** (`subscriptions.past_due_since`) : noté au passage en « past_due » ou « unpaid », effacé au retour à la normale.
  - **Visibilité** : l'impayé garde le profil visible **15 jours** (`UNPAID_GRACE_DAYS`, `subscriptionGrantsAccess` et `app.artisan_subscription_active`). Au-delà, le profil sort des recherches ; il revient dès que Stripe repasse l'abonnement en « active ».
  - **Relances** (`app.remind_unpaid_subscriptions`, chaque jour à 7 h UTC) : à J+3 et J+7, puis à J+15 l'avis « profil retiré ». Une seule fois chacune par épisode d'impayé ; si plusieurs sont dues en même temps, seule la plus avancée part. Le lien mène à la page de la formule sur le site.
  - **Jamais dans l'application** (règle 10) : ni en push, ni dans le centre de notifications de l'app (`WEB_ONLY_NOTIFICATIONS`). E-mail seulement.
- **Plaintes** : quand un client ouvre un litige, et que c'est la **2e plainte de clients en 12 mois** contre le même artisan (chantiers distincts), le profil est suspendu (`suspension_reason = 'plaintes'`) le temps de l'enquête :
  - l'artisan est prévenu, avec un texte propre à ce cas ;
  - une note interne sur le ticket alerte l'équipe ;
  - la suspension est journalisée ;
  - un admin peut la lever depuis la fiche de l'artisan, comme une suspension décidée par l'équipe.
  - Un litige ouvert par l'artisan lui-même ne compte pas.
- **Liste noire** (`blocked_identities`, lue par l'équipe seulement) :
  - **inscription** : à la radiation, le SIREN, le téléphone et l'e-mail du radié y sont inscrits (radiés existants compris) ;
  - **contrôle** : un dossier qui reprend l'un d'eux ne peut pas être envoyé à la vérification (`submit_artisan_onboarding`). Le message est neutre : « Contactez l'équipe MENAO ».
- **Conseil sur l'acompte** (`depositAboveAdvice`) : sur la page du devis du client (site et application), quand la tranche à la signature dépasse 30 %, MENAO conseille de ne pas verser plus de 30 % avant le début des travaux. Rien n'est bloqué : 30 % reste la valeur par défaut des artisans.
- **Pas dans ce lot** :
  - **budget minimum dans les filtres de l'artisan** : la demande ne recueille pas encore de budget (lot 7, demande guidée) ;
  - **liste noire étendue** (pièce d'identité, appareil) : aucune de ces données n'est conservée de façon exploitable (la pièce d'identité doit d'ailleurs être supprimée après vérification).

## Conséquences
- **Migrations** `type_abonnement_impaye` (valeur d'enum seule) et `impayes_plaintes_liste_noire`. Tests pgTAP `82_impayes_plaintes_liste_noire`.
- **Après la fusion** : pousser les migrations, puis redéployer `notify` (modèles d'e-mails).
- **[TODO(legal)]** : suspension automatique sur plaintes et liste noire. Information des artisans dans les CGV et dans la charte (V6), et durée de conservation des données de la liste noire.
- **Pas de nouvelle dépendance.**
