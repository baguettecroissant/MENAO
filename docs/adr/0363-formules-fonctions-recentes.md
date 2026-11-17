# ADR 0363 — Formules à jour : fonctions récentes au comparatif, réservées pour de bon, et « Ma formule » dans l'application (F-172, lot 69)

- Date : 17/11/2026
- Fonctionnalité : F-172 ; planches du lot 69 (« FormulesProposition », « MaFormuleApp »),
  validées le 17/11/2026. Complète les ADR 0200 (comparatif), 0231 (droits des formules),
  0287 (appels d'offres) et 0290 (limites).

## Contexte

Le comparatif des formules ne disait rien des fonctions ajoutées depuis fin octobre, et
l'application ne montrait nulle part la formule de l'artisan. L'import de catalogue, les prix à
jour et la hausse des prix n'étaient réservés à aucune formule dans le code.

## Décision

- **Sept lignes au comparatif** (`plan_features`) : demandes urgentes et bibliothèque d'ouvrages
  MENAO (toutes les formules) ; import de catalogue, prix à jour d'après les factures, suivi des
  paiements à encaisser (Premium et Entreprise) ; DPGF créé depuis un plan et questions à MENAO
  sur les plans (Entreprise). Rangement proposé puis validé par l'utilisateur.
- **Réservé pour de bon** : deux droits dans `plans.limites.agents`, `import_catalogue` et
  `prix_a_jour`. La base refuse l'import, la mise à jour des prix d'après les factures et la
  hausse des prix sans ce droit (`app.plan_right_artisan`), et `library-import` le vérifie avant
  de lire le fichier, donc avant tout appel à l'IA. Les trois fonctions SQL sont complétées en
  place (`pg_get_functiondef`), jamais recopiées. Sans formule en cours, les droits de Base
  s'appliquent.
- **Écrans** : sur le site, la page de l'outil explique la fonction et renvoie vers les formules
  (`PlanLocked`). Dans l'application, une explication seule (`withPlanRight`), sans prix ni lien
  d'achat (règle 10).
- **« Ma formule » dans l'application** (`/pro-formule`, patron) : la formule et son état, les
  compteurs du mois (demandes, minutes de voix, comptes), ce qu'elle comprend par thème d'après le
  comparatif (`planContents`, core), puis ce qu'elle ne comprend pas. Une ligne dans
  « Mon profil ». Ni prix, ni bouton, ni lien vers le site.

## Conséquences

- Un artisan en formule Base perd l'import de catalogue, les prix à jour et la hausse des prix.
  Avant le lancement, personne n'est concerné en production.
- Les tests de bout en bout de ces trois fonctions passent l'artisan du seed en Premium le temps
  du test (`e2e/plan.ts`).
- Le bloc « Non compris dans votre formule » de l'application ne propose rien à acheter ; à
  retirer si Apple le lit comme une incitation.
- La mise en valeur des formules sur le site vitrine (au-delà du comparatif) reste à faire.
