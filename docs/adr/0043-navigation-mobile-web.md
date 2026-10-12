# ADR 0043 — Navigation mobile du site : menu latéral en tiroir, sans onglets en bas d'écran

- Statut : accepté
- Date : 12 octobre 2026
- Remplace, pour le site web, les onglets mobiles des ADR 0034 (coques site et application) et 0035 (menu latéral). Complète l'ADR 0042 (recherche dans l'espace client).

## Contexte
- Sur téléphone, l'espace client avait une barre d'onglets en bas d'écran (Chantiers, Documents, bouton central « Démarrer un chantier », Messages, Aide), reprise de la maquette « Mes chantiers - Mobile ». L'espace pro avait la sienne (Tableau de bord, Demandes, Chantiers, Devis, Messages). L'admin avait déjà le menu latéral en tiroir.
- Deux modèles de navigation coexistaient donc sur le web : menu latéral sur ordinateur, onglets sur téléphone. Les onglets ne montraient qu'une partie des rubriques (pas d'agenda, d'avis, de fiche publique ni de dossier côté pro) et n'apparaissaient que sur certains écrans.
- Dans un navigateur mobile, une barre fixée en bas d'écran se superpose aux barres d'outils du navigateur (Safari en particulier) et réduit la hauteur utile.
- Les barres d'onglets en bas d'écran sont la navigation attendue dans une application iOS ou Android : elles seront reprises dans les applications natives (Expo, `apps/mobile`), décision du porteur du projet.

## Décision
- **Site web, tous les espaces** (client, pro, admin) : le même menu latéral que sur ordinateur, ouvert en tiroir par le bouton « Ouvrir le menu » de la barre du haut. Plus d'onglets en bas d'écran.
- **Accès rapides gardés dans la barre du haut, côté client** :
  - une icône de recherche mène à « Démarrer un chantier » (`/mon-espace/nouvelle-demande`), à la place de la barre de recherche affichée sur les écrans plus larges ;
  - l'icône des messages, avec le nombre de messages non lus ;
  - la cloche et le menu du compte, comme avant.
- **Téléphones étroits** (moins de 420 px) : la barre du haut affiche le symbole MENAO seul, sans le nom, pour que toutes les icônes tiennent dès 320 px.
- **Applications natives** : la barre d'onglets de la maquette « Mes chantiers - Mobile » sera celle des applications iOS et Android.

## Conséquences
- Une seule navigation à maintenir sur le web. Le tiroir donne accès à toutes les rubriques, ainsi qu'à « Aide et support ».
- Les barres d'actions collées en bas des fiches (devis, chantier, suivi) n'ont plus à cohabiter avec des onglets.
- Les tests de bout en bout ouvrent le tiroir pour naviguer sur mobile.
