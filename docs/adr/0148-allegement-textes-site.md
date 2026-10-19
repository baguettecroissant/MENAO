# ADR 0148 — Allègement et textes du site vitrine

- Statut : accepté
- Date : 19 octobre 2026
- Lot 3 de l'audit du site vitrine du 19 octobre 2026. Modifie l'ADR 0147.

## Contexte
- **Constats de l'audit** :
  - trop de texte, et du jargon de professionnel (« BTP ») adressé aux particuliers ;
  - trois libellés différents pour le même geste ;
  - deux promesses intenables : « garantir un travail de qualité » et « les meilleurs artisans » ;
  - 4 étapes sur l'accueil, mais 6 sur « Comment ça marche » ;
  - un accueil de près de 11 000 px sur mobile.
- **Retours de l'utilisateur sur l'ADR 0147** :
  - dans le bandeau de l'accueil, un seul téléphone avec l'écran d'accueil client de l'application, sans notification ;
  - aucune mention « Écrans réels de l'application MENAO · personnes et données fictives » : il ne l'avait pas demandée.

## Décision
- **Mockups (modifie l'ADR 0147)** :
  - le bandeau montre l'accueil client de l'application (« Bonjour Camille ! », la recherche, le chantier en cours), seul, avec sa barre d'état bleue ;
  - les mentions sous les mockups sont retirées partout.
- **Textes** :
  - **titre de l'accueil et de la recherche** : inchangé, à la demande de l'utilisateur ;
  - **bloc confiance** : « Des artisans du bâtiment vérifiés », puis « Chaque artisan est contrôlé avant d'apparaître : entreprise active, décennale, RC Pro, identité. » ;
  - **recherche** : « Une demande claire du premier coup, des artisans qui interviennent chez vous » remplace « Trouvez les meilleurs artisans » ;
  - **exemple dans le champ de recherche** : « Ex. : fuite sous l'évier de la cuisine, à Antibes » ;
  - **étapes de l'accueil** : « Votre projet entre de bonnes mains. », sans le nombre d'étapes.
- **Boutons** :
  - en-tête et entrées vers la recherche : « Décrire mon projet » ;
  - validation de la recherche : « Trouver mon artisan », au lieu de « Trouver mon artisan du BTP idéal ».
- **Allègement** : textes plus courts dans l'espace client et les métiers (accueil), les 6 étapes de « Comment ça marche », et la page Pro (bandeau, constats, étapes, dictée du devis). L'accueil garde 3 questions fréquentes au lieu de 5.
- **Accueil sur mobile**, 10 850 px puis 7 784 px (-28 %) :
  - l'espace client passe en carrousel horizontal ;
  - les métiers s'affichent sur deux colonnes compactes ;
  - les trois chiffres tiennent sur une ligne ;
  - les garanties deviennent une liste compacte (icône à gauche), aussi sur les pages métier et ville.
  - Les grands écrans gardent leur mise en page.
- **Non traité ici** :
  - les mises en page qui demandent des photos et les textes propres à chaque commune (lot 4) ;
  - les textes de l'application elle-même, qui garde « Trouvez l'artisan du BTP dont vous avez besoin » sur sa recherche.

## Conséquences
- **Site plus court et plus direct**, sans jargon ni promesse intenable, avec un seul geste mis en avant.
- **Tests de bout en bout adaptés** au nouveau libellé du bouton de recherche.
- **Pas de nouvelle dépendance, pas de migration.**
