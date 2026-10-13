# ADR 0056 — Application : recherche native (lot 6b, partie 2)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- La partie 1 (ADR 0055) ouvrait la recherche du site dans l'application, en attendant mieux.
- La recherche doit maintenant se faire dans l'application, avec les mêmes règles que le site : session anonyme, analyse IA, critères vérifiés par la base, artisans choisis par la base (ADR 0012).

## Décision
- **Même mécanique que le site, sans rien dupliquer côté serveur** :
  - **session anonyme** Supabase créée au premier lancement d'une recherche ; elle reste un visiteur pour l'application (ADR 0055) ;
  - **analyse** par l'Edge Function `analyze-need`, qui crée le projet ;
  - **critères** enregistrés par `save_project_criteria`, après validation par le même schéma Zod (`projectCriteriaSchema`), puis vérifiés par `validate_project_criteria` (métier et ville) ;
  - **artisans** choisis et classés par `match_artisans` (5 au plus), affichés avec les mêmes règles que le site (`availability`, `specialtiesPreview`).
- **Écran d'analyse animé**, adapté de celui du site :
  - le logo se dessine, les ondes partent du centre, les métiers tournent en orbite, les étapes se cochent et des faits sur MENAO défilent ;
  - il utilise l'API `Animated` de React Native ;
  - il s'arrête quand le téléphone demande moins d'animations (`useReduceMotion`).
- **Vérification des critères** en un seul écran :
  - métier, travaux du métier, lieu, pièces, surface, ville, adresse exacte, date de début ;
  - un seul bouton « Trouver l'artisan idéal » enregistre le tout.
- **Adresses** : Géoplateforme (Base Adresse Nationale), comme sur le site.
  - L'adresse de recherche et la lecture des réponses sont désormais partagées dans `@menao/validation` (`geo.ts`), utilisées par le site et par l'application.
  - L'adresse exacte est cherchée dans la seule ville choisie (F-07).
- **Date de début** :
  - calendrier natif (`@react-native-community/datetimepicker`, inclus dans Expo Go), sans date passée ;
  - sur la version web de développement, un simple affichage.
- **Résultats en lecture seule** dans cette partie. La fiche de l'artisan et l'envoi de la demande arrivent dans la partie 3.

## Conséquences
- **Partie 3** du lot 6b : fiche de l'artisan, choix de 3 artisans au plus, envoi de la demande et création du compte.
  - Le projet de la session anonyme sera transféré au compte, comme sur le site (`create_project_transfer`, puis `claim_project`).
  - D'ici là, un visiteur qui crée son compte depuis l'onglet Compte après une recherche ne retrouve pas ce projet dans son compte.
- **Pas encore dans l'application** : photos et dictée. Elles demandent l'appareil photo et le micro, et viendront dans un lot suivant.
- **Version web de développement** : l'analyse n'y fonctionne pas, car `analyze-need` n'autorise que les origines du site (CORS). Sur téléphone, il n'y a pas de CORS. On vérifie donc l'analyse avec Expo Go.
