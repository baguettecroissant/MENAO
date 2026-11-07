# ADR 0241 — Comptes d'équipe : droits propres à chaque rôle

- Statut : accepté
- Date : 7 novembre 2026
- F-89, PR 2A des comptes d'équipe (« go pour la PR 2A comme tu recommandes »), après l'ADR 0240 (fondations et invitations).

## Contexte
Depuis l'ADR 0240, un membre actif voit l'espace comme le patron : toutes les règles d'accès passent par `app.my_artisan_id()`, qui renvoie la fiche de l'entreprise au patron comme à ses membres. Avant d'accueillir de vrais salariés, chaque rôle doit avoir ses droits, appliqués dans la base et pas seulement dans les écrans.

## Décision
- **Patron** : tout.
- **Chef d'équipe** : tous les chantiers, les demandes, l'argent (devis, factures, paiements, relances, dépenses, suivi), les décisions sur un chantier (planning, rendez-vous, démarrage, fin, réception, annulation), l'attribution des chantiers, l'agenda (créneaux, absences, horaires, disponibilité, lien d'abonnement) et la secrétaire. Pas l'abonnement, Stripe, les recharges, l'export comptable, la vitrine (fiche, métiers, zone, réalisations, certifications, réponses aux avis), le dossier, l'équipe ni le parrainage.
- **Ouvrier** : seulement les chantiers qui lui sont attribués (journal, photos, messages avec le client, rendez-vous et leurs notes, signalements), aucun montant nulle part, aucune demande. Le détail d'un chantier lui montre la demande (description, adresse, client) sans le budget annoncé.
- **Trois aides d'accès** remplacent `app.my_artisan_id()` selon le cas : `app.my_manager_artisan_id()` (patron ou chef, sinon rien), `app.my_owned_artisan_id()` (patron seul, ADR 0240) et `app.can_see_chantier(chantier, artisan)` (patron ou chef de l'entreprise, ou ouvrier attribué ; `app.user_can_see_chantier` pour les fonctions de service appelées au nom d'un compte). `app.my_artisan_id()` reste pour ce qui est commun à l'équipe (horaires, absences, métiers, zones, réalisations et certifications en lecture, badges, score, formule et statut de l'abonnement, minutes de la secrétaire, logo).
- **Règles d'accès** : 43 règles réécrites (`alter policy`), à partir de leur texte en vigueur.
- **Fonctions** : 75 fonctions redéfinies depuis leur définition en vigueur (`pg_get_functiondef`), avec la seule aide d'accès remplacée ; une aide de migration temporaire vérifie chaque remplacement et le nombre de fonctions. Le test pgTAP `130_droits_equipe` échoue si l'une d'elles revient à `app.my_artisan_id()` : toute redéfinition future doit garder la bonne aide.
- **Attribution** : table `chantier_assignments` (plusieurs membres par chantier), écrite par `set_chantier_team` (patron ou chef, membres actifs de l'entreprise, journal d'audit `equipe_artisan.chantier`), lue par `chantier_team`. Un membre retiré perd ses attributions ; un membre suspendu les garde, sans accès tant que dure la suspension.
- **Fonctions serveur** : session vocale (devis avec Camille, essai de la secrétaire), lecture d'une dépense et justificatif de dépense réservés au patron et au chef (`teamArtisanId(…, { managers: true })`) ; photos du journal et pièces jointes limitées aux chantiers visibles.
- **Règle commune des écrans** : `teamCan(place, droit)` dans `packages/core`, mêmes règles que la base, pour la PR 2B.
- Restent au patron pour l'instant : recommander un partenaire (`recommend_partner`, `partner_recommendation_options`).

## Conséquences
- PR 2B : menus, garde-fous des pages, tableau de bord de l'ouvrier, choix des membres sur un chantier (site et application), contexte de l'assistant selon le rôle. D'ici là, un ouvrier voit des rubriques vides : pas de vrais salariés avant la PR 2B.
- Tests pgTAP `130_droits_equipe` (patron, chef, ouvrier attribué, ouvrier sans chantier, client, autre artisan, suspension, retrait) ; tests du cœur (`teamCan`).
- `TODO(legal)` de l'ADR 0240 inchangés (information des salariés, CGU des membres, responsabilité de l'entreprise).
