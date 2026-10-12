# ADR 0052 — Listes de référence, journal d'audit et suivi de l'IA dans le back-office

- Statut : accepté
- Date : 12 octobre 2026
- Réalise le lot 5b, dernier lot de l'audit du back-office (F-57 en partie, spec §13). Complète les ADR 0045 (vue d'ensemble), 0046 (listes) et 0051 (argent).

## Contexte
- Les listes de métiers, de travaux et de pièces ne changeaient que par une migration, alors qu'elles servent à l'inscription des artisans, aux demandes et à l'analyse par l'IA.
- Le journal d'audit était bien enregistré (`audit_logs`), mais on ne pouvait le consulter nulle part.
- Les appels à l'IA étaient journalisés (`ai_runs`, sans donnée personnelle), mais aucun écran n'en montrait les échecs, la latence ou le volume.

## Décision
- **Métiers, travaux et pièces** (`/admin/referentiels`) :
  - ajouter une entrée en fin de liste (un travail se rattache à un métier), changer son libellé, la monter ou la descendre, la désactiver ou la réactiver ;
  - le **code** est tiré du libellé à la création (`referenceCode`, `packages/core`) et ne change plus : les dossiers des artisans, les demandes et l'IA le reprennent ;
  - **aucune suppression** : une entrée désactivée n'est plus proposée (inscription, demandes, IA, pages publiques sous une heure), et les données qui la citent restent intactes ;
  - chaque entrée indique son usage (artisans, demandes) ;
  - chaque modification est inscrite au journal d'audit (`referentiel.*`).
- **Journal d'audit** (`/admin/journal`) :
  - qui, quoi, quand et sur quoi, du plus récent au plus ancien ;
  - catégories : artisans, comptes, modération, litiges, listes, actions automatiques ;
  - recherche sur l'auteur, la cible et le motif ;
  - la cible est nommée et reliée à sa fiche : artisan (aussi pour un document, une certification ou un avis), ticket, chantier (pour un message), personne ou listes.
- **Suivi de l'IA** (`/admin/ia`), sur 24 heures, 7 ou 30 jours :
  - appels, part des échecs (réponse illisible, refus du modèle, erreur d'appel) et des réponses peu sûres (`aiRates`, `packages/core`) ;
  - détail par fonction (analyse des demandes, transcription, dictée des devis) et par modèle : latence médiane et à 95 %, jetons ou minutes d'audio ;
  - appels par jour, et les 20 derniers échecs, avec un lien vers la demande concernée ;
  - le coût n'est pas calculé ici : il se lit dans les consoles des fournisseurs.
- **Menu** : nouvelle section « Contrôle », réservée aux admins (double authentification). Les fonctions de la base le vérifient elles aussi (`app.is_admin`).

## Conséquences
- À déployer : la migration. Aucune fonction Edge ne change.
- Changer l'ordre d'une liste renumérote ses entrées (10, 20, 30…), dans l'ordre affiché.
- Hors périmètre de F-57, pour plus tard : les formules (liées à Stripe), les règles de gamification et les textes légaux versionnés.
- L'audit du back-office est terminé avec ce lot.
