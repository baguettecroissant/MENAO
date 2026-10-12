# ADR 0040 — Espace client : recherches non envoyées, « Redemander un devis », annulations

- Statut : accepté
- Date : 12 octobre 2026
- Complète F-09 (résultats), F-11 (demande), F-12 (Mes chantiers) et les ADR 0012 (recherche IA), 0014 (demandes) et 0016 (chantiers).

## Contexte
L'audit de l'espace client (lot 2) relevait trois manques pour les demandes faites depuis l'espace :
- Une recherche commencée puis abandonnée disparaissait : rien ne permettait de la reprendre.
- Un client satisfait ne pouvait pas redemander un devis à son artisan sans refaire une recherche complète, sans garantie de le retrouver.
- Le client ne pouvait ni annuler une demande restée sans réponse, ni annuler un rendez-vous. L'artisan attendait jusqu'à l'expiration ou se déplaçait pour rien.

## Décision
- **Recherches non envoyées** : « Mes chantiers » liste les projets du compte au statut `brouillon` ou `criteres_valides` (10 au plus, du plus récent au plus ancien).
  - « Reprendre » mène aux critères, ou aux artisans si les critères sont validés.
  - « Supprimer » efface le projet et ses photos (politiques existantes du propriétaire). Un projet déjà envoyé n'est jamais supprimable.
- **« Redemander un devis »** : sur un chantier clôturé (carte et page), un lien ouvre la recherche (`/recherche?artisan=…&depuis=…&nom=…`) avec un bandeau.
  - `analyze-need` reçoit l'artisan et le chantier, et vérifie avec la clé serveur que le particulier a bien eu ce chantier avec cet artisan. Le nom ne sert qu'au bandeau.
  - Il retient alors `projects.preferred_artisan_id`, propose le métier précédent si le particulier n'en choisit pas, et reprend l'adresse précédente si la description n'indique pas de ville. Le tout reste modifiable aux critères.
  - Aux résultats, l'artisan préféré est cherché plus loin dans le classement (25 premiers), puis présenté en premier, présélectionné, avec la mention « Déjà venu chez vous ».
  - S'il ne remplit pas les conditions (métier, zone, congés), un message le dit et la recherche continue avec les autres.
  - La page « Critères de classement » mentionne cette exception, faite à la demande du particulier.
- **Annulation par le client**, avec un motif de la liste `client_cancel_reason` (plus besoin, autre artisan, délai, budget, autre) et un mot facultatif (500 caractères) :
  - Demande sans réponse (`envoyee`) : `particulier_cancel_request`. La demande passe `annulee` (date, motif, mot) et libère une place sur le projet. L'artisan reçoit `demande_annulee`.
  - Chantier avant tout devis signé et tout acompte (`rdv_planifie`, `devis_envoye`, `devis_en_revision`, les mêmes états que pour l'artisan) : `particulier_cancel_chantier`.
    - Transition `annulation` journalisée (`par: particulier`), rendez-vous et demande annulés.
    - L'artisan reçoit `chantier_annule`, dans une version qui lui est destinée (motif et mot du client).
  - Dans l'espace client, une demande annulée par le client affiche « Vous avez annulé cette demande », et non plus « L'artisan a annulé le rendez-vous ».

## Points à valider (TODO(legal))
- Droit de rétractation après une signature à distance du devis : l'annulation reste impossible après signature, faute de règle validée.
- Formulation de l'exception de classement sur la page « Critères de classement ».

## Conséquences
- À déployer : deux migrations (valeur `demande_annulee`, puis colonnes, type et fonctions) et la fonction `analyze-need`.
- Un artisan dont la demande a été annulée par le client la voit « Annulée » dans ses demandes. Le motif lui parvient par la notification.
