# ADR 0239 — Rappels aux clients par SMS

- Statut : accepté
- Date : 7 novembre 2026
- F-88, PR A du lot 6 des agents IA (« go pour la PR A comme tu recommandes »). Premium (`plans.limites.agents.rappels` = « sms ») et Entreprise (« appel » : SMS aujourd'hui, appel de rappel plus tard).

## Contexte
Les rappels au client existent déjà par e-mail et notification, pour toutes les formules, au nom de MENAO (ADR 0033, 0090, 0183, 0238). Aucun envoi de SMS n'existait ; le projet prévoit Brevo derrière `NotificationProvider` (CLAUDE.md règle 14).

## Décision
- **Quatre rappels partent aussi par SMS**, au nom de l'entreprise de l'artisan (« Plomberie Dupont (via MENAO) : … ») :
  - la veille du rendez-vous (`rdv_rappel`) ;
  - la veille du démarrage (`demarrage_rappel`) ;
  - l'acompte ou le solde à régler (`acompte_relance`, `paiement_relance`) ;
  - la demande d'avis (`avis_relance`).
- **Réglages** (`client_reminder_settings`, carte « Rappels à vos clients » de « Ma formule », site) : rendez-vous et démarrage activés par défaut, acompte et avis à activer (décision du 7 novembre 2026).
- **SMS inclus par mois** : 100 en Premium et 300 en Entreprise (`plans.limites.agents.sms_mois`, réglable en base), sans recharge. Au-delà, l'e-mail part toujours, plus aucun SMS jusqu'au 1er du mois.
- **Copie par déclencheur** (`app.copy_reminder_as_sms`, après l'insertion d'un rappel) :
  - le rappel doit être adressé au client du chantier (jamais la copie de l'artisan) ;
  - la formule doit le comprendre, le réglage être activé et le mois ne pas avoir épuisé ses SMS ;
  - le client doit avoir donné un portable français (06 ou 07) dans sa demande.
  - La copie SMS ne figure pas dans le centre de notifications du client, qui garde l'original.
- **Le numéro n'est jamais stocké dans la notification** : `claim_sms_notifications` le lit au moment de l'envoi dans la demande du chantier. Les préférences du client s'appliquent comme pour l'e-mail.
- **Textes** (`packages/emails/src/sms.ts`) : un seul SMS de 160 caractères dans l'alphabet GSM (accents absents remplacés, titre raccourci si besoin). Pas de mention « STOP » : ce sont des SMS de service, et Brevo classe en marketing tout SMS qui la contient.
- **Envoi** par `BrevoSmsProvider` (expéditeur « MENAO », clé `BREVO_API_KEY`). Sans clé, les SMS sont classés en échec « sms non configuré », sans nouvel essai : rien ne part en retard une fois le compte branché.
- `TODO(legal)` : SMS de service à un particulier au nom de l'artisan ; contrat de sous-traitance avec Brevo.

## Conséquences
- Tests pgTAP `128_rappels_sms` ; tests des textes SMS et du cœur.
- Mise en service : créer le compte Brevo, acheter des crédits SMS, poser `BREVO_API_KEY` dans les secrets Supabase, puis redéployer `notify`.
- PR B, plus tard : appel de rappel en Entreprise, après l'achat des numéros et l'avis de l'avocat.
