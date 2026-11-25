# 0392 — Codes d'essai de l'inscription artisan

- Statut : acceptée
- Date : 2026-11-25
- Fonctionnalité : F-192 (maquette lot 82, validée le 25/11/2026)

## Contexte

Mickaël (associé) veut pouvoir tester l'inscription artisan de bout en bout sans passer vingt
minutes à photographier de vrais documents à chaque essai.

## Décision

- Un admin crée un **code d'essai** dans Réglages › Codes d'essai (durée de 1 à 90 jours, de 1 à
  500 utilisations), et peut le désactiver. Le code partage l'espace des autres codes (partenaires,
  parrains, commerciaux, codes de suivi : `app.link_code_taken`).
- Saisi dans « J'ai un code » à l'inscription, il fait du compte un **compte d'essai**
  (`artisans.compte_essai`) : `masque_public` (jamais visible des clients), SIRET saisi remplacé
  par un SIRET d'essai (`999…`, clé de Luhn juste) pour laisser le vrai libre, aucune attribution
  (ni partenaire, ni commercial, ni parrainage, ni prime). L'ancienne fonction
  `app.apply_artisan_signup` est gardée telle quelle sous le nom
  `apply_artisan_signup_attributions` et appelée sans le code.
- « Remplir » sur chaque ligne de « Mon inscription » et « Tout remplir » jusqu'à une étape
  (`fill_test_onboarding`) écrivent des données fictives : entreprise d'essai, premier métier,
  zone de 30 km autour de Grasse, charte, Kbis et pièce d'identité, présentation, trois
  attestations. Les documents d'exemple ont la source `essai` et aucun fichier derrière.
  La formule et les paiements ne se remplissent pas (Stripe en mode test).
- À l'envoi, un compte d'essai est **validé tout de suite** (option B choisie par l'utilisateur) :
  documents validés, statut `valide`, rôle `artisan`, décision « validé automatiquement » dans
  `artisan_reviews` (e-mail « dossier validé » envoyé au compte d'essai), sans e-mail à l'équipe.
- Les comptes d'essai sont exclus de `app.launch_artisans` (chiffres de lancement, codes de
  suivi, rythme des conseillers). Un admin les supprime en un clic (`admin_delete_test_account` :
  utilisateur, fiche et documents en cascade).

## Conséquences

- Les autres listes du back-office (dossiers, comptes, vue d'ensemble) montrent encore les comptes
  d'essai : leur raison sociale commence par « ESSAI · » pour les reconnaître.
- Dans l'application, le bandeau « Tout remplir » de l'écran du dossier remplit toutes les étapes ;
  « Remplir » ligne par ligne et l'écran des attestations restent sur le site.
