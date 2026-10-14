# ADR 0076 — Application, espace artisan : « Ce chantier a besoin d'une expertise » (lot 6c, partie 7)

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, l'artisan peut signaler qu'un chantier demande un autre corps de métier (maquettes F-17, F-18). L'équipe MENAO proposera alors un artisan adapté au client.
- Le bouton figure sur la fiche d'une demande encore ouverte et sur la vue d'un rendez-vous actif.
- L'application n'avait pas ce signalement.

## Décision
- **Bouton « Ce chantier a besoin d'une expertise »**, avec les conditions du site :
  - sur l'opportunité tant qu'elle est ouverte : en attente de réponse et non expirée, ou acceptée sans rendez-vous ;
  - sur la vue du rendez-vous tant que le chantier est actif : ni annulé, ni clôturé, ni devis refusé.
- **Écran du signalement** (`/opportunite/[id]/expertise`, `id` étant la demande) :
  - choix du corps de métier parmi les métiers actifs du référentiel, précisions facultatives ;
  - mêmes contrôles que le site (`expertiseSchema`), puis `artisan_report_expertise` (ticket pour l'équipe MENAO) ;
  - écran de remerciement avec « Retour ».
- Aucune nouvelle dépendance, aucun changement côté serveur.

## Conséquences
- **Parties suivantes** : devis et factures de l'artisan, puis notifications push (lot 6e).
