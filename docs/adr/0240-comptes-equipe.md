# ADR 0240 — Comptes d'équipe : fondations et invitations

- Statut : accepté
- Date : 7 novembre 2026
- F-89, PR 1 des comptes d'équipe (« go pour la PR 1 comme tu recommandes »). Comptes par formule déjà en base : `plans.limites.comptes` = 1 (Base), 3 (Premium), 10 (Entreprise), patron compris.

## Contexte
Une fiche artisan n'avait qu'un titulaire (`artisans.user_id`) : toutes les règles d'accès passent par `app.my_artisan_id()` (plus de 160 usages), qui retrouvait la fiche du compte connecté. Les formules Premium et Entreprise annoncent pourtant plusieurs comptes.

## Décision
- **Trois places dans l'entreprise** : le patron (titulaire de la fiche), le chef d'équipe et l'ouvrier (`team_role`). Une personne appartient à une seule entreprise (`artisan_members.user_id` unique) ; un patron n'est jamais membre d'une autre entreprise.
- **`app.my_artisan_id()` reconnaît les membres** : la fiche du titulaire, sinon celle dont le compte est membre actif (`app.artisan_id_of`). Elle devient `security definer`, ce qui permet une politique de lecture de la fiche par ses membres sans boucle. La modification de la fiche (entreprise, SIRET, présentation) reste au titulaire.
- **Le compte d'un membre porte le rôle `artisan`** (`app_metadata`, règle 7), posé par l'Edge Function `team-members` avec la clé serveur, jamais par l'inscription ; il redevient `particulier` quand le membre est retiré (déclencheur), et ses sessions sont fermées.
- **Invitation par le patron** (« Mon équipe », depuis « Mon profil », site et application) : prénom, nom, e-mail et rôle. Même déroulé que l'invitation de l'équipe MENAO (ADR 0210) : compte créé, rôle posé, invitation enregistrée au nom du patron (`artisan_record_team_invite` : entreprise validée, place libre, compte neuf), e-mail Supabase (version « équipe d'un artisan » du modèle `invite.html`), retour en arrière si une étape échoue.
- **Places** (`app.artisan_seats`) : celles de la formule si l'abonnement est actif, sinon une seule. **Formule réduite ou impayé prolongé** (`app.sync_team_seats`, au changement d'abonnement et chaque nuit) : les derniers invités sont suspendus, jamais supprimés ; ils reviennent dans l'ordre d'invitation quand des places se libèrent. Le patron peut aussi suspendre ou réactiver un membre (une suspension par le patron ne se lève jamais seule), changer son rôle, ou le retirer (compte supprimé si l'invitation n'a jamais servi).
- **Membre suspendu** : plus aucun accès aux données de l'entreprise ; page « Accès suspendu » sur le site.
- **Fonctions serveur** : photos du journal, pièces jointes des messages, devis avec Camille, lecture et justificatif d'une dépense reconnaissent les membres ; abonnement, Stripe, dossier, documents, export des factures restent au patron.
- **Application** : « Mon équipe » n'apparaît qu'au patron d'une formule qui comprend des comptes d'équipe, sans mention de formule ni lien vers le site (règle 10). Les lectures de la fiche passent par `my_team_context` au lieu du titulaire.
- **Ce que la PR 1 ne fait pas encore** : les droits propres à chaque rôle (l'ouvrier ne voit pas les montants, chantiers attribués) arrivent avec la PR 2 ; les notifications des membres et le nom de l'auteur des messages (« Prénom (Entreprise) ») avec la PR 3. D'ici là, un membre actif voit l'espace comme le patron : pas de vrais salariés avant la PR 2.
- `TODO(legal)` : information des salariés (RGPD), acceptation des CGU par les membres, responsabilité de l'entreprise pour les actions de ses membres.

## Conséquences
- Tests pgTAP `129_comptes_equipe` ; tests du cœur (`team.ts`) et de la validation (`teamInviteSchema`).
- Mise en service : migration, Edge Functions `team-members`, `process-upload`, `read-expense`, `voice-session`, et modèle d'e-mail d'invitation du projet (version « équipe d'un artisan »).
