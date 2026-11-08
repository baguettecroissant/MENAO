# ADR 0251 — Espace client repensé (refonte « Nette », lot 6)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0250. Lot 6 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Accueil « Mes chantiers »** : date, grand titre et phrase « N choses à faire… » ; chiffres clés (chantiers en cours et devis à signer, prochain rendez-vous, payé via MENAO ; « à faire » sur téléphone) calculés par `clientHomeFigures` (@menao/core, testé, partagé avec l'application) ; deux colonnes en grand écran : à gauche les créneaux à choisir, « À faire maintenant », les chantiers en cours, les demandes et les terminés ; à droite « Comment vous payez » et « Inviter un artisan ».
- **Fiche d'un chantier** : mêmes briques que les fiches de l'artisan (ADR 0246) — en-tête à grand titre (métier, état, adresse), frise des cinq étapes dans une carte, action attendue, puis deux colonnes : suivi ou dossier et le projet du client à gauche, l'artisan (appeler, écrire), l'invitation à noter, « Redemander un devis », le signalement et l'annulation à droite.
- **Devis à signer** : en-tête à grand titre (état, validité) ; le devis à gauche ; à droite, collée en grand écran, une carte avec le total TTC, HT et TVA, l'échéancier « À payer » et les boutons (signer, demander une modification, refuser, ou payer l'acompte).
- **Application** : même modèle sur l'accueil du particulier et la fiche de son chantier.

## Conséquences
- Tous les blocs existants sont gardés (actions, onglets, journal, réception, réserves, avis, signalement) : seule leur mise en page change.
- La photo de couverture de la fiche du chantier n'est plus affichée (l'en-tête suit celui des fiches de l'artisan).
- Écarts assumés : le grand titre reste « Mes chantiers » (« Bonjour Prénom » de la maquette n'est pas repris) ; la carte « Vos paiements sont protégés » devient « Comment vous payez », au texte factuel (MENAO ne détient pas l'argent des chantiers, règle 12) ; le numéro du devis n'est pas répété dans l'en-tête (il figure sur le document).
