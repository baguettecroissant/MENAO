# ADR 0394 — Espace des conseillers : barre du bas, « Bien démarrer » et tournée

- Statut : accepté (plan en 8 lots du 28/11/2026, maquette lot 83 des lots 0 à 2 validée le même
  jour : « Validé, code-le »)
- Fonctionnalité : F-194. Complète les ADR 0205 à 0207 (espace commercial), 0223 (copilote),
  0344 (démo par lien) et 0381 (rythme). Exception à l'ADR 0043 (pas d'onglets en bas sur le web).

## Décision

### Lot 0 : remise au propre

- **Barre d'onglets en bas sur téléphone**, dans l'espace des conseillers seulement : Aujourd'hui,
  Tournée, Prospects, Gains, Plus (qui ouvre le menu). L'espace est un outil de terrain utilisé au
  pouce, depuis l'icône de l'écran d'accueil (ADR 0211) ; sur ordinateur, le menu de gauche reste.
- « Ma journée » devient **« Aujourd'hui »**.
- **Agents indépendants** : « La journée type » devient « Organiser ma semaine » (conseils et
  observations, plus de tableau d'horaires ni de permanence) ; l'encart « Créneaux téléphone »
  devient un conseil ; « Mon planning » présente des idées de tâches. MENAO suit des résultats,
  jamais des horaires ni une position. TODO(legal) : relecture par l'avocat.
- Mon compte : le texte sous le téléphone d'un conseiller ne parle plus de « vos clients ».

### Lot 1 : « Bien démarrer »

- Page d'arrivée (`/commercial/demarrer`) : 13 étapes en 4 groupes (statut d'agent, téléphone,
  formation, premier prospect), calculées par `commercialOnboardingSteps` (`@menao/core`).
- **Pièces** déposées par le conseiller (contrat signé, attestation Urssaf, RIB), rangées par
  `process-upload` dans le compartiment privé `commercial-documents/<commercial_id>/`, lues par URL
  signée (conseiller et admins). Le contrat déposé est **confirmé par un admin** (date de
  signature) ; un nouveau dépôt retire la confirmation. Pas de signature électronique intégrée pour
  l'instant (le contrat attend encore l'avocat).
- **Attestation Urssaf** : valable 6 mois ; rappel transactionnel `conseiller_urssaf` 15 jours
  avant (tâche quotidienne, une fois par dépôt), comme le prévoit le contrat.
- **Formation** : 5 modules (leçon tirée du guide terrain, quiz de 5 questions, 4 bonnes réponses
  pour réussir, meilleure note gardée) et le simulateur existant (14/20). Les bonnes réponses
  restent sur le serveur ; la note est calculée par le serveur du site puis enregistrée.
- **Badge « Prêt pour le terrain »** : contrat confirmé, RSAC, 5 quiz, simulateur à 14. C'est un
  repère : il ne bloque ni le code, ni les primes, ni la tournée. Écran de célébration une fois.
- À la connexion, `homePathForRole("commercial")` mène à « Bien démarrer » ; un conseiller prêt,
  badge vu et pièces à jour, va droit à « Aujourd'hui ».
- Back-office (Apporteurs › Commerciaux) : tableau de l'arrivée de chaque conseiller et « À
  surveiller » (contrat à confirmer, attestation à renouveler) ; sur la fiche, les pièces et la
  confirmation du contrat.

### Lot 2 : mode terrain

- **Tournée** (`/commercial/tournee`) : départ par la position du téléphone ou une commune, métiers
  (codes APE), durée. `commercial_tour_candidates` renvoie les prospects libres de la zone (et ceux
  du conseiller à recontacter) dans un rayon ; `planTour` choisit et ordonne (plus proche voisin
  puis 2-opt). **La position n'est jamais enregistrée** : elle sert au calcul, le temps de la
  requête.
- Commencer une tournée suit les arrêts libres ; à la fin, les suivis ouverts par la tournée et
  restés sans suite sont rendus. Une seule tournée en cours par conseiller ; purge à 13 mois.
- **Un arrêt** : fiche, accroche du copilote si une fiche existe, 4 suites (intéressé → démo faite ;
  à rappeler → relance choisie ; absent → relance dans 7 jours ; pas intéressé), note vocale avec
  le compte rendu du copilote existant, « Et maintenant ? » (QR code, SMS prêt).
- **« Montrer à l'artisan »** (`/commercial/montrer`) : plein écran sombre, la démo, le calcul de
  rentabilité (`subscriptionPayback`, même note « sans garantie »), les formules lues en base, le QR
  code d'inscription avec le code du conseiller.
- **Bilan** : arrêts, vus, intéressés, inscriptions avec le code pendant la tournée, primes en jeu.
  Il est pour le conseiller : ce n'est pas un rapport à rendre.

## Conséquences

- Mise en service : `db push` (2 migrations), `functions deploy process-upload` et `notify` (nouveau
  modèle d'e-mail) sur staging après fusion.
- Le copilote n'importe pas la rubrique « journée » du guide : pas de redéploiement nécessaire.
- Restent au plan : lot 3 (inscription sur place ou à distance), lot 4 (notifications de prime,
  fin d'essai), lot 5 (gains et relevé), lot 6 (coach IA), lot 7 (équipe et pilotage).
