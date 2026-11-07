# ADR 0242 — Comptes d'équipe : écrans selon la place

- Statut : accepté
- Date : 7 novembre 2026
- F-89, PR 2B des comptes d'équipe, après l'ADR 0241 (droits par rôle dans la base).

## Contexte
Depuis l'ADR 0241, la base n'ouvre à chaque place que ses données ; les écrans du site et de l'application montraient encore toutes les rubriques, vides ou en erreur pour un ouvrier ou un chef d'équipe.

## Décision
- **Une règle commune** (`packages/core`) : `teamCan(place, droit)` (ADR 0241), `chantierRights(place)` pour la fiche d'un chantier (argent, décisions, réponse aux avis, attribution), `todoForPosition` pour « À faire maintenant », `parseChantierTeam` pour l'équipe d'un chantier.
- **Site** : menu filtré par place (Demandes, Argent, Ma vitrine) ; garde `requireTeamPermission` sur les pages réservées (Argent et ses onglets, devis d'un chantier, Demandes, Ma vitrine, cartes de visite, Disponibilités, Envoi au comptable), retour à l'accueil sinon ; carte de visibilité, exemples et lien « Ma fiche publique » du menu du compte au patron ; export et envoi au comptable au patron (route d'export des dépenses comprise).
- **Application** : onglets Demandes et Argent masqués pour l'ouvrier ; actions du (+) filtrées (l'ouvrier garde la photo d'un chantier et l'agenda) ; garde `withTeamPermission` sur les 36 écrans réservés ; exemples au patron.
- **Accueil** : l'ouvrier voit ses prochains rendez-vous et ses chantiers, sans chiffres ; le chef garde l'accueil du patron, sans dossier, paiements en ligne, avis, grade, cadeau ni raccourcis « Partager ma fiche » et « Inviter un artisan ».
- **Fiche d'un chantier** : sans argent (devis, acompte, échéancier, factures, solde) ni décisions (rendez-vous, démarrage, fin, réception, annulation, expertise, note du client) pour l'ouvrier ; réponse aux avis au patron ; carte « Équipe sur ce chantier » pour le patron et le chef, dès qu'il y a un membre actif (cases à cocher sur le site, enregistrement à chaque choix dans l'application).
- **Mon profil** : chaque rubrique liée à un droit ; un membre garde son compte, ses notifications et l'aide (plus disponibilités, factures et dépenses pour le chef) ; jauge, « Voir ma fiche » et bandeau du dossier au patron.
- **Agenda** : en lecture pour l'ouvrier (rendez-vous de ses chantiers ; ni créneaux, ni disponibilités, ni calendrier du téléphone).
- **Assistant de l'espace artisan** : `my_assistant_context` donne la place ; pour un ouvrier, seulement ses chantiers et son prochain rendez-vous ; le guide gagne une rubrique « Équipe ».

## Conséquences
- Tests : cœur (`teamCan`, `chantierRights`, `todoForPosition`, `parseChantierTeam`, texte du compte de l'assistant), pgTAP `130_droits_equipe` (contexte de l'assistant par place).
- Mise en service : migration `assistant_equipe`, Edge Function `artisan-assistant` (guide).
- PR 3 : notifications des membres, nom de l'auteur des messages (« Prénom (Entreprise) »), journal ; `TODO(legal)` de l'ADR 0240 toujours à faire valider avant de vrais salariés.
