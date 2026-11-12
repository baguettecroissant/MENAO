# ADR 0284 — Rangement du back-office, lot 2 : Réglages et Équipe MENAO (F-133)

- Statut : accepté
- Date : 11 novembre 2026
- Suit l'ADR 0283 (lot 1, menu et noms). Complète les ADR 0106 (paramètres de la plateforme), 0136 (partenaires), 0207 (primes des commerciaux), 0209 (chiffres du lancement), 0210 (invitation de l'équipe), 0230 (horaires d'accueil) et 0282 (objectifs de demandes).

## Contexte
Les réglages de toute la plateforme étaient éparpillés sur six pages, souvent en bas de page :
- la notation des clients, dans « Métiers et travaux » ;
- l'objectif de demandes, sur « Objectifs de demandes » ;
- les horaires d'accueil, en bas de la boîte de réception ;
- les montants des partenaires, sur « Partenaires » ;
- les primes des commerciaux, sur « Commerciaux » ;
- les réglages des chiffres, dans « Lancement ».

L'équipe MENAO n'avait pas de page : l'invitation se cachait derrière un filtre de « Comptes ». Aucun moyen non plus de changer l'accès d'un membre ou de le retirer quand il part. Maquettes validées le 11 novembre 2026 (lot 31 du canevas).

## Décision
- **Rubrique « Réglages »**, en tête de la section Système, avec deux onglets :
  - **Réglages** (`/admin/reglages`) : les six réglages sur une seule page, avec un sous-menu à gauche (Plateforme, Demandes, Accueil du support, Partenaires, Commerciaux, Lancement). Les formulaires sont ceux d'avant.
  - **Équipe MENAO** (`/admin/reglages/equipe`).
- **Dernière modification** : chaque réglage indique « Modifié le … par … ». L'information vient du journal d'audit (`platform_setting`, `objectif_demandes`, `partenaires.reglages`, `commerciaux.reglages_primes`, `lancement.reglages`) ; pour les horaires d'accueil, des colonnes `updated_at` et `updated_by`.
- **Pages d'origine** : le formulaire est remplacé par une ligne de résumé et un lien « Modifier dans Réglages » (`SettingsLink`).
  - Exemple : « 110 € à la validation · 30 € à l'abonnement · après 30 jours ».
  - La boîte de réception garde les horaires en lecture, avec ce lien pour un admin.
  - Les réglages propres à une fiche restent sur la fiche : l'objectif d'un artisan, le montant négocié avec un partenaire.
- **Retour après enregistrement** : l'objectif par défaut et les réglages du lancement reviennent sur la page Réglages (`?fait=objectif`, `?fait=lancement`) ; les autres affichent leur message sur place.
- **Équipe MENAO** :
  - **Chiffres** : membres, double authentification activée, invitations en attente (pas encore de première connexion).
  - **Liste des membres** : accès, double authentification, dernière connexion.
  - **Invitation** : le formulaire existant (Edge Function `staff-invite`). Le bouton « Inviter un membre de l'équipe » de Comptes mène ici.
  - **Aide** : un encart « Ce que voit chaque accès ».
- **Menu « ⋯ » d'un membre**, jamais sur sa propre ligne :
  - **« Passer en Support / Admin »** : `admin_set_staff_role`.
  - **« Retirer l'accès »** après confirmation : `admin_remove_staff`.
  - La base vérifie l'admin en double authentification et refuse son propre compte.
  - Le rôle change dans `app_metadata` (règle 7), recopié dans `profiles` par le déclencheur existant.
  - Les sessions du membre sont fermées, et chaque action est journalisée (`equipe.acces`, `equipe.retrait`).
  - Retirer l'accès remet le rôle « particulier » et bloque la connexion. Le nom du membre reste dans le journal et sur les tickets qu'il a traités.
- **Base** : `admin_staff_members()`, `admin_set_staff_role(uuid, app_role)`, `admin_remove_staff(uuid)` et l'aide interne `app.staff_target(uuid)`. Tests pgTAP `135_equipe_menao`.

## Non décidé
- Les rôles des salariés (support en lecture sur les fiches, rôle « Vérification ») : lot 4, à trancher par l'utilisateur.
- Annuler une invitation non acceptée : aujourd'hui, « Retirer l'accès » sert aussi à ça.
