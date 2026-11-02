# ADR 0217 — Kbis remplacé par une vérification au registre

- Statut : accepté
- Date : 2 novembre 2026
- Modifie F-14 (étape 4, documents) ; complète les ADR 0006 (vérification Sirene), 0110 (inscription en un parcours) et 0111 (dossier).

## Contexte
- **Demande de l'utilisateur** (2 novembre 2026) : réduire le nombre de documents demandés aux artisans en récupérant le Kbis en amont. Choix validé : vérification automatique et fiche générée par MENAO (« go pour le point 1 »).
- Pour MENAO, le Kbis ne sert qu'à prouver deux choses : l'entreprise existe et est active, et l'inscrit la dirige. Ces deux informations sont publiques et gratuites. MENAO les lisait déjà en partie : Sirene à l'inscription, et dirigeants proposés à l'inscription via l'annuaire des entreprises de l'État.
- **Document officiel non automatisable par MENAO** (vérifié le 2 novembre 2026) :
  - l'attestation d'immatriculation au RNE est gratuite, mais data.inpi.fr refuse les scripts (403) et l'Annuaire des entreprises impose une vérification anti-robot, que nous ne contournons pas ;
  - le service d'API Entreprise qui la fournit est réservé aux administrations ;
  - l'API RNE de l'INPI (compte gratuit, quotas journaliers) donne les formalités en JSON, et non l'attestation (documentation « Accéder aux formalités données saisies JSON », v3.0, janvier 2024) ;
  - le Kbis officiel est payant pour un tiers (Infogreffe).

## Décision
- **Contrôle au registre** dans l'Edge Function `sirene-check`, après une vérification Sirene active (à l'inscription, depuis « Mon entreprise », ou avec « Revérifier au registre ») :
  - lecture de l'API Recherche d'entreprises de l'État (registre national des entreprises et Sirene), sans clé ni coût. Adresse réglable : `RECHERCHE_ENTREPRISES_BASE_URL` (faux serveur en e2e) ;
  - résultat calculé dans `packages/core/src/registry.ts` (`registryOutcome`) :
    - `verifie` : entreprise active, et inscrit qui a déclaré être le dirigeant, présent parmi les dirigeants publiés (même nom, premier prénom parmi les prénoms publiés) ;
    - `inactive`, `introuvable` ;
    - `masque` : dirigeants non publiés ;
    - `dirigeant_absent` ;
  - jamais bloquant : si l'annuaire ne répond pas, rien ne change.
- **Fiche de vérification** (`packages/documents/src/registry-pdf.ts`) : PDF daté qui indique l'entreprise, le dirigeant reconnu, l'inscrit, les sources et l'heure de la vérification. Elle précise qu'elle n'est ni un Kbis ni une attestation de l'INPI.
- **Rangement** (`record_registry_check`, réservée au serveur) :
  - pendant l'inscription, la fiche devient le Kbis validé (`artisan_documents.source = 'registre'`, `date_emission` = jour du contrôle). Les règles existantes (documents complets, Kbis de moins de 3 mois) s'appliquent donc sans changement ;
  - un Kbis déposé par l'artisan, en attente ou validé, est conservé ; une ancienne fiche ou un Kbis refusé est remplacé ;
  - dossier envoyé ou validé : seul le résultat est enregistré (`artisans.registre_statut`, `registre_verifie_le`).
- **Écrans** :
  - site et application : Kbis « Vérifié automatiquement au registre », sans formulaire de dépôt, lien vers la fiche ;
  - si le contrôle échoue : Kbis à déposer comme avant, avec la raison et un bouton « Revérifier au registre » ;
  - back-office : la fiche apparaît dans les documents, signalée comme vérification automatique.

## Conséquences
- Un document de moins (4 au lieu de 5) pour la plupart des artisans dont l'inscrit est le dirigeant.
- L'équipe compare toujours le nom du dirigeant avec la pièce d'identité. Elle peut refuser la fiche comme un autre document : le Kbis est alors demandé.
- Limites connues :
  - un nom d'usage différent du nom publié, ou un inscrit qui n'est pas le dirigeant, ramène au Kbis déposé ;
  - un entrepreneur qui refuse la diffusion de ses données (dirigeants non publiés) aussi.
- Les données publiques lues ne sont pas journalisées (règle 11) ; seule la fiche est conservée, dans le stockage privé des documents.
- Plus tard, si l'équipe le souhaite : l'attestation officielle par une voie autorisée (compte INPI à demander, si l'INPI la fournit un jour par API).
- TODO(legal) : faire confirmer par l'avocat que cette vérification remplace valablement le Kbis dans la politique de contrôle de MENAO. Lui demander aussi si l'obligation européenne de traçabilité des professionnels (règlement sur les services numériques) s'applique à MENAO ; si oui, cette vérification dans un registre officiel gratuit y répond.
