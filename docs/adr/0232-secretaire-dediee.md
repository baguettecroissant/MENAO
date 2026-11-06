# ADR 0232 — Secrétaire dédiée de l'artisan (agents IA, lot 3)

- Statut : accepté
- Date : 6 novembre 2026
- F-83, demandé le 6 novembre 2026 (« go pour le lot 1 puis le lot 3, comme tu recommandes »). Pépite n° 1 du plan des agents IA : une secrétaire IA branchée sur la vie de l'artisan (agenda, demandes, clients), et pas une simple boîte vocale. Incluse dans Premium et Entreprise (ADR 0231).

## Décision
- **Elle répond au nom de l'entreprise** de l'artisan :
  - nom annoncé réglable, sinon le nom commercial ;
  - elle connaît ses métiers, sa zone et ses horaires (agenda F-44) et transmet ses consignes (« pas de dépannage le dimanche ») ;
  - elle ne l'annonce pas dans son premier message (décision du 6 novembre 2026 : le mot inquiète les clients), mais dit franchement qu'elle est une intelligence artificielle si on le lui demande. `TODO(legal)` : faire confirmer par l'avocat l'obligation d'informer qu'on parle à une IA (règlement européen sur l'IA, article 50) ;
  - aucun prix, aucun diagnostic.
- **Ses trois outils** (Edge Function `voice-assistant`) :
  - `secretaire_creneaux` propose les prochains créneaux libres de l'agenda (`nextArtisanSlots`) : horaires de l'artisan, hors absences, créneaux bloqués et rendez-vous de chantier, deux heures d'avance au moins, un le matin et un l'après-midi au plus ;
  - `secretaire_reserver` prend le rendez-vous : la base refait les contrôles (chevauchement, absence, un rendez-vous par appel, une réservation à la fois par artisan), puis **bloque le créneau dans son agenda**, ce qui le fait apparaître aussi dans son abonnement .ics ;
  - `secretaire_message` transmet un message (urgent ou non, moment de rappel souhaité).
  - Chaque message ou rendez-vous est enregistré (`secretary_messages`, purgé au bout de 12 mois) et notifié à l'artisan (`secretaire_message`, push et e-mail). La notification ne contient ni numéro ni nom de famille.
- **L'artisan ne fait confiance qu'au serveur pour savoir pour qui agir** :
  - `voice-session` (artisan connecté) vérifie que sa formule comprend la secrétaire, prépare le contexte de l'appel et **signe un jeton de 30 minutes** avec le secret du serveur des outils (`signVoiceSession`) ;
  - le jeton passe par les variables de l'appel Vapi ;
  - les outils et le compte rendu de fin d'appel ne lisent l'artisan que dans ce jeton vérifié, jamais dans les arguments donnés par le modèle.
- **Minutes** :
  - chaque appel est compté à sa fin (`voice_record_usage`, ADR 0231) ;
  - minutes épuisées : mode « message », elle note le nom, le numéro et le motif, sans rendez-vous ;
  - un client n'est jamais laissé sans réponse.
- **Dans l'espace de l'artisan** (« Ma formule », carte « Votre secrétaire ») :
  - **l'essayer** par un appel web, comme un client ;
  - régler le nom annoncé, la prise de rendez-vous, la durée d'un rendez-vous et les consignes ;
  - voir les messages et rendez-vous avec le bouton Appeler, et marquer comme traité.
- **Un seul modèle d'assistante dans Vapi** (« Secrétaire artisan ») pour tous les artisans. Le contexte arrive par les variables de l'appel (`{{entreprise}}`, `{{metiers}}`, `{{zone}}`, `{{horaires}}`, `{{consignes}}`, `{{rendez_vous}}`, `{{mode}}`). Rien n'est configuré à la main par artisan. Identifiant dans `NEXT_PUBLIC_VAPI_SECRETARY_ASSISTANT_ID`.

## Conséquences
- Tests pgTAP `122_secretaire_dediee` ; tests unitaires du jeton, des créneaux et des horaires.
- **Plus tard, les vrais numéros** :
  - un numéro par artisan et un webhook `assistant-request` de Vapi qui retrouve l'artisan par le numéro appelé et renvoie le même contexte ;
  - l'artisan garde son numéro grâce au renvoi d'appel « si occupé ou sans réponse » ;
  - avant ça : l'achat des numéros et l'avis de l'avocat sur leur titulaire et sur le traitement des données des clients de l'artisan (`TODO(legal)`).
- Le transfert vers le portable de l'artisan en cas d'urgence viendra avec les vrais numéros (impossible depuis un appel web).
