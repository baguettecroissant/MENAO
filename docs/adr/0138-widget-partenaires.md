# ADR 0138 — Widget et kit des partenaires

- Statut : accepté
- Date : 19 octobre 2026
- Lot 2 du programme Partenaires (ADR 0136, 0137), première partie.

## Contexte
- **Demande de l'utilisateur** : un système « comme travaux.com, Viteundevis, Bobex », avec des liens affiliés et des iframes à intégrer chez les partenaires.
- **Ce qui existait** : les liens `menao.fr/p/<code>` (ADR 0136). Le site interdit tout affichage dans un cadre (`frame-ancestors 'none'`, `X-Frame-Options: DENY`, ADR 0103).
- **Contraintes** :
  - **pas de traceur** : la CNIL n'exempte pas de consentement les cookies d'affiliation ;
  - **pas de donnée personnelle chez le partenaire** ;
  - **les cookies tiers sont bloqués** par Safari et Chrome dans les iframes : une session ou une demande complète dans l'iframe échouerait ;
  - **pas de fonction serveur supplémentaire** (règle 13).

## Décision
- **Page `/widget`**, statique et non indexée, sans l'en-tête ni le pied de page du site, sur fond transparent : le métier (facultatif), la description du projet, puis « Décrire mon projet sur MENAO ».
  - C'est un formulaire GET vers `/recherche` dans un nouvel onglet, avec le code partenaire (`p`), le métier et la description (`q`), déjà lus par la saisie du besoin.
  - La demande se poursuit sur menao.fr, dans une fenêtre normale : session, compte et envoi aux artisans fonctionnent comme d'habitude, et l'attribution suit le circuit de l'ADR 0136.
  - Rien n'est enregistré dans l'iframe : ni cookie, ni stockage, ni appel à la base.
- **Seule page affichable dans un cadre** :
  - pour `/widget` : `frame-ancestors https:`, sans `X-Frame-Options` (en-têtes de `next.config`, option `embeddable` de la CSP) ;
  - pour tout le reste du site : `frame-ancestors 'none'` et `X-Frame-Options: DENY`.
- **Script `widget.js`** (fichier statique) :
  - le partenaire colle un conteneur `data-menao-widget data-partenaire="<code>"` (et `data-metier` s'il le souhaite) et le script ;
  - le script crée l'iframe, puis ajuste sa hauteur d'après le message `menao:widget-height`, accepté seulement depuis l'origine de MENAO ;
  - il ne lit rien sur la page du partenaire.
- **Kit sur la fiche du partenaire** (back-office), chaque extrait à copier : lien texte, bouton HTML (styles en ligne, sans script), widget avec script, et iframe seule en repli.
  - Les extraits sont produits par `partnerSnippets` (`@menao/core`, testé).
  - **Rappel affiché** : un créateur de contenu doit signaler le partenariat (« Publicité » ou « Collaboration commerciale », loi du 9 juin 2023).
- **Pré-lancement** : `/widget` et `widget.js` restent masqués comme le reste du site jusqu'au lancement (ADR 0101).

## Conséquences
- **Un partenaire intègre MENAO en une ligne.** Les demandes arrivent attribuées, sans traceur.
- **Suite du lot 2** :
  - un espace partenaire (chiffres, liens et kit, par un lien privé) ;
  - une page publique « Devenir partenaire ».
- **Pas de nouvelle dépendance**, aucune fonction serveur : la page est statique et le script est un fichier.
