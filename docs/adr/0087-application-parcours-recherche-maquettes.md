# ADR 0087 — Application : saisie, critères et création du compte d'après les maquettes

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- L'audit des maquettes face au site et à l'application (14 octobre 2026) relève trois écarts dans le parcours de recherche de l'application :
  - **saisie du projet** : écran « Votre projet » (titre en barre, champ, bouton de dictée séparé, bouton « Ajouter des photos », exemples, tous les métiers en puces) ; la maquette « Recherche » et le site montrent un titre, une zone de saisie avec trombone et micro intégrés, une aide qui change pendant la saisie, cinq raccourcis métiers puis « … » et quatre cartes d'avantages ;
  - **vérification des critères** : toutes les puces dépliées ; la maquette et le site montrent un résumé par carte avec un crayon, et la modification dans la carte ;
  - **création du compte avant l'envoi** : deux onglets « Créer / Se connecter » ; la maquette « Dernière étape » et le site montrent les cartes « Informations personnelles », « Créer mon espace client » et « Vous avez déjà un espace ? », sous le résumé du besoin.

## Décision
- **Saisie du projet** :
  - titre « Trouvez l'artisan du BTP dont vous avez besoin » et accroche « Recherche rapide et intelligente » ;
  - zone de saisie : photos jointes en miniatures dans la zone, trombone à gauche (10 photos au plus), micro à droite ; au repos, la dictée n'affiche que son bouton rond ;
  - aide progressive sous la zone, calculée par `needHelpLevel` (`packages/core`), avec les textes du site ;
  - raccourcis métiers du site (domaine et emoji, `fr.tradeDomains`) : cinq visibles dans l'ordre des maquettes, puis « … » ;
  - bouton « Trouver mon artisan du BTP idéal », mention sur l'analyse par l'IA, puis les quatre cartes d'avantages du site (« Réponse sous 48 h » plutôt que « Devis sous 72 h », comme sur le site) ;
  - les exemples « Besoin d'inspiration ? », absents de la maquette et du site, sont retirés.
- **Vérification des critères** :
  - cartes « Artisan recherché », « Informations sur le chantier », « Adresse » et « Date de début souhaitée » : titre avec icône, crayon, résumé en puces ;
  - la modification se fait dans la carte, avec « Annuler » / « Enregistrer » ; les autres cartes sont verrouillées pendant ce temps et la recherche attend la fin de la modification ;
  - le métier ou la ville manquants ouvrent directement leur carte ;
  - l'enregistrement en base reste unique, au lancement de la recherche (`saveAndValidateCriteria`), comme avant.
- **Création du compte avant l'envoi** :
  - résumé du besoin en haut, comme sur le formulaire d'envoi (le projet appartient encore à la session anonyme, lisible par RLS) ;
  - formulaire d'inscription en deux cartes, dont le titre passe au vert avec une coche une fois remplie ; encart « 100 % gratuites » ;
  - carte « Vous avez déjà un espace MENAO ? » qui bascule vers la connexion, et inversement ;
  - l'inscription depuis l'écran « Créer un compte » garde sa présentation en une colonne.
- Textes alignés sur ceux du site. Aucune migration, aucune nouvelle dépendance.

## Conséquences
- Le parcours de recherche de l'application suit les maquettes et le site, de la saisie à la création du compte.
