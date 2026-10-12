# ADR 0048 — Actions de l'équipe sur un compte

- Statut : accepté
- Date : 12 octobre 2026
- Termine F-52 (lot 3b de l'audit du back-office). Complète l'ADR 0039 (Mon compte, demandes de suppression) et l'ADR 0047 (personnes).

## Contexte
- La spec (F-52) prévoit, depuis la fiche d'une personne : suspension, réinitialisation, export RGPD et suppression.
- L'ADR 0039 a établi que les demandes de suppression arrivent en tickets, à traiter sous un mois, et que l'effacement reste manuel tant que les durées de conservation ne sont pas validées.
- L'application web n'utilise jamais la clé `service_role` (règles 1 et 13).

## Décision
- **Section « Actions sur le compte »** de la fiche d'une personne. Elle ne s'affiche ni pour un compte de l'équipe, ni pour soi-même ; les sessions anonymes ne sont jamais concernées.
- **Lien de réinitialisation du mot de passe** :
  - envoyé par Supabase Auth à l'adresse du compte : le même e-mail et le même parcours que « Mot de passe oublié » ;
  - journalisé (`compte.lien_mot_de_passe`).
- **Export RGPD** (`/admin/personnes/[id]/donnees`) : fichier JSON, journalisé (`compte.export`).
  - L'équipe lit toutes les lignes : chaque table est donc filtrée explicitement sur la personne, contrairement à l'export de « Mon compte », filtré par la base.
  - **Les messages entre client et artisan n'y sont pas** : ils restent privés, et la personne les obtient par son propre export.
- **Suspension de l'accès** (`admin_suspend_account`) :
  - connexion refusée (`banned_until`, lu par Supabase Auth) et sessions fermées ; une page déjà ouverte garde son jeton au plus une heure ;
  - motif obligatoire, transmis par e-mail (`acces_suspendu`) avec une invitation à écrire à l'équipe ; journalisée ;
  - les données ne changent pas.
  - Pour un artisan, cela bloque aussi son espace pro. Pour seulement le retirer des recherches, la suspension de sa fiche (ADR 0047) suffit.
  - Le rétablissement (`admin_reactivate_account`) est journalisé et notifié (`acces_retabli`).
- **Demandes de suppression** :
  - une carte de la vue d'ensemble donne le nombre de demandes ouvertes et l'échéance la plus proche ;
  - la fiche de la personne affiche la demande, son échéance (un mois) et les étapes : exporter, suspendre l'accès, effacer ou anonymiser, répondre et clore le ticket.
- **Pas d'effacement automatique** : il reste manuel, comme l'a décidé l'ADR 0039.

## Points à valider (TODO(legal))
- Durées de conservation et anonymisation avant tout effacement automatique : devis, factures et PV, que l'artisan doit conserver ; avis publiés ; données de paiement.
- Délais et formulation de la suspension d'un compte (motif transmis).

## Conséquences
- À déployer : les deux migrations (valeurs de notification, fonctions) et la fonction `notify` (nouveaux e-mails).
