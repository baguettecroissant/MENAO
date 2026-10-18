# ADR 0134 — Fondations SEO et IA du site vitrine

- Statut : accepté
- Date : 18 octobre 2026
- Complète les ADR 0015 (site public et SEO) et 0101 (mode pré-lancement).

## Contexte
- **Objectif de l'utilisateur** : faire du site vitrine une source d'acquisition des particuliers et des artisans, sur Google et dans les assistants IA (ChatGPT, Claude, Perplexity, Gemini…).
- **Constat en production** :
  - `robots.txt` interdit tout (`ALLOW_INDEXING` absent) ;
  - le pré-lancement réécrit chaque adresse vers `/bientot`, si bien que rien n'est indexé et que le domaine n'accumule aucune ancienneté.
- **Ce qui existait** : 19 pages métier, les pages métier × commune pilote, des données structurées Service, ItemList, BreadcrumbList et FAQPage, et un sitemap.
- **Ce qui manquait** :
  - une identité de MENAO lisible par les moteurs ;
  - une page À propos ;
  - un fichier pour les assistants IA ;
  - une protection contre les pages ville sans contenu propre ;
  - des pages qui s'adressent aux artisans métier par métier.
- **Choix de l'utilisateur** :
  - tous les robots des IA sont autorisés sur le site public ;
  - pendant le pré-lancement, seule la page d'attente est indexable ;
  - on commence par ces fondations, puis les premiers guides, relus par l'utilisateur avant publication.

## Décision
- **Pré-lancement** (`prelaunchIndexing`, production seulement) :
  - `robots.txt` = `Allow: /$` + `Disallow: /` : Google applique la règle la plus précise, donc seul l'accueil est exploré ;
  - la page d'attente porte le titre de la marque, l'adresse canonique `/`, `index, nofollow`, et l'identité Organization.
  - Hors production, et tant que `ALLOW_INDEXING` est absent, tout reste fermé, comme avant.
- **Robots des IA** :
  - après le lancement, une règle explicite autorise les robots des assistants IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, etc.) ;
  - ces robots sont soumis aux mêmes interdictions que les autres : espaces privés, recherche, connexion, back-office.
- **Identité** (`structured-data.ts`) :
  - Organization et WebSite reliés par leur `@id` (logo, zone, sujets, contact), affichés sur l'accueil et sur la page À propos ;
  - les services des pages métier et ville renvoient à ce même `@id`.
  - Aucune donnée d'entreprise (raison sociale, SIREN, adresse) n'est publiée tant que les mentions légales ne sont pas complétées.
- **Page À propos** (`/a-propos`) : la mission, quatre engagements vérifiables (artisans vérifiés, zéro commission, messagerie, avis), la zone et des liens vers les pages clés. Données structurées AboutPage.
- **llms.txt et llms-full.txt** (format llmstxt.org) :
  - la présentation de MENAO et les liens vers les pages clés et les métiers ;
  - la version complète ajoute les faits clés, le fonctionnement pour les particuliers et pour les artisans, les communes et la FAQ.
  - Ces fichiers sont générés depuis les textes de l'interface et le catalogue, donc jamais désynchronisés, et ils restent invisibles pendant le pré-lancement.
- **Pages ville sans artisan** :
  - elles restent utiles au visiteur, mais passent en `noindex, follow` et sortent du sitemap, car leur contenu est trop proche de celui des autres communes ;
  - elles redeviennent indexables dès qu'un artisan y intervient (`cityArtisans`, en cache une heure, partagé entre la page, ses métadonnées et le sitemap).
- **Espace Pro par métier** (`/pro/<métier>`, pré-générées, `dynamicParams=false`) :
  - destinées aux artisans qui cherchent des chantiers (« artisan plombier Alpes-Maritimes ») ;
  - contenu : prestations du métier (référentiel des travaux), fonctionnement, communes pilotes, FAQ propre au métier, avec les mêmes engagements que la page Espace Pro.
  - Maillage : chaque page métier particuliers renvoie à sa page Pro et inversement, et `/pro` liste tous les métiers.
  - Elles figurent dans le sitemap et dans le llms.txt.
- **FAQ Espace Pro** : l'attestation de vigilance URSSAF, exigée par l'inscription, est ajoutée à la liste des pièces.

## Conséquences
- **Au lancement**, il suffira de lever le pré-lancement et de poser `ALLOW_INDEXING=true` : robots, sitemap, identité et llms.txt sont prêts.
- **Pendant le pré-lancement**, la marque peut déjà être indexée sur la page d'attente.
- **Prochaines étapes** :
  - les premiers guides, relus avant publication, avec des sources pour le juridique et le fiscal ;
  - au lancement : Search Console, Bing Webmaster Tools et IndexNow ;
  - les fiches artisans publiques, indexées par défaut avec une case pour s'en retirer, à inscrire dans les CGV artisans [TODO(legal)].
- **Aucune migration**, aucune dépendance nouvelle, aucun service propriétaire Vercel.
