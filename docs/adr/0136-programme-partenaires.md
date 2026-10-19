# ADR 0136 — Programme Partenaires : liens sans traceur, commissions fixes

- Statut : accepté
- Date : 19 octobre 2026
- Suite du plan d'acquisition du site (ADR 0134, 0135). Lot 1 sur 2.

## Contexte
- **Demande de l'utilisateur** : un système d'acquisition par affiliation, « bien rodé » comme ceux de travaux.com, Viteundevis ou Bobex (liens affiliés, iframes).
- **Ce que font ces plateformes** :
  - lien suivi par un cookie de 30 à 60 jours, bannières, formulaire en marque blanche, API ;
  - paiement de 5 à 25 € par lead, financé par la revente des demandes aux artisans.
- **Ce qui change pour MENAO** :
  - MENAO ne vend pas les demandes (abonnement fixe, aucune commission, règle 12) : chaque euro versé à un partenaire sort des abonnements ;
  - le business plan prévoit déjà l'acquisition par les prescripteurs (agences, notaires, syndics, négoces, assureurs) et le parrainage.
- **Cookies** : pour la CNIL, les traceurs de facturation de l'affiliation ne sont pas exemptés de consentement (FAQ « cookies et autres traceurs »). Le site n'a pas de bandeau de consentement.
- **Choix de l'utilisateur** :
  - côté clients, une prime fixe par **demande qualifiée** ;
  - côté artisans, le **parrainage** (lot suivant) et une **prime fixe** par artisan devenu abonné payant ;
  - partenaires rémunérés : **professionnels avec SIRET** uniquement ;
  - ordre : lot 1 (fondations, ici), puis lot 2 (widget, kit, espace partenaire).

## Décision
- **Partenaires** (`partners`) : nom, SIRET vérifié, e-mail de contact, code du lien et statut (actif ou suspendu). Primes négociées facultatives ; sinon, les montants par défaut des réglages.
  - Le code ne change jamais, pour que les liens déjà diffusés restent valables.
- **Réglages** (`partner_settings`, une ligne) : primes par défaut, délai de validation (30 jours par défaut) et plafond mensuel de demandes rémunérées (facultatif).
  - Les montants sont nuls tant qu'ils ne sont pas décidés (règle 15) : les commissions sont alors enregistrées à 0 €, avec une alerte dans le back-office.
- **Liens sans traceur** :
  - `menao.fr/p/<code>` redirige vers la recherche, `menao.fr/p/<code>/pro` vers l'inscription artisan ;
  - ce sont de simples redirections de `next.config`, sans fonction serveur ;
  - le code suit l'adresse (`?p=`) jusqu'à la demande ou à l'inscription, sans cookie ni stockage dans le navigateur ;
  - si le visiteur quitte le parcours, l'attribution est perdue : c'est le prix d'un site sans bandeau de consentement.
- **Attribution** (`partner_attributions`, table à part) : ni les projets ni les fiches artisans ne portent le partenaire.
  - **Projet** : rattaché par `analyze-need` (clé serveur) à sa création. Le navigateur ne peut pas s'attribuer un code.
  - **Artisan** : rattaché à l'inscription, par e-mail ou Google/Apple (`app.apply_artisan_signup`). Pour Google/Apple, le code suit l'adresse de retour.
- **Commissions** (`partner_commissions`), au montant du moment :
  - **demande qualifiée** : à la première acceptation d'un artisan sur un projet attribué (déclencheur sur `requests`) ; une seule par projet ;
  - **abonné payant** : à la première facture réellement payée (`invoice.paid`, montant positif, `record_subscription_payment`), donc après l'essai de 3 mois ; une seule par artisan.
  - **Annulées d'office**, et gardées pour la transparence : si le client ou l'artisan est le partenaire lui-même (même e-mail), ou si le plafond mensuel est atteint.
  - **Validation** : une tâche quotidienne (`menao-commissions-partenaires`, 3 h 45 UTC) les valide à la fin du délai. Une prime « abonné » est annulée si l'abonnement n'est plus actif ; un partenaire suspendu garde ses commissions en attente.
  - **Paiement par virement**, hors de l'application : l'admin marque les commissions payées avec une référence (la facture du partenaire), ou les annule avec un motif. Tout est inscrit au journal d'audit.
- **Back-office** (pôle Argent, admins en session aal2) :
  - la liste avec les chiffres clés : demandes attribuées et qualifiées, artisans et abonnés payants, montants en attente, à payer et payés ;
  - la création d'un partenaire et les réglages ;
  - la fiche du partenaire : liens à copier, commissions, virement et annulation ;
  - l'export CSV des commissions à payer, pour un tableur français.
- **Stripe** : l'événement `invoice.paid` est ajouté au webhook des abonnements. `pnpm stripe:setup` synchronise la liste des événements ; il faut le relancer en staging et en production.
- **Données personnelles** : le partenaire ne voit jamais les coordonnées des clients ni des artisans. Seule l'équipe MENAO lit les attributions.

## Conséquences
- **Lot 2** : un widget à intégrer (iframe sans donnée personnelle, qui ouvre la recherche pré-remplie dans un nouvel onglet), un kit de bannières et un espace partenaire en libre-service.
- **Parrainage entre artisans** : PR suivante. Il reprendra le premier paiement réel (`record_subscription_payment`).
- **[TODO(legal)]** : le contrat partenaire (mention « Publicité » ou « Collaboration commerciale », loi n° 2023-451), la facturation des commissions par le partenaire, et le traitement des sommes versées.
- **Pas de nouvelle dépendance**, aucun service propriétaire Vercel. Les liens ne coûtent aucune fonction serveur.
