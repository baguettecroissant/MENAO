# ADR 0199 — En-tête en pilule sur tout le site, champs sans zoom sur iPhone

- Statut : accepté
- Date : 27 octobre 2026
- Demande de l'utilisateur du 27 octobre 2026, avec des captures sur iPhone 13 et 16 Pro Max :
  - page décalée, qu'on peut faire glisser de côté ;
  - deux en-têtes sur l'accueil ;
  - souhait de garder la barre arrondie de l'accueil sur tout le site.

## Constats
- **Double en-tête** : l'en-tête blanc se masquait sur l'accueil d'après l'adresse de la page (`usePathname`). Sur menao.fr, l'accueil pré-généré (mode pré-lancement, ADR 0101) sortait avec l'en-tête blanc en plus de la pilule du bandeau. Il disparaissait seulement en revenant à l'accueil depuis une autre page. Ce n'était pas un cache du navigateur.
- **Page décalée sur iPhone** : tous les champs du site étaient en 15 px.
  - Safari zoome la page quand on touche un champ en dessous de 16 px (la recherche de l'accueil par exemple), puis la laisse zoomée.
  - Les pages s'enchaînent sans rechargement, donc le zoom suit sur les pages suivantes : contenu décalé, défilement de côté.
  - Aucun élément ne déborde : vérifié dans Chromium et WebKit, de 320 à 430 px.

## Décision
- **Un seul en-tête, la pilule en verre dépoli de l'accueil**, sur toutes les pages du site vitrine et de la recherche (`SiteHeader`). `HomeNav` est supprimée, donc plus aucun masquage selon l'adresse.
  - **Position** : la même que dans le bandeau de l'accueil (20 px du bord, 40 px dès `sm`). L'accueil passe dessous grâce à une marge négative de la hauteur de l'en-tête (76 px, 96 px dès `sm`). Le bandeau garde la place de la pilule.
  - **Défilement** : l'en-tête reste visible (`sticky` avec `top` négatif). La pilule s'arrête à 8 px du bord, soit 64 px de haut en tout comme l'ancienne barre. Les barres collées en `top-16` restent juste dessous.
  - **Clics** : seule la pilule les capte (`pointer-events`). Les marges transparentes laissent cliquer la page.
  - **Menu mobile** : une carte sous la pilule.
- **Champs en 16 px sur les écrans tactiles** (`pointer: coarse`), règle globale dans `globals.css`. Les ordinateurs gardent 15 px. Le calque de la suite grisée de la saisie du besoin suit la même taille (`champ-tactile`).

## Conséquences
- Pas de nouvelle dépendance ni de changement de texte.
- L'application native et les espaces connectés (coques de l'ADR 0034) ne changent pas, à part les champs à 16 px sur écran tactile.
