# ADR 0224 — Simulateur d'entraînement des commerciaux

- Statut : accepté
- Date : 5 novembre 2026
- F-74, seconde partie du lot 1 des agents commerciaux IA (« go pour tout comme tu recommandes », 5 novembre 2026). Suit l'ADR 0223 (copilote du commercial), dont il reprend l'Edge Function, le guide terrain comme seule source et le détecteur de promesses interdites.

## Contexte
- Les commerciaux sont des indépendants payés à la commission : il faut qu'ils soient bons et homogènes dès leurs premières semaines, sans mobiliser l'équipe pour chaque entraînement.
- Les objections et les règles sont écrites dans le guide terrain ; il manquait un moyen de s'exercer à les dire.

## Décision
- **Où** : dans la rubrique « Guide terrain », une ligne « S'entraîner face à un artisan » en tête de la liste, vers `/commercial/guide/entrainement`. **Aucune nouvelle entrée de menu**.
- **Cinq artisans fictifs** joués par l'IA, avec leur profil, leurs objections dans l'ordre où elles viennent, ce qui les fait avancer et ce qui les fait fermer :
  - le méfiant (plombier, déjà déçu par une plateforme) ;
  - le pressé (électricien sur un chantier) ;
  - celui qui est déjà sur une plateforme (peintre qui achète des contacts) ;
  - le débutant (menuisier micro-entrepreneur) ;
  - le patron (maçonnerie de 10 salariés).
  - Ils ne citent jamais d'entreprise réelle.
- **Par écrit d'abord** (la voix viendra plus tard) :
  - l'artisan ouvre par une phrase fixe, sans appel ;
  - le commercial a 12 messages au plus ;
  - l'artisan répond comme à l'oral (45 mots au plus), soulève ses objections une à une, s'ouvre si on l'écoute, se méfie d'une promesse, et met fin si on insiste après un refus.
- **Le coach** note sur 20 (5 critères de 0 à 4 : accroche, écoute, objections, règles, conclusion), avec ses repères tirés du guide terrain :
  - 2 points forts et exactement 3 conseils, chacun avec une phrase à dire ;
  - les règles enfreintes ;
  - possible dès 3 messages.
- **Détecteur dans le code** (`speechViolations`, `@menao/core`) sur les propos du commercial : une promesse explicite (« vous recevrez 20 demandes »), une garantie, un revenu, un concurrent nommé, « les meilleurs artisans », de la pression, une remise ou un délai de dossier mettent « règles » à 0, quoi qu'en dise le modèle.
  - Ne comptent pas : citer les limites d'une formule ou l'offre à l'année quand l'artisan le demande.
- **Données** : l'échange reste dans la page et n'est jamais gardé. Seuls la note, l'artisan choisi et le nombre de messages sont enregistrés (`commercial_trainings`) :
  - lisibles par le commercial (ses 5 dernières séances) et par un admin (progression) ;
  - aucune écriture directe ;
  - supprimés avec la fiche du commercial.
- **Edge Function `commercial-copilot`**, actions `train` et `coach`, sans prospect :
  - réservées au commercial actif ;
  - 150 appels par commercial et par jour, plafond horaire commun avec le copilote ;
  - la note est enregistrée avec le jeton du commercial (`commercial_save_training`).
- **Évaluation** (`eval/entrainement.ts`) :
  - une réplique par artisan et deux pièges (promesse interdite, « oublie ton rôle ») ;
  - quatre échanges écrits à l'avance pour le coach, avec la note attendue : bon commercial (14 à 20), promesses interdites (9 au plus, règles à 0), monologue sans écoute, refus non respecté ;
  - estimation de 0,006 $ ; appels payants avec l'accord du responsable.

## Conséquences
- Après la fusion : `db push` sur staging (migration `entrainement_commercial`), puis `functions deploy commercial-copilot`.
- Test pgTAP `115_entrainement_commercial`.
- Mesure : nombre de séances et notes moyennes par commercial, comparées à leurs résultats (inscrits, abonnés).
- Plus tard : la voix (dictée et réponse lue), un artisan construit à partir d'un vrai prospect de la base, et un tableau de progression dans le back-office.
- Pas de nouvelle dépendance.
