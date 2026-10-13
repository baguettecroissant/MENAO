# ADR 0064 — Application : avis du client et « Redemander un devis » (lot 6b, partie 7b)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, le client note l'artisan après la réception (F-28, ADR 0030) et peut redemander un devis à un artisan d'un chantier terminé (ADR 0040).
- Ce sont les derniers parcours de l'espace particulier qui manquaient dans l'application.

## Décision
- **Avis** (`/chantier/[id]/avis`), comme sur le site :
  - possible dès le PV de réception signé, un avis par chantier (`canReview`). L'avis ne conditionne aucun paiement (F-27) ;
  - trois curseurs de 0 à 100 % par pas de 5, avec le libellé de la tranche (`reviewBand`) ;
  - rapport qualité/prix, puis commentaire de 50 caractères au moins, avec le compteur ;
  - même schéma (`reviewSchema`) : un curseur non touché ne compte pas 0 %, la note est obligatoire ;
  - `particulier_submit_review`, puis l'écran de remerciement, avec le lien vers la fiche de l'artisan.
- **Curseur de notation** : composant de l'application (`RatingSlider`), sans nouvelle dépendance.
  - On le fait glisser, ou on touche la piste.
  - Il est exposé comme curseur aux lecteurs d'écran (`role="slider"`, valeur et libellé de la tranche) et s'ajuste par pas de 5 (actions « augmenter » et « diminuer »).
- **Page du chantier** :
  - chantier clôturé sans avis : « Noter … pour son chantier » (`reviewInvited`) ;
  - « Redemander un devis à … ».
- **« Mes chantiers », chantiers terminés** : « Redemander un devis » pour un chantier clôturé, « Choisir un autre artisan » pour un chantier annulé ou un devis refusé.
- **Redemander un devis** : la recherche de l'application reçoit l'artisan et le chantier d'origine, comme le site (`preferredArtisanId`, `fromChantierId` envoyés à `analyze-need`). Un bandeau rappelle l'artisan.
  - Les identifiants sont contrôlés.
  - Le nom ne sert qu'au bandeau ; le serveur vérifie le chantier commun.
- **Liens des notifications** : la relance « Laissez votre avis » ouvre l'écran d'avis dans l'application.
- Aucun changement côté serveur.

## Conséquences
- L'espace particulier de l'application couvre les parcours des phases 2 à 5 (lot 6b).
- **Restent à venir** :
  - l'envoi de photos et de PDF depuis l'application (messagerie, signalement), avec un module de choix des photos ;
  - la suppression du compte depuis l'application (6f) ;
  - les notifications push (6e).
- **Lot suivant** : 6c, l'espace artisan.
