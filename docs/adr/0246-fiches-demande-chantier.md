# ADR 0246 — Fiches « demande » et « chantier » repensées (refonte « Nette », lot 1)

- Statut : accepté
- Date : 7 novembre 2026
- Suite de l'ADR 0245. L'utilisateur a relevé que la PR des « autres écrans » n'était qu'un socle (police, titres, listes) et non une refonte comme l'accueil. Méthode retenue : maquette, validation, puis code fidèle, par lots. Lot 1 : la fiche d'une demande et la fiche d'un chantier, maquettées sur ordinateur, téléphone et application, validées le 7 novembre.

## Décision
- **Fiche d'une demande** : en-tête à grand titre (métier, état, prénom, ville, date de réception) et **compte à rebours** « Répondez sous N h » avec la barre des 72 h ; **bandeau de décision** bleu nuit (« Prénom attend votre réponse », Refuser, Fixer un rendez-vous, Proposer des créneaux s'il y en a) en grand écran, **barre collée en bas** sur téléphone et dans l'application (un seul jeu de boutons, déplacé par `order-last`) ; puis « La demande en bref » (résumé de l'IA) en grand, « Ce que dit le client » (description en citation, message, photos), « Détails du chantier » en grille ; à droite la carte du client (créneau de rappel, lieu, coordonnées après le rendez-vous), « Il faut un autre métier ? » et le signalement d'un faux particulier.
- **Fiche d'un chantier** (avant et après l'acompte, même cadre) : en-tête à grand titre avec Message et Appeler ; **frise des 5 étapes** en grand ; carte **« Prochaine étape »** sur fond bleu clair avec le bouton du moment (créer ou modifier le devis, déclarer le chantier terminé, signaler la levée des réserves) ou l'attente en cours (signature, acompte, réception) ; onglets en pilules **Suivi / Dossier / Messages** (non-lus) ; le suivi devient un **fil chronologique par jour** (`journalTimeline` dans `@menao/core`, testé) avec messages et vignettes ; à droite **l'argent du chantier** (devis signé, part payée, acompte, solde, devis et factures), le client, l'équipe, le rendez-vous, les notes privées, l'expertise et le signalement d'un problème.
- Aucune fonction retirée : les formulaires (fixer, modifier, confirmer la date de démarrage, déclarer la fin…) et les droits d'équipe (ADR 0241) restent les mêmes. Les libellés lus par les tests de bout en bout sont conservés (onglets nommés « Suivi du chantier » / « Dossier du chantier » pour l'accessibilité, « Informations du rendez-vous », « Appeler Prénom »…).

## Application
- Mêmes fiches dans l'application : `components/pro/fiche-kit.tsx` (écran à barre de retour, en-tête, frise, « Prochaine étape », onglets en pilules, barre d'actions collée en bas) et `components/pro/chantier-fiche.tsx` (cadre du chantier, argent, planning, notes). Le fil du suivi utilise `journalTimeline` de `@menao/core` ; l'appli ne fait que l'affichage (libellés de date, auteur, liens signés des photos).
- Avant l'acompte, pas d'onglets ; après, Suivi / Dossier / Messages (la conversation, avec ses non-lus). La confirmation de la date de démarrage passe dans la carte « Prochaine étape ».
- Écarts assumés : pas de faux plan dans la carte du client (lien « Ouvrir la carte »), pas de menu « … », pas de pourcentage d'acompte.

## Conséquences
- Nouvelles briques côté site : `components/pro/sheet.tsx` (page, en-tête, puce, compte à rebours, colonnes, carte « Prochaine étape ») et `components/pro/chantier-sheet.tsx` (frise, onglets, argent, fil du suivi) ; blocs de demande en cartes dans `request-blocks.tsx`.
- La vue côté client garde ses composants (frise, onglets) : elle sera reprise avec son lot.
- Lots suivants : éditeur de devis et listes de l'argent, puis listes demandes et chantiers, agenda, messages et secrétaire, vitrine et profil, espace client et back-office.
