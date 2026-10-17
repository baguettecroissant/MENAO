# ADR 0118 — Contrôle automatique du RGE, aide à la vérification des qualifications

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0013 (fiche publique) et 0111 (« Faire vérifier mon entreprise »).

## Contexte
- **Cahier des charges du CEO** :
  - le label RGE se vérifie dans l'annuaire officiel France Rénov' ; ses domaines et sa date de fin donnent le badge RGE ;
  - Qualibat, Qualifelec et les autres qualifications se vérifient sur le site de l'organisme.
- **Jusqu'ici** :
  - l'artisan saisissait ses certifications : type, numéro, date de fin ;
  - la fiche publique n'affichait que celles cochées « vérifiée » par l'équipe, encore valides ;
  - l'équipe n'avait que le numéro pour vérifier.
- **Annuaire** : la « Liste des entreprises RGE » de l'ADEME alimente l'annuaire France Rénov'. Elle est publique (Licence Ouverte), mise à jour chaque jour et interrogeable par SIRET sans clé. Elle couvre les qualifications RGE de Qualibat, QualitEnR (QualiPAC, QualiPV, QualiSol, QualiBois), Qualifelec, OPQIBI et Certibat.
- **Décision de l'utilisateur** (17 octobre 2026) : faire le contrôle du RGE et de Qualibat.

## Décision
- **Lecture de l'annuaire par SIRET** :
  - code partagé : `packages/core/src/rge.ts`, qui construit la requête, lit la réponse de façon contrôlée et compare avec une certification déclarée ;
  - écriture : `supabase/functions/_shared/rge.ts`.
  - Les qualifications sont enregistrées dans `artisan_rge_qualifications`, remplacées à chaque lecture par `record_rge_qualifications` (service_role seulement), avec `artisans.rge_checked_at`.
- **Moments de lecture** :
  - par `sirene-check`, juste après un SIRET vérifié et actif (inscription, étape Entreprise). Un échec de l'annuaire ne change pas la réponse ;
  - par `rge-check`, à la demande de l'artisan (« Actualiser » à l'étape « métiers ») ou d'un admin en double authentification (« Revérifier le RGE ») ; 10 demandes par heure et par compte ;
  - par `rge-check`, chaque jour à 3 h 30 UTC : `pg_cron` et `pg_net` appellent la fonction par lots de 100, pour les dossiers envoyés ou les artisans en activité lus il y a plus de 7 jours (`rge_refresh_candidates`). L'appel réutilise l'adresse et le secret de `notify`, donc aucun nouveau secret à configurer.
- **Fiche publique**, sur le site et dans l'app : un bloc « Reconnu Garant de l'Environnement (RGE) », vérifié dans l'annuaire officiel, avec les domaines encore valides (`artisan_profile_json.rge`). Une qualification retirée de l'annuaire disparaît à la lecture suivante.
- **Autres qualifications** : elles restent validées par l'équipe avant d'être affichées. Le back-office l'aide :
  - pour chaque certification déclarée, il indique si l'annuaire la confirme (même organisme, ou même certificat QualitEnR), sinon « à vérifier sur le site de l'organisme » ;
  - une section liste les qualifications RGE lues, avec le lien du certificat publié par l'organisme.
  - Pas de validation automatique : le numéro saisi par l'artisan ne figure pas dans l'annuaire.

## Conséquences
- **Tests** :
  - `packages/core` (lecture de l'annuaire, domaines valides, confirmation d'une certification) ;
  - pgTAP 62 : droits, remplacement, fiche publique, fiches à relire, tâche planifiée ;
  - bout en bout : le faux serveur Sirene sert aussi l'annuaire (`RGE_API_BASE_URL`).
- **Déploiement** : appliquer la migration, déployer `rge-check` (sans vérification du jeton par la plateforme : la fonction contrôle elle-même le jeton ou le secret), puis redéployer `sirene-check`.
- **Pas encore fait** :
  - vérification automatique des qualifications non RGE : aucune source publique connue ;
  - badge unique « Assuré et vérifié » (prochain lot).
