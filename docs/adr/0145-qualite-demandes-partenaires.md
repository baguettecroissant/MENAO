# ADR 0145 — Qualité des demandes des partenaires

- Statut : accepté
- Date : 19 octobre 2026
- Complète l'ADR 0136 (programme Partenaires). Choix de l'utilisateur : « go qualité avec le point 1 ».

## Contexte
- **Le risque** : payer des primes pour des demandes sans valeur (faux clients, doublons, partenaire qui se fabrique des demandes).
- **Les trous constatés** :
  - après l'acceptation d'un artisan, rien n'était plus vérifié : la prime passait « À payer » au bout du délai, sauf annulation à la main ;
  - le partenaire qui se servait lui-même n'était repéré que par son e-mail ;
  - un même client pouvait générer plusieurs primes, et le plafond mensuel était vide par défaut ;
  - aucun indicateur de qualité par partenaire.
- **Point clé** : accepter une demande, c'est déjà fixer un rendez-vous (ADR 0016), avant même d'avoir le numéro du client. « Rendez-vous fixé » ne prouve donc pas un vrai contact.

## Décision
1. **Validation avec un vrai contact** (`app.partner_lead_contact`). Au bout du délai, une demande qualifiée n'est validée que si l'un des deux cas est vrai :
   - un devis a été envoyé ;
   - une visite a eu lieu : sa date est passée et le chantier n'a pas été annulé avant elle.

   **Visite encore à venir** : la validation attend trois jours après elle, dans la limite de 180 jours après la demande.

   **Sinon** : la prime est annulée (« Ni visite ni devis dans le délai de validation »).

   Un chantier signalé par l'artisan ne compte jamais comme un contact.
2. **Signalement par l'artisan**. « Annuler le chantier » demande maintenant le motif, sur le site comme dans l'application :
   - « Je n'arrive pas à joindre le client » ;
   - « Le client n'était pas là au rendez-vous » ;
   - « La demande n'est pas sérieuse » ;
   - « Autre raison ».

   Les trois premiers motifs sont des signalements :
   - ils sont enregistrés dans `chantier_reports`, lue par l'équipe seule. Le journal du chantier, lu par le client, ne garde que le message facultatif destiné au client ;
   - ils annulent la prime d'un partenaire encore en attente sur la demande.
3. **Doublons**. Pour un même partenaire, sur 90 jours :
   - un même client ne compte qu'une fois ;
   - un même téléphone ne compte qu'une fois. C'est le téléphone donné à l'envoi de la demande, sinon celui du profil.

   La demande en trop est annulée d'office.
4. **Partenaire qui se sert lui-même**. La prime est annulée d'office si l'un de ces points correspond au partenaire :
   - l'e-mail du client ;
   - le téléphone du client, comparé au nouveau champ facultatif « téléphone du partenaire » ;
   - le SIREN de l'artisan qui accepte la demande (ou de l'abonné, pour une prime d'abonné).
5. **Signaux « à vérifier »** (`partner_commissions.review_reason`) :
   - 5 demandes ou plus en 24 h pour un même partenaire ;
   - un téléphone déjà utilisé par un autre compte client.

   La prime reste en attente : la validation automatique la laisse de côté jusqu'à la décision d'un admin.
   - « Valider quand même » (`admin_clear_commission_review`, journalisé) lève le signal. Le délai et le contact restent exigés.
   - « Annuler » fonctionne comme avant.
6. **Suivi** :
   - plafond mensuel réglable partenaire par partenaire (sinon celui des réglages) ;
   - entonnoir sur la fiche du partenaire (`admin_partner_funnel`) : demandes attribuées, envoyées, rendez-vous fixé, visite passée ou devis envoyé, devis signé, en nombre et en pourcentage ;
   - bandeau « primes à vérifier » sur la liste des partenaires.
- **Ordre des contrôles** à la création d'une prime :
  1. partenaire lui-même (e-mail, téléphone, SIREN) ;
  2. plafond mensuel ;
  3. même client ;
  4. même téléphone ;
  5. signaux « à vérifier », pour les seules primes non annulées.

## Conséquences
- **Une prime n'est payée que pour une demande suivie d'une visite réelle ou d'un devis**, et le virement reste manuel, après la facture du partenaire.
- **Les seuils sont fixés dans la base** et pourront devenir des réglages si besoin : 90 jours, 5 demandes en 24 h, 3 jours après la visite, 180 jours au plus.
- **Le téléphone n'est toujours pas vérifié par SMS** : ce serait une dépense (Brevo) à décider.
- **« Annuler le chantier » demande désormais un motif** à l'artisan (site et application). Le message au client reste facultatif.
- **Migration `qualite_demandes_partenaires`** :
  - une nouvelle table avec ses politiques ;
  - trois colonnes ;
  - `artisan_cancel_chantier` et `admin_save_partner` recréées avec des paramètres facultatifs en plus ;
  - de nouvelles fonctions.
- **Tests** : pgTAP `75_qualite_demandes_partenaires` (et `68_partenaires` adapté), tests du code partagé et de la validation. Pas de nouvelle dépendance.
