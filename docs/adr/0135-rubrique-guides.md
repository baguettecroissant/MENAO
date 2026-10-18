# ADR 0135 — Rubrique Guides : articles sourcés, relus avant publication

- Statut : accepté
- Date : 18 octobre 2026
- Suite de l'ADR 0134 (fondations SEO et IA).

## Contexte
- **Phase B du plan SEO** : du contenu utile, qui répond aux questions des particuliers et des artisans. Google et les assistants IA citent ce type de page.
- **Exigences de l'utilisateur** :
  - commencer par 3 à 5 articles de fond ;
  - les relire avant toute publication ;
  - aucun chiffre ni règle juridique sans source.
- **Contraintes du projet** :
  - pas de nouvelle dépendance ;
  - pages statiques ;
  - textes centralisés ;
  - `TODO(legal)` en cas de doute sur une règle.

## Décision
- **Contenu en données TypeScript** (`src/content/guides`, un fichier par guide) :
  - titre, description, dates, public (particuliers ou artisans) et « L'essentiel » ;
  - corps en blocs : intertitres ancrés, paragraphes, listes, tableaux, encadrés « Sur MENAO » ou « À savoir » ;
  - FAQ, sources officielles et liens associés.
  - Dans le texte, `[libellé](/chemin)` crée un lien et `**texte**` met en gras. Aucun moteur Markdown n'est nécessaire.
- **Brouillons** (`draft: true`) :
  - visibles en local et sur les déploiements de prévisualisation (`VERCEL_ENV` différent de `production`), pour la relecture ;
  - en production, ils ne sont pas générés et répondent 404 ;
  - partout, ils sont exclus du sitemap, du llms.txt et des données structurées, et portent `noindex, nofollow` ;
  - le sommaire `/guides` n'est pas indexé tant qu'aucun guide n'est publié.
  - **Publier un guide** consiste à passer `draft` à `false`, une fois le texte validé.
- **Pages** :
  - `/guides` : les guides regroupés par public, avec les données structurées CollectionPage et ItemList ;
  - `/guides/<slug>` (pré-générées, `dynamicParams=false`) : l'essentiel en tête, un sommaire (latéral sur ordinateur, repliable sur mobile), le corps, la FAQ, les sources avec leur éditeur et un avertissement « information générale » ;
  - en bas de page : « À lire aussi », puis un appel à l'action vers la recherche, ou vers l'inscription pro pour les guides destinés aux artisans ;
  - données structurées Article (auteur et éditeur : l'organisation MENAO, sources en `citation`), FAQPage et BreadcrumbList.
- **Maillage** : un lien « Guides » dans le pied de page dès qu'un guide est visible, et des liens entre les guides, vers les pages MENAO et depuis l'encadré « Sur MENAO ».
- **Premiers guides**, tous en brouillon, relus par l'utilisateur avant publication :
  - choisir un artisan : 8 vérifications ;
  - les mentions obligatoires d'un devis ;
  - l'assurance décennale ;
  - la TVA à 5,5 % ou 10 % ;
  - la facture électronique pour les artisans.
  - **Sources** : Service Public, impots.gouv.fr, BOFiP, DGFiP, France Rénov', Légifrance.
  - **Points marqués `TODO(legal)`** : la TVA et la facture électronique, à relire par l'expert-comptable ; les travaux non soumis à la décennale ; la rétractation pour un devis signé en ligne ; les travaux supplémentaires.
- **Tests** :
  - un test de bout en bout couvre le sommaire, l'article, le brouillon non indexé et le sitemap ;
  - un second vérifie que les intertitres sont uniques, que les sources sont en https, et que chaque lien interne répond 200.

## Conséquences
- Ajouter un guide revient à ajouter un fichier, sans toucher aux pages.
- La date de mise à jour est affichée et reprise dans le sitemap (`lastModified`) : un guide se met à jour quand la règle change.
- Les guides ne sont visibles en production qu'après la levée du pré-lancement (ADR 0101).
- Aucune migration, aucune dépendance, aucun service propriétaire Vercel.
