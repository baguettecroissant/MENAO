# ADR 0382 — Recrutement des commerciaux : page refaite, candidature en 3 étapes avec CV

- Statut : accepté (maquette du lot 79 validée par l'utilisateur le 20/11/2026, « Validé, code-le »)
- Fonctionnalité : F-183. Complète l'ADR 0380 (recrutement des conseillers, lot 77).

## Contexte

La page `/devenir-conseiller` (lot 77) montrait les montants, un simulateur, le copilote IA et
l'entraînement noté, puis faisait réserver une réunion d'information juste après l'envoi.
L'utilisateur l'a trouvée « fadasse » ; il ne veut plus de montants ni de mise en avant de l'IA
(« has-been »), préfère le mot « commercial » (comme les publicités) et veut recevoir des CV.

## Décision

- **Page refaite** (titre « Devenez commercial MENAO. ») : bandeau « MENAO arrive dans les
  Alpes-Maritimes », bande « Pourquoi maintenant » (équipe de départ, démarrage en janvier, un
  secteur à vous, sans plafond), l'outil montré sur trois téléphones, une journée type, l'escalier
  « Plus vous travaillez, plus vous gagnez » sans montant, trois profils (dont la reconversion), un
  seul déroulé, les questions, puis la candidature. Aucune mention d'IA ni de montant. L'adresse
  `/devenir-conseiller` ne change pas (annonces déjà diffusées).
- **Écrans des téléphones** : exportés de la maquette en WebP à fond transparent
  (`public/images/recrutement/ecrans/`, 840 × 1732, ~100 Ko chacun), fidèles à l'espace commercial
  (libellés réels, données fictives, vrai QR code). Images non optimisées par Vercel (spec §4.4).
- **Candidature en 3 étapes** (vous, votre profil, votre CV) dans un seul formulaire : chaque étape
  est contrôlée dans le navigateur (`commercialApplicationSteps`) avant la suivante ; un refus de la
  base ramène à l'étape concernée.
- **CV obligatoire** (PDF, 5 Mo), **LinkedIn facultatif** (« linkedin.com/in/… » complété en
  https://). Le CV ne passe pas par Vercel : session anonyme du navigateur, dépôt dans « uploads »,
  vérification et rangement par `process-upload` (type réel, taille) dans le stockage privé
  `candidate-cvs/<compte>/<fichier>.pdf` ; `apply_as_commercial` n'accepte qu'un CV du dossier du
  compte qui candidate, une seule fois. La candidature demande donc une session (anonyme ou
  connectée) : elle n'est plus ouverte au rôle `anon`.
- **Plus de réservation de réunion après l'envoi** : confirmation à l'écran et e-mail de bonne
  réception (`recrutement_recue`) ; l'équipe lit le CV et propose un entretien. Les réunions
  d'information restent dans le back-office.
- **Back-office** : lien temporaire (10 minutes) vers le CV et lien LinkedIn sur la fiche du
  candidat ; CV lisibles et supprimables par les administrateurs seulement.
- **Conservation** : candidature et CV supprimés 2 ans après le dernier échange. La base ne peut pas
  effacer un fichier du stockage : le CV d'une candidature supprimée entre dans
  `candidate_cv_deletions`, vidée par le back-office à chaque ouverture de la liste des candidats.

## Conséquences

- À la mise en ligne : migrations, puis redéploiement de `process-upload` et `notify` (nouveau type
  d'e-mail).
- Un CV déposé dont la candidature échoue (même e-mail sous 90 jours…) reste dans le stockage sans
  candidature : à surveiller ; un nettoyage des fichiers orphelins pourra être ajouté.
- « Un secteur à vous » et « Démarrage en janvier » sont affichés tels que validés sur la maquette ;
  ils se changent dans `fr.pages.recruitment.why`.
