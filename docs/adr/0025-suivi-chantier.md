# ADR 0025 — Suivi du chantier : date de démarrage, démarrage automatique, journal de l'artisan

- Statut : accepté, révisé par l'ADR 0026 (journal ouvert au début des travaux ; vue d'un chantier des maquettes côté artisan)
- Date : 10 octobre 2026

## Contexte
- **F-22** :
  - après l'acompte, l'artisan reçoit « Chantier validé ! Confirmez la date de démarrage » ; il confirme la date et l'heure, et le client reçoit « Chantier planifié » ;
  - pendant les travaux, l'artisan ajoute des photos (plusieurs à la fois) et des messages, et le client est notifié ;
  - « Déclarer le chantier terminé » ouvre un tiroir qui rappelle d'ajouter les photos finales ; le client est ensuite invité à réceptionner les travaux.
- **Machine à états** (spec §9) : `acompte_paye` → `planifie` (date confirmée) → `en_cours` (date de début atteinte) → `travaux_termines` (fin déclarée).
- **F-12** (phase 4d) : le client consulte les photos et les messages dans l'onglet « Suivi du chantier ».

## Décisions
- **Date de démarrage** (`chantiers.start_at`) :
  - saisie en heure de Paris, à venir et au plus 12 mois plus tard ; mêmes règles dans `packages/core` et en base ;
  - confirmée par `artisan_confirm_start` : transition `date_confirmee`, notification `chantier_planifie` ;
  - modifiable tant que les travaux n'ont pas commencé : le client reçoit `demarrage_modifie`, sauf si la date est inchangée ;
  - le formulaire propose la date de début prévue au devis.
- **Démarrage automatique** :
  - la tâche pg_cron `menao-demarrage-chantiers` appelle `app.start_due_chantiers()` toutes les 15 minutes ;
  - les chantiers planifiés dont la date est atteinte passent en `en_cours` (transition `demarrage`, journalisée par le système) ;
  - l'instant de référence est un paramètre, ce qui permet aux tests de simuler la date.
- **Journal du chantier** (`chantier_updates`) : une ligne par message ou par photo, avec l'auteur et l'heure réelle.
  - **Ouverture** : le journal est ouvert de la planification à la réception (`planifie`, `en_cours`, `travaux_termines`, `reserves_a_lever`), et reste lisible ensuite.
  - **Accès** : lecture par les parties du chantier et l'équipe, aucune écriture directe. Les messages passent par `artisan_add_chantier_message` (2 000 caractères au plus), les photos par `record_chantier_photo` (service_role).
  - **Photos** :
    - réduites à 2 000 px dans le navigateur, déposées dans `uploads`, puis vérifiées par `process-upload` (type réel, métadonnées retirées) ;
    - rangées dans le bucket privé `chantier-photos/<chantier>/` et servies aux parties par URL signées ;
    - 100 photos au plus par chantier, 10 par envoi ;
    - les fichiers ne transitent pas par Vercel.
  - **Affichage** : les photos ajoutées ensemble (moins de 10 minutes d'écart) forment une seule entrée (`chantierJournal`, `packages/core`). La vue du client (4d) réutilisera ce regroupement.
- **Fin des travaux** :
  - `artisan_declare_finished` (chantier en cours) déclenche la transition `fin_declaree`, avec le nombre de photos ;
  - le client reçoit la notification `travaux_termines` ;
  - la réception (PV) et le solde viennent en phase 5.
- **Notifications** :
  - l'e-mail d'acompte à l'artisan devient « Chantier validé ! Confirmez la date de démarrage » ;
  - nouveaux e-mails au client : « Chantier planifié », « Date de démarrage modifiée », « Travaux terminés » ;
  - les nouveautés du journal (« Jean a ajouté 6 nouvelles photos ») seront notifiées avec la vue du client (4d), regroupées pour ne pas envoyer un e-mail par photo.

## Points à valider
- **TODO(legal)** : contrat conclu hors établissement (devis signé au domicile du client). Les travaux ne commencent avant la fin du délai de rétractation de 14 jours qu'à la demande expresse du client (art. L221-25 du code de la consommation). Selon l'avis juridique, deux options : recueillir cette demande à la signature, ou refuser une date de démarrage dans ce délai.
- **Suppression d'une photo ou d'un message publié par erreur** : F-22 ne la prévoit pas, et le journal sert aussi de preuve en cas de litige (F-42). À décider.
- **Démarrage manuel avant la date prévue** : non prévu ; l'artisan modifie la date.

## Conséquences
- **4d** : vue « Mes chantiers » du client (stepper, onglet « Suivi du chantier » avec le journal, « Dossier du chantier ») et notifications des nouveautés.
- **Phase 5** : réception (PV avec ou sans réserves), facture et paiement du solde. L'e-mail « Travaux terminés » mènera alors à la réception.
