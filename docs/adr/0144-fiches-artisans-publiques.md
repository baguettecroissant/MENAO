# ADR 0144 — Fiches artisans publiques et badge « Assuré et vérifié par MENAO »

- Statut : accepté
- Date : 19 octobre 2026
- Phase D du plan SEO (ADR 0134, 0135). Choix de l'utilisateur du 18 octobre 2026 : fiches indexées par défaut, avec une case pour s'en retirer.

## Contexte
- **Le constat** : la fiche d'un artisan n'existait qu'à l'intérieur d'une recherche (`/recherche/<demande>/artisans/<id>`, en `noindex`). Google ne pouvait donc rien indexer de l'artisan lui-même, alors que « nom de l'entreprise + métier + ville » est une recherche courante.
- **Le badge** : un artisan qui affiche « vérifié par MENAO » sur son site rassure ses clients et crée un lien vers MENAO, utile au référencement des deux sites.

## Décision
- **Adresse stable** : `/artisans/<slug>`, fixée par la base à la validation du dossier, puis inchangée (changement de nom, suspension, rétablissement).
  - **Forme** : nom public et commune (« noe-plomberie-nice »), sans accents, avec un suffixe `-2`, `-3`… si elle est déjà prise.
  - **Nom public** : nom commercial, sinon raison sociale.
  - **Diffusion partielle à l'INSEE** (l'artisan a demandé que son identité ne soit pas publiée) : jamais la raison sociale, ni dans l'adresse, ni dans le titre, ni sur la fiche. L'adresse prend alors son premier métier (« plombier-nice »), et le titre son prénom.
  - **Commune** : commune de base, sinon la première commune de la zone.
- **La fiche** :
  - même contenu que la fiche de la recherche (`app.artisan_profile_json`) : jamais de téléphone, d'e-mail, d'adresse ni de SIRET ;
  - en ligne seulement si l'artisan est visible (dossier validé, abonnement et paiements actifs), sinon « introuvable » ;
  - **titre** : « Noé Plomberie, plombier à Nice — MENAO » ; description tirée de sa présentation ;
  - **données structurées** `HomeAndConstructionBusiness` : nom, zone, métiers, et note des avis vérifiés (sur 100) quand il y en a ;
  - « Décrire mon projet » mène à la recherche avec son métier : le particulier choisit ensuite les artisans à solliciter, dont celui-ci s'il intervient chez lui ;
  - liens vers les pages métier × ville de sa zone et vers la page du métier.
- **Liens et plan du site** :
  - les cartes des pages métier × ville mènent à la fiche ;
  - le plan du site liste les fiches des artisans visibles qui n'ont pas demandé leur retrait de Google.
- **Retrait de Google** : case « Afficher ma fiche dans Google » dans « Ma fiche publique » (site), cochée par défaut (`artisans.indexable`).
  - Décochée, la fiche reste accessible par son adresse mais passe en `noindex, follow` et sort du plan du site.
  - Le cache de la fiche est vidé à l'enregistrement.
  - La base n'autorise l'artisan à modifier que cette colonne, et pas l'adresse.
  - Le back-office montre l'adresse et ce choix dans la section « Visibilité ».
- **Badge** `/badge/<slug>.svg`, avec le code à coller dans « Ma fiche publique » :
  - « Assuré et vérifié par MENAO » seulement si l'artisan a le badge de la fiche (ADR 0119) ; sinon une mention neutre, « Artisan sur MENAO » ;
  - « introuvable » si l'artisan n'est plus visible ;
  - texte de remplacement neutre (« <Nom> sur MENAO »), qui reste vrai quel que soit l'état ;
  - SVG autonome, gardé une heure en cache par le CDN : au plus une fonction par heure et par badge, quel que soit le trafic du site qui l'affiche.
  - Il reste servi pendant le pré-lancement, comme les bannières.
- **Coût (règle 13)** : fiche générée à la première visite, puis gardée une heure en cache.
- **Pré-lancement** : les fiches restent derrière la page d'attente, comme le reste du site (seule la page d'attente est indexable, choix du 18 octobre 2026).

## Conséquences
- **Chaque artisan visible a une page à son nom**, indexable dès la levée du pré-lancement (phase C).
- **Application** : ni adresse, ni badge, ni lien vers le site (règle 10). La case Google pourra y être ajoutée si besoin.
- **Plus tard** :
  - proposer l'artisan de la fiche en tête des résultats quand le particulier vient de sa fiche ;
  - le baromètre des prix (phase D), quand les données le permettront ;
  - le suivi des citations par les assistants IA.
- **[TODO(legal)]** : inscrire l'indexation par défaut, et le droit de s'y opposer, dans les CGV artisans.
- **Migration `fiches_artisans_publiques`** : deux colonnes, six fonctions (dont celle du déclencheur) et un déclencheur. Tests pgTAP `74_fiches_artisans_publiques`, e2e `fiches.spec`. Pas de nouvelle dépendance.
