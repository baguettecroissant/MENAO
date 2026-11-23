# ADR 0386 — CV facultatif dans la candidature des commerciaux

- Statut : accepté (demande de l'utilisateur du 23/11/2026 : « rendre le cv facultatif dans le forms »)
- Fonctionnalité : F-187. Modifie l'ADR 0382 (candidature en 3 étapes avec CV obligatoire).

## Contexte

La page « Devenir commercial MENAO » exigeait un CV en PDF à la 3e étape. Une partie des candidats
visés (mandataires immobiliers contactés sur WhatsApp, reconversions) n'a pas de CV à jour sous la
main : l'obligation fait perdre des candidatures.

## Décision

- **CV facultatif**, comme LinkedIn : libellé « Votre CV (facultatif) », l'envoi part sans fichier.
  Un CV choisi est déposé et contrôlé comme avant (PDF, 5 Mo, `process-upload`, stockage privé).
- **Base** : `apply_as_commercial` (même signature, droits conservés) accepte un chemin vide ou
  absent et enregistre `cv_path` à null ; un CV joint garde les trois contrôles (dossier du compte
  qui candidate, présent dans le stockage, jamais déjà utilisé). La session reste exigée (message
  « Session expirée » à part).
- **Validation** : `cv_path` vide devient null ; un chemin mal formé est refusé avec « Votre CV n'a
  pas pu être joint : choisissez-le à nouveau, en PDF. ».
- **Textes** : « Trois étapes, deux minutes », « Nous lisons votre candidature » au lieu de « votre
  CV ». Le back-office n'affiche « Ouvrir son CV » que s'il y en a un (déjà le cas).

## Conséquences

- La plaquette des commerciaux (page 4 : « trois étapes, votre CV ») est à ajuster à sa prochaine
  version.
- L'équipe lit les candidatures sans CV avec le profil déclaré (statut, expérience, disponibilité,
  motivation, LinkedIn éventuel).
