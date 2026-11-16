# ADR 0354 — Kbis : relance automatique au registre ; le facultatif rendu visible (F-164, lot 63)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-164 ; maquette du lot 63. Complète l'ADR 0217 (Kbis remplacé par une
  vérification au registre) et l'ADR 0038 (logo des documents).

## Constat

- **Kbis demandé à tort.** Le contrôle au registre (ADR 0217) n'est fait qu'une fois, avec un seul
  essai de 8 secondes, pendant la vérification du SIRET. Quand l'annuaire de l'État ne répond pas,
  rien n'est enregistré (`registre_statut` vide) : l'écran demandait alors le Kbis sans raison ni
  bouton « Revérifier ». Constaté sur un compte de test le 16/11/2026 (entreprise active, inscrit
  dirigeant, résultat vide).
- **Facultatif jamais proposé.** Logo, spécialités, diplôme, expérience, certifications et budget
  minimum vivent dans des écrans remplis pendant l'inscription, marqués « fait » dans « Mon
  dossier » : l'artisan n'y revient pas.

## Décision

- **Relance automatique** : `registryCheckPending` (core) repère un contrôle jamais abouti
  (dossier modifiable, entreprise active, aucun résultat, aucun Kbis). « Mon dossier » et l'écran
  du Kbis relancent alors `sirene-check` en mode `registre` : seul l'annuaire est relu, avec
  trois essais de plus en plus patients (8, 12, 15 s ; `registryRetryable`). Une relance au plus
  par quart d'heure et par navigateur.
- **Écran du Kbis** : pendant la relance, « MENAO vérifie votre entreprise au registre… » ; si
  l'annuaire ne répond toujours pas, un message le dit et le dépôt reste possible. Le Kbis n'est
  demandé d'office qu'en vrai échec, avec la raison (« Pourquoi on vous le demande »).
- **Compteur et consigne** : « Document N sur M » ne compte plus le Kbis vérifié au registre ; la
  mention du « PDF de votre assureur » ne s'affiche que pour les attestations d'assurance.
- **« Pour vous démarquer »** : troisième bloc de « Mon dossier », marqué « Facultatif » : logo,
  spécialités et expérience, certifications, budget minimum. Aucun n'entre dans l'envoi du dossier.
- **Logo dans « Votre fiche »** : la carte du logo quitte « Votre entreprise » (vérification) pour
  l'écran de la photo et de la présentation ; « Mon profil » pointe vers le nouvel emplacement.

## Conséquences

- Les relances consomment la limite horaire de `sirene-check` (10 par heure) : d'où la pause d'un
  quart d'heure.
- Aucune migration. À déployer après fusion : la fonction `sirene-check`.
