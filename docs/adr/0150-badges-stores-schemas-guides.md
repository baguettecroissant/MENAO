# ADR 0150 — Badges des stores et schémas des guides

- Statut : accepté
- Date : 19 octobre 2026
- Lot 5 de l'audit du site vitrine du 19 octobre 2026 (contenus vivants), avec les badges App Store et Google Play demandés par l'utilisateur. Modifie l'ADR 0148 (bandeau de l'accueil).

## Contexte
- **Constat de l'audit** :
  - aucun badge des stores ni aucune section consacrée à l'application ;
  - des guides sans schéma, où les durées, les taux et les circuits ne se lisent qu'en texte.
- **Demande de l'utilisateur** : « montrer que c'est dispo dans les stores ».
- **L'application n'est pas encore publiée** (TestFlight). Ses fiches sur l'App Store (id 6823851192) et sur Google Play (fr.menao.app) renvoient une erreur 404.
- **Choix de l'utilisateur** :
  - badges visibles tout de suite, avec les futurs liens ;
  - téléchargement des badges officiels ;
  - badges dans le pied de page, dans une section de l'application sur l'accueil et dans la page Pro ;
  - puis le téléphone du bandeau de l'accueil retiré (« trop chargé »), remplacé par des badges discrets.

## Décision
- **Badges** :
  - fichiers officiels, sans modification (règles d'Apple et de Google), dans `public/images/stores` :
    - Apple, « Télécharger dans l'App Store », SVG noir en français (toolbox.marketingtools.apple.com) ;
    - Google, « Disponible sur Google Play », PNG en français (play.google.com/intl/fr/badges) ;
  - même hauteur visible (40 px) pour les deux. Le PNG de Google, qui a une marge transparente, est affiché plus haut avec une marge négative ;
  - les liens sont dans `lib/site/stores.ts`. `NEXT_PUBLIC_APP_STORE_URL` et `NEXT_PUBLIC_PLAY_STORE_URL` les remplacent au besoin ;
  - la fenêtre de l'espace client et le lien `/application` du QR code ne changent pas : ils n'apparaissent qu'une fois les variables renseignées.
- **Emplacements** :
  - **bandeau de l'accueil**, à la place du téléphone (modifie l'ADR 0148) : en bas à droite sur grand écran, sous les raccourcis des métiers sur mobile et tablette ;
  - **pied de page**, sous la zone et le paiement Stripe ;
  - **accueil**, une section de l'application après l'espace client : les textes de la fenêtre « Suivez tous vos chantiers, depuis votre poche » (maquette), trois vrais écrans en éventail (accueil, devis, suivi de chantier) et les badges ;
  - **page Pro**, dans le bandeau, sous les arguments.
- **Schémas des guides**, dessinés en HTML à partir des données du guide (`components/site/guide-figures.tsx`). Le texte reste lisible par les lecteurs d'écran et traduisible. Quatre nouveaux types de blocs :
  - `periods` : frise des trois garanties, comptées depuis la réception (assurance décennale) ;
  - `decision` : le taux de TVA des travaux en trois questions (TVA à taux réduit) ;
  - `flow` : le circuit des factures à partir du 1er septembre 2027 (facture électronique) ;
  - `document` : les mentions obligatoires, zone par zone, sur un devis (devis de travaux).
  - Les schémas reprennent ce que disent les guides, sans rien y ajouter. Ils ne remplacent ni les tableaux ni les listes.
- **Non traité ici** :
  - les illustrations (série E de l'audit), qui attendent des images ;
  - les vrais témoignages et les avant/après, après le lancement et avec l'accord écrit des personnes ;
  - « Relu par… » dans les guides, tant qu'aucun relecteur n'est désigné.

## Conséquences
- **Le produit et les stores se voient** sur l'accueil, la page Pro et toutes les pages, par le pied de page.
- **Liens morts jusqu'à la publication** : les badges mènent à une erreur 404 tant que l'application n'est pas en ligne. Le site restant derrière la page d'attente, seuls les testeurs les voient. À vérifier le jour de la sortie, en particulier pour Google Play.
- **Un nouveau schéma** s'ajoute dans les données d'un guide, avec un de ces quatre types. Le test e2e vérifie qu'il s'affiche.
- **Pas de nouvelle dépendance.**
