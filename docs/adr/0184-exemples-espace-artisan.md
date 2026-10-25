# ADR 0184 — Espace artisan rempli d'exemples

- Statut : accepté
- Date : 25 octobre 2026
- Idée reprise de l'analyse d'un concurrent (25 octobre 2026), dont le compte s'ouvre déjà rempli de données d'exemple. Demande de l'utilisateur : « fais la 3 » ; choix du 25 octobre 2026 : exemples **pendant la vérification et après la validation**, dans **les vrais écrans**.

## Décision
- **Pendant la vérification du dossier** : sur « Mon dossier », une carte « Découvrez votre futur espace » ouvre l'espace pro rempli d'exemples (`/pro/decouvrir`), **avec toutes ses rubriques** (demande du 25 octobre 2026) : tableau de bord, demandes, chantiers, devis (et l'éditeur de devis), messages, agenda, factures, mon profil, ma fiche, avis, mon grade.
- **Après la validation** : tant que l'artisan n'a reçu aucune demande ni aucun chantier, ses pages Demandes et Chantiers montrent les exemples, avec la pastille « Exemple ». Son tableau de bord affiche une carte « Découvrez votre espace avec des exemples ». Les exemples disparaissent dès la première vraie demande ; « Masquer les exemples » les retire avant.
- **Ce que contiennent les exemples** :
  - deux demandes à traiter, dont une urgente ;
  - un rendez-vous le prochain jour ouvré à 10 h, avec son devis en préparation ;
  - un devis envoyé ;
  - un chantier en cours, avec acompte payé, journal (photo, messages), échéancier et documents ;
  - une conversation par chantier, l'agenda de la semaine (visites, démarrage, créneau bloqué), la facture d'acompte ;
  - trois avis (dont un à traiter) et le score ;
  - « Mon profil » et « Ma fiche » au nom de l'artisan, entreprise « Votre entreprise » ;
  - le vrai barème du grade avec une progression fictive de niveau 2.
- Rendez-vous, démarrages et créneaux tombent toujours un jour ouvré.
- **Les vrais écrans**, avec la navigation entre les exemples (devis, conversation, fiche…). Les actions qui écriraient quelque chose restent visibles mais inactives, avec la mention « Exemple : les boutons sont désactivés ».
- **Une couleur à part** pour tout ce qui est exemple : orange (jetons `example`, `example-soft`, `example-strong`, contraste AA vérifié), distinct du bleu MENAO. Les pages d'exemples ont un bandeau fin en haut de l'écran, « Données d'exemple », replié sur téléphone. La pastille « Exemple », la carte du dossier et la mention de l'espace prennent la même couleur.
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
  - `ExampleLock` rend les actions inertes (attribut `inert`) ;
  - `exampleHref` fait pointer un lien de l'espace pro vers sa page d'exemple ;
  - le bandeau passe par `AppShell` (`topBanner`), au-dessus de la barre du haut.
- **Test de bout en bout** : après l'envoi du dossier, visite des exemples. On y vérifie le bandeau, les pastilles, le bouton « Fixer un rendez-vous » hors d'atteinte, le journal, la facture d'acompte du dossier, chaque rubrique, l'éditeur de devis et le retour au dossier.

## Conséquences
- Migration `exemples_espace`, appliquée sur staging le 25 octobre 2026 pour les essais en local.
- **Application mobile** : même fonctionnement dans un second lot (données et choix « masquer » déjà partagés).
- Pas de nouvelle dépendance.
