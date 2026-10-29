# ADR 0208 — Tableaux de lancement, lot 1 : équipe, planning de chaque membre, jalons

- Statut : accepté
- Date : 29 octobre 2026
- Complète les ADR 0205 à 0207 (espace commercial) ; reprend le cloisonnement des commerciaux (`app.my_commercial_id()`) et le journal d'administration (`app.audit`).

## Contexte
- **Demande de l'utilisateur** (29 octobre 2026) : « que chaque membre de la team MENAO ait son tableau / planning ». Choix retenu : **dans MENAO** (back-office et espace commercial), plutôt qu'un outil extérieur.
- **Dépôt public** : le plan de lancement (tâches, dates, budget, décisions, objectifs) est confidentiel. Il ne doit jamais entrer dans le dépôt, ni dans le seed, les tests ou les exemples.

## Décision
- **Équipe de lancement** (`launch_members`) : associés, commerciaux, personne qui valide les dossiers ou autre, avec une mission, un ordre d'affichage et, au besoin, le compte relié (admin ou commercial ; un membre « commercial » est relié à un compte commercial). Objectif individuel de dossiers validés facultatif, **réservé aux admins** : jamais renvoyé au membre. La table des membres n'est donc lisible que par les admins ; le membre lit son nom et sa mission par `my_launch_plan`.
- **Tâches** (`launch_tasks`) : titre, détail, phase du lancement (préparation, pré-ouverture, lancement, essais, après), catégorie, début et échéance (entre 2020 et 2040, en base comme dans les formulaires et l'import : une année mal tapée est refusée), statut (à faire, en cours, fait). Variantes :
  - **sans membre** : tâche de toute l'équipe ;
  - **jalon** : date clé, avec compte à rebours ;
  - **partagée** : visible par tous les membres (sinon : admins et membre responsable seulement) ;
  - **rendez-vous régulier** (« Chaque lundi à 9 h ») : affiché à part, hors progression.
- **Calculs dans `@menao/core`** (`launch-plan.ts`) : état d'une tâche (faite, en retard, cette semaine, à venir, régulière), progression, semaines du planning et frise (six mois au plus, à partir de quatre semaines avant la semaine du jour), prochains jalons, résumé par phase (une seule phase en cours, la dernière commencée), initiales des pastilles. Sur le tableau d'un membre, filtres, compteurs et frise ne comptent que ses tâches et les tâches partagées à venir (`launchBoardTasks`) : jamais un retard ni un « fait » de l'équipe qu'il ne peut pas cocher. Formulaires et fichier d'import contrôlés par `@menao/validation`, mêmes bornes qu'en base, messages en français pour chaque champ du fichier.
- **Écritures par fonctions** uniquement (aucune politique d'écriture) : membres, tâches, copie des tâches d'un membre vers un autre (jamais ses tâches partagées, que toute l'équipe voit déjà) et import réservés aux admins (aal2), chaque écriture journalisée, statut changé par un admin compris (`lancement.statut`) ; un membre ne peut que changer le statut de **ses** tâches (`launch_set_task_status`), ce qui garde l'auteur et la date du « fait » sans entrer dans le journal d'administration.
- **Lecture directe colonne par colonne** : ni l'auteur du « fait » ou de la tâche (comptes d'un collègue ou d'un admin), ni le repère du fichier d'import ne sont lisibles par l'API.
- **Commerciaux cloisonnés** : « Mon planning » (`my_launch_plan`) ne montre que leurs tâches et les tâches partagées ; ni les tâches des autres, ni les tâches d'équipe non partagées, ni leur objectif.
- **Import d'un fichier gardé hors du dépôt public** (`admin_import_launch_plan`, version 1) : membres et tâches retrouvés par leur référence, réimport sans doublon ; un réimport met à jour le contenu des tâches mais garde leur statut, et garde le nom et le compte relié des membres. Ligne invalide ignorée et comptée, sans faire échouer l'import.

## Conséquences
- Lot 2 : chiffres en direct (inscriptions, dossiers validés, abonnés) à côté des tâches et des objectifs.
- Les vraies tâches ne sont jamais dans le dépôt : le seed, les tests et les exemples n'utilisent que des tâches fictives et neutres ; les vraies sont importées en base depuis le back-office.
- `daysUntil` (`expiry.ts`) accepte aussi un jour AAAA-MM-JJ, pour le compte à rebours des jalons à l'heure de Paris.
- L'import envoie le plan entier à une action serveur, sous la limite par défaut de 1 Mo (le vrai plan pèse environ 150 Ko) : le navigateur refuse avant l'envoi un plan de plus de 900 Ko, avec un message clair (le séparer en deux fichiers).
