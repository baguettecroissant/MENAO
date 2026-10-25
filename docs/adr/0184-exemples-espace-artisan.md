# ADR 0184 — Espace artisan rempli d'exemples

- Statut : accepté
- Date : 25 octobre 2026
- Idée reprise de l'analyse d'un concurrent (25 octobre 2026), dont le compte s'ouvre déjà rempli de données d'exemple. Demande de l'utilisateur : « fais la 3 » ; choix du 25 octobre 2026 : exemples **pendant la vérification et après la validation**, dans **les vrais écrans**.

## Décision
- **Pendant la vérification du dossier** : sur « Mon dossier », une carte « Découvrez votre futur espace » ouvre l'espace pro rempli d'exemples (`/pro/decouvrir`) : tableau de bord, demandes, chantiers.
- **Après la validation** : tant que l'artisan n'a reçu aucune demande ni aucun chantier, ses pages Demandes et Chantiers montrent les exemples, avec la pastille « Exemple ». Son tableau de bord affiche une carte « Découvrez votre espace avec des exemples ». Les exemples disparaissent dès la première vraie demande ; « Masquer les exemples » les retire avant.
- **Ce que contiennent les exemples** :
  - deux demandes à traiter, dont une urgente ;
  - un rendez-vous le lendemain à 10 h ;
  - un devis envoyé ;
  - un chantier en cours, avec acompte payé, journal (photo, messages), échéancier et documents.
- **Les vrais écrans** (vue d'une opportunité, d'un rendez-vous, suivi du chantier), avec un bandeau « Exemples pour découvrir votre espace ». Les actions restent visibles mais inactives, avec la mention « Exemple : les boutons sont désactivés ».
- **Rien n'est lu ni écrit en base** pour les exemples. Personnes, adresses (« … de l'Exemple »), numéros (+33 6 00 00 00 0x, @example.com) et numéros de documents (« DEVIS-EXEMPLE-… », « FAC-EXEMPLE-… ») sont fictifs. Aucune notification n'est envoyée, aucun numéro de devis ou de facture n'est consommé, et les statistiques ne bougent pas.

## Technique
- **`packages/core/src/space-examples.ts`** :
  - données d'exemple aux formes des fonctions de la base (`artisan_inbox`, `artisan_chantiers`, `artisan_request_detail`, `artisan_chantier_detail`), dates relatives à maintenant (heure de Paris) ;
  - identifiants fixes reconnaissables (`isExampleId`) ;
  - `spaceExamplesShown`.
  - Un test du paquet validation vérifie que chaque exemple passe les contrôles du site et de l'application.
- **Base** : colonne `artisans.examples_hidden_at` et fonction `hide_space_examples()` (garde la première date). Test pgTAP `101_exemples_espace`.
- **Site** :
  - les écrans sont séparés de la lecture des données : `InboxList`, `ChantierList`, `RequestOpportunityView`, `ChantierAppointmentView`, `ArtisanFollowUpView` ;
  - le tableau de bord et « À faire maintenant » prennent un début de lien (`base`) ;
  - les pages `/pro/decouvrir/*` (espace de menu « exemples ») sont ouvertes à tout compte artisan, protégées par le filtre de session ;
  - `ExampleLock` rend les actions inertes (attribut `inert`).
- **Test de bout en bout** : après l'envoi du dossier, visite des exemples. On y vérifie le bandeau, les pastilles, le bouton « Fixer un rendez-vous » hors d'atteinte, le journal, la facture d'acompte du dossier et le retour au dossier.

## Conséquences
- Migration `exemples_espace`. Après la fusion : `db push` sur staging.
- **Application mobile** : même fonctionnement dans un second lot (données et choix « masquer » déjà partagés).
- Pas de nouvelle dépendance.
