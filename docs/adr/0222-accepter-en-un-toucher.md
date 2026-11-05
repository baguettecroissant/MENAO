# ADR 0222 — Accepter en un toucher : créneaux proposés au client

- Statut : accepté
- Date : 5 novembre 2026
- F-73, demandé le 5 novembre 2026 (« go pour 1 et 2 »). Complète l'ADR 0016 (le chantier naît au rendez-vous), l'ADR 0036 (créneaux libres) et l'ADR 0156 (relances).

## Contexte
- La vitesse de réponse fait gagner le chantier, mais l'artisan est sur un chantier quand la demande arrive : aujourd'hui il doit ouvrir la demande, choisir une date et une heure, souvent le soir.
- Une prise de rendez-vous entièrement automatique a été écartée : l'artisan perdrait le tri des demandes, subirait des visites de devis non payées, et un agenda incomplet produirait des rendez-vous intenables.
- Le client ne pouvait ni choisir ni proposer de date.

## Décision
- **Proposer 2 ou 3 créneaux** (`public.artisan_propose_slots`) : depuis la demande, sur le site comme dans l'application, « Proposer 3 créneaux » ouvre les créneaux libres de l'agenda (`suggestSlots`, ADR 0036), les 3 premiers cochés ; l'artisan valide d'un toucher ou ajuste. « Fixer un rendez-vous » reste disponible.
- **Règles** (même calcul que `proposedSlotsError`, `packages/core/src/appointment.ts`) : 2 ou 3 créneaux différents, le premier au moins une heure plus tard, le dernier dans les 6 mois ; demande en attente de réponse seulement.
- **La proposition vaut réponse** : `responded_at` renseigné (temps de réponse, ADR 0221), plus de relance 24 h / 48 h (`app.remind_pending_requests` ignore les demandes avec réponse), et la demande reste ouverte jusqu'au dernier créneau proposé (`expires_at`), puis expire comme les autres.
- **Le client choisit** (`public.particulier_choose_slot`) un créneau d'un toucher, en tête de son espace (site) ou de « Mes chantiers » (application) : le rendez-vous est fixé par la même fonction que « Fixer un rendez-vous » (`app.fix_request_appointment`, désormais commune) : chantier créé, demande acceptée, coordonnées échangées, transition `rdv_fixe` journalisée.
- **Table `appointment_proposals`** (RLS : lecture par l'artisan et le client concernés, écriture par les fonctions seulement) ; une seule proposition en attente par demande, une nouvelle remplace la précédente, un rendez-vous fixé directement aussi.
- **Notifications** : `creneaux_proposes` au client (« Dupont Plomberie vous propose 3 créneaux »), `creneau_choisi` à l'artisan (rendez-vous inscrit, coordonnées disponibles).

## Conséquences
- Plus tard : le bouton « Proposer ces créneaux » directement dans la notification du téléphone (catégories de notification Expo), qui demande une nouvelle version de l'application (TestFlight).
- Plus tard, sur demande des artisans : un mode automatique avec règles (distance, budget, nombre de visites par semaine), activé par l'artisan lui-même.
- Les créneaux restent calculés dans l'écran de l'artisan : ils dépendent d'un agenda tenu à jour (calendrier du téléphone synchronisé à l'ouverture de l'application, ADR 0203 ; Google Agenda non relié).
