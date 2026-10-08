# MENAO — Cahier des charges V1 (web + app native)

> Version 1.0 — 8 octobre 2026
> Document de référence pour le développement avec Claude Code.
> Source : maquettes Figma MENAO (80 écrans), échanges fondateurs, choix techniques validés.
> À placer dans le dépôt sous `docs/CAHIER_DES_CHARGES_V1.md`. Les règles de travail sont dans `CLAUDE.md` à la racine.

---

## 0. Mode d'emploi pour Claude Code

1. Lire ce document **et** `CLAUDE.md` avant toute tâche.
2. Travailler **phase par phase** (section 15). Ne jamais commencer une phase tant que les critères d'acceptation de la précédente ne sont pas validés.
3. Chaque fonctionnalité a un identifiant (`F-xx`). Les commits, branches et PR le citent (ex. `feat(F-21): signature du devis`).
4. Toute décision marquée **[À VALIDER]** (section 17) ne doit pas être tranchée seul : implémenter derrière une option de configuration ou demander.
5. Les maquettes Figma font foi pour l'interface, **sauf** pour les erreurs listées en section 16, qui doivent être corrigées.
6. Aucune donnée personnelle réelle dans le code, les seeds ou les tests.

---

## 1. Vision et contexte

**MENAO** met en relation des particuliers avec des artisans du bâtiment vérifiés, et fournit aux artisans un outil tout-en-un : demandes, rendez-vous, devis, signature, paiement, suivi de chantier, réception, factures, avis.

- **Particulier** : décrit son besoin en langage naturel (texte, voix, photos), l'IA structure la demande, il choisit un artisan, signe le devis, paie en ligne, suit le chantier et le réceptionne. **100 % gratuit pour le particulier.**
- **Artisan** : reçoit des demandes qualifiées, crée ses devis (manuellement ou à la voix), se fait payer, gère ses chantiers. **Abonnement mensuel, zéro commission.**
- **MENAO** : vérifie manuellement chaque artisan (Kbis, assurances), modère, gère les litiges.

**Concurrents** : travaux.com, habitatpresto.com, Kelkun (le plus proche).
**Différenciation** : recherche IA, devis dictés, parcours complet jusqu'au PV de réception et au paiement sécurisé, sans commission.

**Pilote** : département des **Alpes-Maritimes (06)**, environ 24 000 entreprises artisanales du bâtiment (CMA PACA, 01/01/2026). Lancement national ensuite, international (Monaco, Dubaï) en année 2.

---

## 2. Périmètre de la V1

### 2.1 Dans la V1

| Domaine | Web (Next.js) | App native (Expo) |
|---|---|---|
| Site public, SEO, pages métiers × villes | Oui | — |
| Recherche IA particulier (texte, voix, photos) | Oui | Oui |
| Résultats, fiche artisan, demande de chantier | Oui | Oui |
| Comptes particulier et artisan | Oui | Oui |
| Inscription artisan + vérification documents | Oui | Consultation seulement |
| **Abonnement artisan (paiement)** | **Oui, uniquement web** | **Non** (voir F-14) |
| Tableau de bord artisan, demandes, rendez-vous | Oui | Oui |
| Devis (manuel + dictée IA) | Oui | Oui |
| Signature électronique devis et PV | Oui | Oui |
| Paiement acompte et solde (carte, Apple Pay, virement) | Oui | Oui |
| Suivi de chantier (photos, messages, étapes) | Oui | Oui |
| Réception avec/sans réserves, levée des réserves | Oui | Oui |
| Factures d'acompte et de solde (PDF) | Oui | Oui (consultation) |
| Avis client et notation du client par l'artisan | Oui | Oui |
| Messagerie temps réel | Oui | Oui |
| Notifications push, e-mail, SMS | e-mail | push + e-mail |
| Gamification artisan (XP, niveaux, badges) | Oui | Oui |
| Back-office MENAO | Oui | — |

### 2.2 Hors V1 (V1.1 ou V2)

- Paiement en plusieurs fois **Alma** (lot optionnel, voir F-33 et section 17).
- Récompenses physiques (tenue MENAO) liées aux niveaux : affichage seulement en V1, expédition manuelle par l'équipe.
- Facture électronique via plateforme agréée (obligatoire en émission pour PME et micro-entreprises au **1er septembre 2027**) : préparer le modèle de données en V1, brancher le partenaire en V1.1.
- Multi-utilisateurs par entreprise artisan, multi-langue, international.
- Application tablette dédiée, mode hors-ligne complet.

---

## 3. Rôles et permissions

| Rôle | Description | Accès |
|---|---|---|
| `visiteur` | Non connecté | Site public, recherche, résultats (voir F-08) |
| `particulier` | Client final | Ses projets, chantiers, messages, documents, paiements |
| `artisan` | Entreprise du bâtiment | Son profil, ses demandes, devis, chantiers, factures, abonnement |
| `artisan_en_attente` | Artisan inscrit non validé | Son onboarding uniquement, pas de demandes |
| `admin` | Équipe MENAO | Back-office complet |
| `support` | Équipe MENAO restreinte | Lecture + modération + litiges, pas de paiements ni de rôles |

Le rôle est stocké dans `auth.users.app_metadata.role` (modifiable uniquement côté serveur), **jamais** dans `user_metadata`.

---

## 4. Stack technique (validée)

| Couche | Choix | Notes |
|---|---|---|
| Monorepo | **pnpm** + **Turborepo** | TypeScript strict partout |
| Web | **Next.js** (App Router) + React + Tailwind | Hébergé sur **Vercel** (plafond de dépenses activé) |
| App native | **Expo** (React Native) + **Expo Router** + **EAS Build/Submit/Update** | iOS + Android, un seul code |
| Backend | **Supabase** : Postgres + **PostGIS**, Auth, Storage, Realtime, Edge Functions | Projet dédié, voir 4.1 |
| Validation | **Zod** (schémas partagés web/app/serveur) | |
| Paiements | **Stripe** : Billing (abonnements artisans) + **Connect** (paiements chantiers) | Voir F-30 à F-34 |
| Signature | **Universign** (comme maquettes) ou Yousign | Derrière une interface `SignatureProvider` |
| E-mails / SMS | **Brevo** (transactionnels) | Derrière `NotificationProvider` |
| Push | **Expo Notifications** | |
| IA texte | API LLM (Claude, Anthropic) via Edge Function | Sortie JSON validée par Zod |
| Transcription voix | Fournisseur speech-to-text à choisir **[À VALIDER]** | Derrière `TranscriptionProvider` |
| Adresses | **API Adresse (BAN, data.gouv.fr)** | Gratuite, France. Google Places en option |
| Vérification entreprise | **API Sirene (INSEE)** | Contrôle SIRET, statut, code APE |
| Cartes | Liens « Ouvrir la carte » (Apple/Google Maps) en V1 | Pas de carte intégrée |
| PDF | Génération côté serveur (`@react-pdf/renderer` ou équivalent) | Devis, factures, PV |
| Suivi d'erreurs | **Sentry** (web + app + fonctions) | |
| Analytics produit | **PostHog** (hébergement UE) | Sans données personnelles |
| Tâches planifiées | `pg_cron` + Edge Functions (ou Trigger.dev si besoin) | Relances, expirations |
| Tests | Vitest (unitaires), Playwright (web e2e), tests RLS SQL (pgTAP) | |

### 4.1 Projet Supabase

- URL : `https://ffidtbwxiyqybyfdqmkj.supabase.co` (référence projet `ffidtbwxiyqybyfdqmkj`)
- Région : **West EU (Irlande), eu-west-1** — compatible RGPD.
- Plan actuel : **Free, taille Nano**. Suffisant pour développer.
- **Avant tout utilisateur réel** : passer en plan **Pro**. Le plan Free ne fait pas de sauvegardes (« No backups ») et met le projet en pause après une période d'inactivité. Activer ensuite les sauvegardes avec restauration à un instant précis (PITR).
- Créer un **second projet** `menao-staging` pour les tests. Le projet actuel devient la **production**.
- Les clés (`anon`, `service_role`) vont dans les variables d'environnement, **jamais dans le dépôt**. La clé `service_role` n'est utilisée que côté serveur (Edge Functions, routes serveur Next.js).

### 4.2 Dépôt GitHub

- Dépôt **privé** `menao` sur le compte GitHub du CTO.
- Branche `main` protégée : PR obligatoire, CI verte obligatoire.
- Intégration GitHub ↔ Supabase (branches de preview) à activer quand le plan le permet.
- Intégration GitHub ↔ Vercel (preview par PR).

### 4.3 Structure du dépôt

```
menao/
├── apps/
│   ├── web/                 # Next.js : site public, espace particulier, espace artisan, back-office (/admin)
│   └── mobile/              # Expo : app particulier + artisan (bascule selon le rôle)
├── packages/
│   ├── core/                # Logique métier pure : machine à états chantier, calculs devis/TVA/échéancier, règles
│   ├── db/                  # Types générés Supabase, requêtes typées
│   ├── validation/          # Schémas Zod partagés
│   ├── ui-tokens/           # Couleurs, typo, espacements (extraits de Figma)
│   ├── emails/              # Modèles d'e-mails (React Email)
│   └── config/              # tsconfig, eslint, prettier partagés
├── supabase/
│   ├── migrations/          # SQL versionné, une migration par changement
│   ├── functions/           # Edge Functions (Deno)
│   ├── tests/               # Tests RLS (pgTAP)
│   └── seed.sql             # Données fictives de développement
├── docs/
│   ├── CAHIER_DES_CHARGES_V1.md
│   └── adr/                 # Décisions d'architecture (une par fichier)
├── CLAUDE.md
└── turbo.json
```

**Règle d'or** : aucune logique métier dans les pages web ou les écrans mobiles. Elle vit dans `packages/core`, dans la base (contraintes, fonctions, RLS) ou dans les Edge Functions. Les écrans ne font qu'afficher et appeler.

---

## 5. Design system

Extraire les valeurs exactes depuis Figma (connecteur Figma de Claude Code) dans `packages/ui-tokens`. Repères observés sur les maquettes :

- **Couleur primaire** : bleu MENAO (boutons, liens, en-têtes mobiles).
- **Fond** : crème clair sur les pages d'application, blanc pour les cartes.
- **Couleurs sémantiques** : vert (confirmé, payé, « Dispo immédiate »), rouge (refus, annuler, erreur), orange (Alma, alertes).
- **Composants récurrents** : carte à coins arrondis, puces (tags) bleu clair, stepper de chantier en 5 étapes (Signature → Paiement → Planification → Travaux → Réception), barres de score, tiroir (bottom sheet) mobile, champ code OTP 6 chiffres, pavé de signature au doigt.
- **Typographie** : sans-serif géométrique (à confirmer depuis Figma).
- **Accessibilité** : contraste AA minimum, tailles tactiles 44 px minimum, focus visible au clavier.
- Le web est **responsive** (mobile d'abord) : chaque écran web a sa version mobile dans Figma.

---

## 6. Parcours et fonctionnalités — Site public

### F-01 Page d'accueil
- Hero « Trouvez l'artisan pro du BTP dont vous avez besoin », champ de recherche, raccourcis métiers (Électricité, Plomberie, Maçonnerie, Peinture, Terrassement, …).
- Bloc réassurance (indicateurs) et grille des métiers.
- **Les chiffres affichés (« +22 500 artisans », « 99 % satisfaits », « 24/7 ») doivent provenir de la base** ou être retirés. Aucun chiffre inventé au lancement.
- Navigation : Comment ça marche ?, Garanties & Confiance, Espace Pro, Mon espace client, Trouver un artisan.

### F-02 Pages SEO métier × ville
- Pages générées : `/[metier]/[ville]` (ex. `/electricien/nice`), rendu serveur, métadonnées, données structurées (schema.org `LocalBusiness`/`Service`).
- Pilote : métiers prioritaires × communes des Alpes-Maritimes (Nice, Cannes, Antibes, Grasse, Cagnes-sur-Mer, Menton, …).
- Afficher les artisans validés de la zone (sans coordonnées), CTA vers la recherche.
- Sitemap XML automatique, `robots.txt`, URLs canoniques.

### F-03 Pages statiques
- Comment ça marche, Garanties & Confiance, Espace Pro (page de vente artisans avec les 3 formules), FAQ, Contact.
- Pages légales : mentions légales, CGU, CGV artisans, politique de confidentialité, politique cookies, **critères de classement des artisans et modalités de contrôle des avis** (obligations d'information des plateformes, à faire valider par l'avocat).
- Bandeau de consentement cookies (refus aussi simple que l'acceptation).

---

## 7. Parcours particulier

### F-05 Saisie du besoin (recherche IA)
- Zone de texte multiligne avec exemple en placeholder.
- Bouton **micro** : dictée. Demande d'autorisation micro, état « Écoute… », transcription insérée dans le champ.
- Bouton **pièce jointe** + glisser-déposer : photos (JPEG, PNG, HEIC ; 10 Mo max par photo, 10 photos max).
- Puces de métiers cliquables (pré-remplissent le métier).
- Aide contextuelle sous le champ selon le niveau de détail (« Afin d'obtenir de meilleurs résultats, donnez un maximum de détails… » puis « Avec ces informations, nous avons de quoi trouver votre artisan idéal ! »).
- Bouton « Trouver mon artisan du BTP idéal » désactivé tant que le texte est vide.
- Écran de chargement « Analyse de votre projet en cours ».

### F-06 Analyse IA du besoin
- Edge Function `analyze-need` : envoie le texte (et la description des photos si disponible) au LLM, reçoit un **JSON strict** validé par Zod :
  `metier`, `lieu_type` (appartement | maison | jardin | entreprise), `pieces[]`, `travaux[]`, `surface_tranche` (<10, 10–20, 20–50, >50 m²), `ville`, `adresse` (si présente), `date_souhaitee` (si présente), `urgence` (booléen), `confiance` (0–1).
- Si le JSON est invalide : une nouvelle tentative, puis repli sur un formulaire vide pré-rempli avec le texte.
- Ne jamais envoyer au LLM : e-mail, téléphone, nom du particulier.
- Journaliser entrée/sortie (sans données personnelles) pour améliorer les prompts.
- Limite de débit : 20 analyses par heure et par IP/utilisateur.

### F-07 Vérification des critères
Écran « Vérifiez vos critères de recherche », 5 cartes repliables avec bouton « Modifier » (icône crayon sur mobile), chacune avec Annuler / Enregistrer :
1. **Artisan recherché** : métier (liste contrôlée, avec aide « Si vous ne connaissez pas le type d'artisan… »).
2. **Informations sur le chantier** : lieu (liste), pièces (recherche + puces), travaux attendus (autocomplétion sur un référentiel + puces), surface (liste de tranches).
3. **Adresse** : ville + adresse exacte avec autocomplétion **BAN**. **La ville et l'adresse doivent être cohérentes** (l'autocomplétion est filtrée par la ville choisie). Géocodage → point PostGIS.
4. **Date de début souhaitée** : Dès que possible / Préciser une date (sélecteur ; **dates passées interdites**) / Date inconnue.
5. **Photos supplémentaires** : ajout, suppression, aperçu.
- Bouton « Trouver l'artisan idéal » actif quand métier + ville sont renseignés.

### F-08 Compte particulier
- Écran « Dernière étape avant de découvrir vos artisans » : prénom, nom, téléphone (optionnel, indicatif +33 par défaut), e-mail, mot de passe (12 caractères minimum), résumé du besoin à gauche.
- Cases obligatoires : acceptation des CGU et de la politique de confidentialité (non visibles sur les maquettes, **à ajouter**). Case optionnelle : communications marketing.
- Lien « Me connecter à mon espace ».
- Connexion aussi par lien magique e-mail ; Apple/Google en V1.1.
- **[À VALIDER]** Moment de création du compte : les maquettes l'imposent **avant** les résultats. Recommandation : montrer les résultats d'abord et exiger le compte au clic sur « Envoyer une demande ». Implémenter derrière l'option `REQUIRE_ACCOUNT_BEFORE_RESULTS` (défaut : `false`).
- Vérification de l'e-mail obligatoire avant l'envoi d'une demande. Le projet saisi avant inscription est conservé et rattaché au compte.

### F-09 Résultats de recherche
- « Sélectionnez votre artisan idéal — Nous avons trouvé N artisans… ».
- Résumé du besoin à gauche (desktop) ou replié en haut (mobile), avec « Modifier ».
- Cartes artisan : photo, prénom (ou nom commercial), métier + années d'expérience, zone, badge « Dispo immédiate », 1 à 2 spécialités + compteur « +N ». Desktop : liste ou cartes alignées ; mobile : carrousel horizontal.
- Bloc final « Vous ne trouvez pas votre artisan idéal ? » → « Envoyer mon dossier à Menao » (crée un ticket pour l'équipe, engagement de réponse sous 7 jours).
- **Algorithme de correspondance (V1)** dans une fonction SQL `match_artisans(project_id)` :
  1. artisans **validés** avec **abonnement actif** ;
  2. métier correspondant ;
  3. adresse du chantier dans leur zone d'intervention (PostGIS) ;
  4. pas en pause / congés ;
  5. tri : score MENAO, disponibilité, distance, puis mise en avant selon la formule. **La mise en avant payante doit être signalée** (mention « Mis en avant ») et expliquée dans la page des critères de classement.
- Maximum 5 résultats affichés en V1 (configurable).
- État vide et état de chargement (squelettes) conformes aux maquettes.

### F-10 Fiche artisan
- En-tête : photo, nom + métier, badge disponibilité, expérience, zone d'intervention, temps de réponse moyen, bouton « Envoyer une demande ».
- À propos, Expertises (puces), **Garanties & Assurances** (décennale vérifiée avec date de validité, certifications type Qualifelec/RGE avec numéro), **Score MENAO** (qualité, délais, communication, rapport qualité/prix, recommandation, score global), Chantiers récents (photos, galerie en modale), Derniers avis (« Avis vérifié »).
- Version « scroll » : en-tête compacte collante avec le bouton d'action.
- Fil d'Ariane : Vérification des critères › Sélection d'artisan › Nom.
- Ne jamais afficher téléphone ni e-mail de l'artisan avant une demande acceptée.

### F-11 Envoi de la demande de chantier
- Écran « Envoyez votre demande de chantier à [Prénom] » : artisan sélectionné + résumé du besoin, message personnalisé (éditeur simple, 10 000 caractères max, optionnel), coordonnées (e-mail, téléphone), préférence de rappel (Dès que possible / Indiquer une plage horaire « à partir de / jusqu'à »).
- Confirmation : « Votre demande est envoyée à [Prénom] ! » + rappel de la plage horaire + bouton « Suivre ma demande depuis mon espace ».
- **[À VALIDER]** Envoi à un seul artisan (maquettes) ou à plusieurs (jusqu'à 3). V1 : un seul, paramétrable `MAX_ARTISANS_PER_REQUEST`.
- L'artisan a **48 h** pour répondre ; sinon relance, puis proposition au particulier d'en choisir un autre.

### F-12 Mes chantiers (particulier)
- Listes « en cours » et « terminés ». Carte de chantier : photo, titre, adresse, statut, stepper, artisan, prochaine intervention, action attendue (« Voir et signer le devis », « Payer maintenant »), « Ajouter à mon agenda » (Google, Outlook, Apple via fichier .ics).
- Bannière web « Suivez tous vos chantiers depuis votre poche » avec QR code vers les stores.
- Vue chantier : onglets « Suivi du chantier » (photos et messages de l'artisan, prochaine intervention) et « Dossier du chantier » (documents : devis signé, factures, PV ; échéancier de paiement). Lien « Signaler un problème lié au chantier » (F-42).

### F-13 Signature du devis (particulier)
- Onglets : Signature du devis → Paiement de l'acompte.
- Aperçu du devis (PDF), case « J'ai lu et j'accepte le document », **code OTP par SMS** (6 chiffres, renvoi possible), signature au doigt / à la souris (bouton Effacer), 3 cases : CGU du prestataire de signature, CGU MENAO + confidentialité, acceptation de l'échéancier (acompte et solde).
- Signature via `SignatureProvider` (signature électronique simple ou avancée eIDAS). Le PDF signé et le fichier de preuve sont stockés dans le dossier du chantier.

---

## 8. Parcours artisan

### F-14 Inscription et abonnement
- Page « Espace Pro » → inscription : e-mail, mot de passe, téléphone, **SIRET** (vérifié via API Sirene : entreprise active, code APE cohérent avec le bâtiment, adresse du siège pré-remplie).
- Onboarding en étapes (sauvegarde à chaque étape) :
  1. Entreprise : raison sociale, nom commercial, forme juridique, TVA intracommunautaire, assujetti TVA oui/non, adresse.
  2. Métiers et spécialités (référentiel), années d'expérience, certifications (RGE, Qualifelec, Qualibat… avec numéro et date de fin).
  3. Zone d'intervention : adresse de base + rayon (km) **ou** liste de communes.
  4. Documents : **Kbis ou extrait INSEE/RNE de moins de 3 mois**, **attestation d'assurance décennale** (assureur, numéro, date de fin, couverture géographique), **RC Pro**, pièce d'identité du dirigeant. Formats PDF/JPEG/PNG, 10 Mo max.
  5. Profil public : photo, présentation, photos de réalisations.
  6. Coordonnées bancaires et identité pour les paiements : **onboarding Stripe Connect** (type de compte selon D5), KYC géré par Stripe. C'est sur ce compte que l'artisan sera payé directement par ses clients.
  7. Choix de la formule et paiement **sur le web uniquement** via Stripe Checkout / Billing. Prélèvement SEPA et carte.
- Statuts : `brouillon` → `en_verification` → `valide` | `refuse` (motif) | `suspendu`.
- L'artisan n'est visible et ne reçoit de demandes que si **validé + abonnement actif + compte Stripe Connect activé**.
- **Dans l'app native : aucun bouton d'achat ni lien vers le paiement de l'abonnement** (règles Apple/Google). L'app affiche seulement « Votre abonnement est géré depuis votre espace web » sans lien d'achat.

### F-15 Formules d'abonnement
- Trois formules : **195 €**, **500 €** et **1 500 € HT/mois**. Noms et contenus **[À VALIDER]**.
- Les avantages sont **paramétrés en base** (table `plans`), jamais en dur : nombre de métiers, rayon ou communes maximum, niveau de mise en avant, nombre de demandes, outils inclus.
- Gestion : changer de formule, résilier (fin de période), factures d'abonnement téléchargeables (Stripe), relance automatique si échec de paiement, suspension de la visibilité après la période de grâce.
- Option « membre fondateur » (tarif réduit à vie pour les premiers artisans du pilote) via coupons Stripe.

### F-16 Tableau de bord artisan
- En-tête « Bonjour [Prénom] », cloche de notifications, avatar.
- Indicateurs : devis en attente (nombre de clients), chiffre généré ce mois et évolution.
- « Dernières demandes de devis » (titre, adresse, date souhaitée, badge Urgent, vignette photo).
- « Prochains rendez-vous » avec état vide.
- Barre de navigation mobile : Dashboard, Chantiers, (+) action rapide, Devis, Messages.

### F-17 Opportunité (demande reçue)
- Détail : client (nom, et **e-mail/téléphone visibles seulement après acceptation [À VALIDER]**), boutons « Envoyer un message via Menao » et « Appeler », plage de rappel préférée, adresse + « Ouvrir la carte », description (texte réel, **jamais de lorem ipsum**), photos, puces, date souhaitée, message personnalisé.
- Actions : **Fixer un rendez-vous** (tiroir : date + heure d'arrivée, envoi au client) ou **Refuser le chantier** (motif obligatoire : planning complet, hors domaine d'expertise, hors zone d'intervention, autre).
- Lien « Ce chantier a besoin d'une expertise » (signaler un autre corps de métier nécessaire).

### F-18 Rendez-vous
- Vue rendez-vous : date/heure en en-tête, client, lieu, rappel du chantier, message, « Ajouter des notes » (privées), actions « Créer un devis » et « Annuler le chantier ».
- Rappels automatiques J-1 au client et à l'artisan.

### F-19 Création de devis
- Lignes de devis typées : **Matériel**, **Main d'œuvre**, **Autre** (forfait déplacement…). Champs : désignation, description optionnelle, quantité, unité (u, h, m, m², m³, forfait, …), prix unitaire HT, TVA (5,5 %, 10 %, 20 %, et 0 % si non assujetti avec mention « TVA non applicable, art. 293 B du CGI »).
- Calcul en direct total HT par ligne, TVA, TTC ; récapitulatif total HT / TVA par taux / TTC. Tous les calculs dans `packages/core`, en **centimes entiers**.
- « Rechercher l'article » : catalogue d'articles **[À VALIDER]** (V1 : catalogue personnel de l'artisan réutilisable ; catalogue fournisseurs avec prix en V2). Les maquettes montrent des prix fournisseurs : ne pas l'implémenter sans source de données autorisée.
- Modifier / supprimer une ligne. Statuts d'enregistrement : Brouillon, Modifications apportées, Enregistré et à jour.
- **Dictée intelligente** : enregistrement (2 min max, pause/reprise, suppression), transcription affichée, « Sauvegarder cet enregistrement », « Générer les lignes » (Edge Function `quote-from-voice` : LLM → JSON de lignes validé par Zod) ; les lignes générées sont **toujours modifiables** et marquées comme brouillon.
- « Générer le devis » → aperçu PDF.

### F-20 Mentions obligatoires du devis et des factures
Le PDF doit contenir au minimum (à faire valider par l'expert-comptable) :
- Numéro unique et chronologique, date d'émission, durée de validité.
- Identité de l'artisan : raison sociale, adresse, SIRET, forme juridique, n° TVA, contact.
- **Assurance décennale : nom de l'assureur, numéro de contrat, couverture géographique.**
- Identité et adresse du client, adresse du chantier.
- Détail des prestations (désignation, quantité, unité, prix unitaire HT), taux de TVA, totaux HT/TVA/TTC.
- Date prévisionnelle de début et durée estimée des travaux.
- Modalités et échéancier de paiement (ex. 30 % à la signature, 70 % à la réception).
- Mention « Devis reçu avant l'exécution des travaux », emplacement « Bon pour accord » + date + signature.
- Pour la TVA à taux réduit (5,5 % / 10 %) : conditions et justificatif éventuel requis pour un logement de plus de 2 ans **[À VALIDER avec l'expert-comptable]**.

### F-21 Envoi du devis
- Onglets Aperçu du devis → Modalités de paiement / Envoi.
- Échéancier : **« Mon échéancier par défaut »** (défini dans le profil, ex. 30 % / 70 %) ou **personnalisé** (n tranches, somme = 100 %, la dernière toujours « à la réception »).
- Rattachement au chantier (client + rappel du chantier).
- « Envoyer le devis » → e-mail « Nouveau devis disponible pour votre chantier ! » + notification push au client + statut chantier `devis_envoye`.
- Liste « Devis » : à envoyer / envoyés (montant, client, date de visite, statut d'envoi).
- Le client peut accepter (signature), **refuser** (motif) ou **demander une modification** (message) ; une nouvelle version incrémente l'indice (`DEVIS-2026-0018-v2`).

### F-22 Suivi du chantier (artisan)
- Après paiement de l'acompte : notification « Chantier validé ! Confirmez la date de démarrage » → l'artisan confirme date et heure → notification « Chantier planifié » au client.
- Pendant les travaux : messagerie avec le client, « Ajouter une photo » (multiples), « Ajouter un message » ; le client est notifié (« Jean a ajouté 6 nouvelles photos »).
- « Déclarer le chantier terminé » : tiroir de confirmation rappelant d'ajouter les photos finales → le client reçoit l'invitation à réceptionner.

### F-23 Notation du client par l'artisan
- Après clôture : critères Accueil & accès, Clarté du besoin, Délai des paiements (curseurs 0–100 %), commentaire (50 caractères minimum).
- **Visible uniquement par les artisans MENAO** (réseau de confiance), jamais par le client lui-même ni publiquement **[À VALIDER juridiquement]**.

### F-24 Gamification artisan
- XP gagnés : avis laissés sur les clients, ponctualité (chantiers sans retard), photos de chantier, avis 5 étoiles, chantiers sans réserve, etc. Règles **paramétrées en base**.
- Niveaux (Niv. 1 à 5+), barre de progression, objectifs en cours / atteints, badges (Artisan exceptionnel, Toujours à l'heure, Maître des finitions, Expert de la photo, Pro du nettoyage, Artisan appliqué, Main d'or, Main d'argent, Artisan attentionné…).
- Écrans : Mon grade MENAO (onglets Objectifs / Badges), modale de progression d'un badge, écran « Nouveau badge débloqué » avec confettis, notification push.
- Récompense physique au niveau 5 (tenue MENAO) : formulaire de taille + adresse, **traitement manuel par l'équipe** en V1 (ticket back-office).

---

## 9. Chantier : machine à états

Implémentée dans `packages/core/chantier-state.ts` **et** protégée en base (fonction SQL `transition_chantier(id, event)` qui refuse les transitions invalides). Chaque transition écrit dans `chantier_events` (journal immuable).

```
demande_envoyee
  ├─(artisan refuse)──────────────► refusee
  ├─(48 h sans réponse)───────────► expiree
  └─(artisan fixe un RDV)─────────► rdv_planifie
rdv_planifie ──(devis envoyé)─────► devis_envoye
devis_envoye
  ├─(client refuse)───────────────► devis_refuse
  ├─(client demande modif)────────► devis_en_revision ──► devis_envoye
  └─(client signe)────────────────► devis_signe
devis_signe ──(acompte payé)──────► acompte_paye
acompte_paye ──(artisan confirme date)► planifie
planifie ──(date de début atteinte)► en_cours
en_cours ──(artisan déclare fin)──► travaux_termines
travaux_termines
  ├─(client signe PV sans réserves)► receptionne
  └─(client signe PV avec réserves)► reserves_a_lever
reserves_a_lever ──(client confirme levée)► receptionne
receptionne ──(solde payé)────────► cloture
(tout état actif) ──(litige ouvert)► en_litige ──(résolution admin)► état précédent | annule
(avant acompte) ──(annulation)────► annule
```

Le stepper affiché (5 étapes) se déduit de l'état : Signature (≤ devis_signe), Paiement (acompte), Planification, Travaux, Réception.

---

## 10. Réception et clôture (particulier)

### F-25 Réception sans réserves
- Notification « Travaux terminés ! Consultez les photos finales, signez le PV et payez le solde ».
- Vue chantier → « Valider la réception du chantier » → tiroir « Tout est conforme ? » → **Signature du PV de réception** (même mécanique que F-13 : OTP + signature + cases).
- Contenu du PV : numéro (`PV-2026-R01`), date, maître d'ouvrage, maître d'œuvre, adresse du chantier, nature des travaux, case **cochée selon le cas réel** (sans réserves / avec réserves), observations, récapitulatif financier (total TTC, acompte versé, **solde = total − acompte**), lieu et date.

### F-26 Réception avec réserves
- « Ajouter des réserves sur ce chantier » → description libre (+ photos) → PV **avec réserves** (case « avec réserves » cochée, réserves listées dans Observations).
- Statut `reserves_a_lever`, notification à l'artisan « Réserves émises par Nicolas ».
- Le paiement du solde est demandé, mais **son versement à l'artisan est suspendu** jusqu'à la confirmation de levée par le client (« Le chantier est-il parfait ? » → « Confirmer la levée des réserves » → versement immédiat).
- Relance automatique du client à J+7 si l'artisan a signalé la levée et que le client n'a pas confirmé ; au-delà de J+30, escalade au support.

### F-27 Ordre des étapes de fin de chantier
Les maquettes demandent l'avis **avant** le PV. **Ordre retenu pour la V1 : 1. Signature du PV → 2. Paiement du solde → 3. Avis.** L'avis ne doit jamais conditionner un paiement ni être demandé comme préalable à la réception.

### F-28 Avis client
- Critères : Qualité des prestations, Respect des délais, Communication (curseurs avec libellés « Inacceptable » → « Irréprochable »), Rapport qualité/prix (3 choix), commentaire (50 caractères minimum).
- Avis possible uniquement après un chantier **réceptionné** sur MENAO (marqué « Avis vérifié »), un avis par chantier.
- Écran de remerciement. Rappel push si non laissé sous 3 jours (une seule relance).
- L'artisan peut **répondre publiquement** une fois. Signalement d'avis possible ; modération dans le back-office. Les avis négatifs ne sont **jamais** masqués pour cette seule raison.
- Score MENAO = moyenne pondérée des critères, recalculée par fonction SQL.

---

## 11. Paiements

### F-30 Principes : MENAO ne prend pas d'argent
- **MENAO n'encaisse, ne détient et ne prélève jamais d'argent sur les chantiers.** Aucune commission, aucun frais de service, aucun IBAN MENAO. Le seul argent encaissé par MENAO est l'**abonnement des artisans** (Stripe Billing, F-15).
- Les paiements des chantiers passent **exclusivement par Stripe Connect** : le client paie **directement l'artisan**, via le compte Stripe connecté de l'artisan. L'artisan est le commerçant (marchand de référence) : son nom apparaît sur le relevé du client, les fonds arrivent sur **son** solde Stripe.
- Mise en œuvre : **charges directes** sur le compte connecté de l'artisan, **sans `application_fee`**. Les fonds ne transitent jamais par le solde de la plateforme MENAO. Le choix exact (charges directes, type de compte Express/Standard, contrôle des versements) est à confirmer avec Stripe pendant la phase 1 **[À VALIDER avec Stripe]** — le principe « l'argent ne passe pas par MENAO » est, lui, non négociable.
- **Sécurisation des paiements** (affichée « Paiement sécurisé par Stripe », jamais « fonds sécurisés par Menao ») : les fonds restent sur le solde Stripe **de l'artisan** et le **versement vers son compte bancaire** est déclenché selon les étapes du chantier (calendrier de versement manuel du compte connecté). Stripe impose de verser les fonds retenus **sous 90 jours** en Europe : un versement ne peut pas être retenu au-delà, quel que soit l'état du chantier.
- Toutes les opérations passent par une interface `PaymentProvider` dans `packages/core`.
- Montants en **centimes entiers**, devise EUR.

### F-31 Acompte
- Après signature : onglet « Paiement de l'acompte ». Échéancier affiché (démarrage prévu le …, montant à payer aujourd'hui, montant à la réception).
- Moyens : **Carte bancaire**, **Apple Pay / Google Pay**, **Virement bancaire** via Stripe (coordonnées bancaires fournies par Stripe pour le compte de l'artisan, rapprochement automatique) **[à confirmer avec Stripe pour les comptes connectés]**. Bénéficiaire affiché : l'entreprise de l'artisan.
- Virement : écran avec montant, bénéficiaire, IBAN, BIC (boutons copier), « J'ai réalisé le virement bancaire » → statut « Virement en attente », e-mail récapitulatif. Le chantier passe en `acompte_paye` seulement à la **réception effective** des fonds (webhook Stripe).
- Versement vers le compte bancaire de l'artisan : **48 h avant la date de début confirmée** (tâche planifiée), ou immédiatement si le début est à moins de 48 h.

### F-32 Solde
- Après la signature du PV : onglet « Paiement du solde », montant = total TTC − acomptes déjà payés (calcul `packages/core`, jamais saisi).
- Texte d'information adapté :
  - sans réserves : « Le solde sera versé à l'artisan dès la réception de votre paiement » ;
  - avec réserves : « Le versement du solde à l'artisan sera suspendu jusqu'à la confirmation de la levée de vos réserves (90 jours maximum) ».
- Mêmes moyens que l'acompte.

### F-33 Paiement en plusieurs fois (Alma) — lot optionnel
- Les maquettes montrent Alma (3x, 4x sans frais, 10x avec frais). **Hors V1 par défaut.** Alma est un prestataire distinct de Stripe : son intégration n'est possible que si le paiement va **directement à l'artisan**, sans transiter par MENAO. À étudier avec Alma.
- Si activé : les échéances sont calculées sur le **montant réellement dû** (acompte **ou** solde), et la somme des échéances doit égaler le total affiché.

### F-34 Frais, remboursements, litiges
- Les frais Stripe des paiements de chantier sont payés par **l'artisan** (il est le commerçant). MENAO ne prélève rien en plus. Les frais sont expliqués dans les CGV artisans et sur la page Espace Pro.
- Remboursement : décidé par l'artisan depuis son espace (total ou partiel, avec motif), ou par l'admin MENAO en cas de litige ; exécuté sur le compte Stripe de l'artisan.
- Contestations de carte (chargebacks) : gérées sur le compte de l'artisan ; MENAO notifie l'artisan et l'admin, et met à disposition les preuves (devis signé, PV, photos, messages).
- Le versement retenu (acompte avant démarrage, solde en cas de réserves) peut être gelé par l'admin pendant un litige, dans la limite des 90 jours.

### F-35 Factures
- Générées **au nom de l'artisan** (l'artisan est l'émetteur, MENAO est l'outil) : facture d'acompte à l'encaissement de l'acompte, facture de solde à l'encaissement du solde. Numérotation chronologique continue **par artisan**, sans trou.
- Mêmes mentions que F-20 + référence au devis, date de paiement, montant déjà réglé.
- Disponibles dans le dossier du chantier (client et artisan) et dans un onglet « Documents » de l'artisan, export CSV/ZIP pour le comptable.
- **Facture électronique** : réception obligatoire pour toutes les entreprises assujetties depuis le 1er septembre 2026 ; émission obligatoire pour les PME et micro-entreprises au **1er septembre 2027**, via une plateforme agréée. V1 : modèle de données compatible (format structuré Factur-X prévu) ; V1.1 : intégration d'une plateforme agréée partenaire.
- Les factures d'**abonnement MENAO** (MENAO → artisan) sont émises par Stripe Billing.

---

## 12. Fonctions transverses

### F-40 Messagerie
- Conversation par chantier (particulier ↔ artisan), texte + photos + fichiers.
- Temps réel (Supabase Realtime **uniquement quand l'écran de conversation est ouvert**), sinon notification push.
- Indicateurs : non lus, dernier message, horodatage. Écran liste « Messages » (web et app).
- Modération : signalement d'un message ; masquage automatique des numéros de téléphone/e-mails **avant** l'acceptation de la demande **[À VALIDER]**.

### F-41 Notifications

| Événement | Destinataire | Push | E-mail | SMS |
|---|---|---|---|---|
| Nouvelle demande | Artisan | ✓ | ✓ | ✓ (si non lue en 2 h) |
| RDV fixé / rappel J-1 | Client + artisan | ✓ | ✓ | |
| Devis reçu | Client | ✓ | ✓ | |
| Devis signé | Artisan | ✓ | ✓ | |
| Acompte payé / virement reçu | Artisan + client | ✓ | ✓ | |
| Date de démarrage confirmée | Client | ✓ | ✓ | |
| Nouvelles photos / messages | Client ou artisan | ✓ | (résumé quotidien) | |
| Travaux terminés | Client | ✓ | ✓ | |
| Réserves émises / levées | Artisan | ✓ | ✓ | |
| Solde payé / versé | Artisan | ✓ | ✓ | |
| Avis à laisser (1 relance) | Client, artisan | ✓ | ✓ | |
| Badge débloqué / niveau atteint | Artisan | ✓ | | |
| Document expirant (assurance) J-30, J-7 | Artisan + admin | ✓ | ✓ | |
| Échec de paiement abonnement | Artisan | ✓ | ✓ | |

- OTP de signature par SMS (Brevo).
- Préférences de notification par utilisateur (sauf notifications transactionnelles obligatoires).
- Modèles d'e-mails dans `packages/emails`, en français, avec lien vers l'espace concerné.

### F-42 Signaler un problème / litige
- Depuis la vue chantier : catégorie (retard, malfaçon, comportement, paiement, autre), description, photos.
- Crée un ticket dans le back-office, passe le chantier en `en_litige`, gèle les versements à l'artisan non encore effectués (90 jours maximum).
- Suivi du ticket visible par le déclarant ; échanges avec le support dans le ticket.

### F-43 Documents et fichiers
- Buckets Storage **privés** : `project-photos`, `chantier-photos`, `artisan-documents` (Kbis, assurances, ID — accès admin + propriétaire uniquement), `quotes`, `invoices`, `reception-reports`, `avatars` (public).
- Accès uniquement par **URL signées** à durée courte (≤ 1 h) pour les buckets privés.
- Images redimensionnées (vignettes) et servies via CDN ; suppression des métadonnées EXIF (localisation) à l'upload.
- Antivirus / contrôle du type MIME réel sur les documents.

### F-44 Agenda
- Export .ics pour chaque RDV/intervention (Google, Outlook, Apple).

---

## 13. Back-office MENAO (`/admin`, web uniquement)

- **F-50 Validation des artisans** : file d'attente, consultation des documents, contrôle SIRET (Sirene), vérification de l'assurance (assureur, dates, couverture), décision Valider / Refuser (motif) / Demander un complément ; historique des décisions.
- **F-51 Suivi des documents** : expiration des assurances et certifications, relances automatiques, suspension automatique à expiration sans renouvellement.
- **F-52 Utilisateurs** : recherche, fiche, suspension, réinitialisation, export RGPD, suppression.
- **F-53 Chantiers** : recherche, historique des événements, documents.
- **F-54 Paiements** : vue des paiements et des versements aux artisans (lecture), gel/dégel d'un versement en cas de litige, suivi des contestations. MENAO n'encaisse rien : aucune opération ne crédite MENAO.
- **F-55 Modération** : avis signalés, messages signalés, photos.
- **F-56 Tickets** : « Envoyer mon dossier à Menao », signalements, litiges, récompenses à expédier.
- **F-57 Paramétrage** : formules (`plans`), référentiels (métiers, travaux, pièces), règles de gamification, textes légaux versionnés.
- **F-58 Tableau de bord** : artisans par statut, demandes, taux d'acceptation, devis signés, volume payé, abonnements actifs, churn.
- Journal d'audit de toutes les actions admin (qui, quoi, quand).
- Accès admin protégé par **MFA obligatoire**.

---

## 14. Modèle de données (tables principales)

Toutes les tables : `id uuid` (PK), `created_at`, `updated_at`. **RLS activée sur toutes les tables**, sans exception.

| Table | Champs clés | Notes RLS |
|---|---|---|
| `profiles` | `user_id`, `role`, prénom, nom, téléphone, avatar, préférences | Lecture/écriture : soi-même ; admin |
| `artisans` | `profile_id`, raison sociale, nom commercial, SIRET, TVA, assujetti_tva, forme juridique, adresse, `base_location geography`, `radius_km`, expérience, présentation, statut, `stripe_account_id`, échéancier par défaut, score, xp, niveau | Public : champs non sensibles des artisans validés (vue `artisans_public`) |
| `artisan_trades` | artisan, métier, spécialités | |
| `artisan_zones` | artisan, commune (code INSEE) ou polygone | |
| `artisan_documents` | artisan, type (kbis, decennale, rc_pro, identite, certification), fichier, n°, assureur, dates, couverture, statut de vérification | Propriétaire + admin uniquement |
| `certifications` | artisan, type, numéro, date de fin | Public si vérifiée |
| `plans` | code, nom, prix, avantages (jsonb), actif | Lecture publique |
| `subscriptions` | artisan, plan, statut Stripe, période, `stripe_subscription_id` | Propriétaire + admin |
| `trades`, `work_types`, `rooms` | référentiels | Lecture publique |
| `projects` | particulier, texte brut, analyse IA (jsonb), métier, lieu_type, pièces, travaux, surface, adresse, `location geography`, date souhaitée, urgence | Propriétaire ; artisans destinataires (après demande) |
| `project_photos` | projet, fichier | idem |
| `requests` | projet, artisan, message, préférence de rappel, statut, échéance de réponse, motif de refus | Particulier + artisan concernés |
| `appointments` | demande, date/heure, statut, notes privées artisan | Notes : artisan seul |
| `chantiers` | projet, artisan, particulier, statut (enum §9), dates prévues/confirmées, titre, adresse | Particulier + artisan concernés + admin |
| `chantier_events` | chantier, événement, ancien/nouvel état, acteur, horodatage | Insertion via fonction uniquement ; lecture parties |
| `quotes` | chantier, numéro, version, statut, totaux (centimes), validité, échéancier (jsonb), pdf, date de signature, preuve de signature | Parties concernées |
| `quote_lines` | devis, type (materiel/main_oeuvre/autre), désignation, description, quantité, unité, PU HT, taux TVA, totaux | idem |
| `payment_schedules` | devis, tranche, pourcentage, montant, déclencheur (signature / réception), statut | idem |
| `payments` | chantier, tranche, moyen, montant, statut, `stripe_payment_intent_id`, date | Parties + admin |
| `payouts` | paiement, artisan, montant, statut, date prévue, `stripe_payout_id`, gel (bool) | Artisan + admin |
| `invoices` | chantier, artisan, numéro (séquence par artisan), type (acompte/solde), montants, pdf, format structuré | Parties + admin |
| `reception_reports` | chantier, numéro, avec_reserves, réserves (texte), pdf, signature, date de levée | Parties |
| `messages` | conversation (chantier ou demande), auteur, contenu, pièces jointes, lu_le | Participants uniquement |
| `reviews` | chantier, auteur (particulier), artisan, notes par critère, rapport qualité/prix, commentaire, réponse artisan, statut de modération | Lecture publique si publié |
| `client_ratings` | chantier, artisan auteur, particulier, notes, commentaire | Artisans validés uniquement |
| `xp_events`, `badges`, `artisan_badges`, `rewards_claims` | gamification | Propriétaire + admin |
| `notifications` | utilisateur, type, contenu, lu, canal | Propriétaire |
| `push_tokens` | utilisateur, token Expo, plateforme | Propriétaire |
| `tickets` | type, auteur, chantier, statut, échanges | Auteur + support/admin |
| `audit_logs` | acteur, action, cible, données | Admin en lecture seule |
| `legal_acceptances` | utilisateur, document, version, date, IP | Propriétaire + admin |

Règles :
- Les montants sont des `integer` en centimes ; contrainte `CHECK` sur la somme de l'échéancier (100 %).
- Les numéros de devis/factures sont attribués par une fonction SQL transactionnelle (aucun trou, aucun doublon).
- Les colonnes sensibles (statuts, rôles, montants payés, `stripe_*`) ne sont **jamais** modifiables par le client : uniquement par Edge Functions avec la clé `service_role` ou par des fonctions `SECURITY DEFINER` contrôlées.
- Index : PostGIS (GIST) sur les localisations, index sur toutes les clés étrangères et colonnes de filtre.
- Types TypeScript générés automatiquement (`supabase gen types`) dans `packages/db`.

### 14.1 Edge Functions et tâches

| Nom | Rôle |
|---|---|
| `analyze-need` | Analyse IA du besoin (F-06) |
| `transcribe` | Transcription audio (F-05, F-19) |
| `quote-from-voice` | Lignes de devis depuis la dictée (F-19) |
| `match-artisans` | Appelle la fonction SQL de correspondance (F-09) |
| `sirene-check` | Vérification SIRET (F-14) |
| `generate-pdf` | Devis, factures, PV |
| `signature-*` | Création de la procédure de signature, webhook de fin |
| `stripe-webhook` | Abonnements, paiements, virements reçus, comptes Connect, litiges |
| `payments-*` | Création des paiements sur le compte de l'artisan, déclenchement des versements, remboursements |
| `notify` | Envoi push/e-mail/SMS selon F-41 |
| Tâches `pg_cron` | Expiration des demandes (48 h), versements d'acompte (J-2), alerte avant la limite de 90 jours, rappels RDV, relances avis/réserves, expiration des documents, recalcul des scores |

Tous les webhooks vérifient la signature de l'émetteur et sont **idempotents** (table `webhook_events` avec identifiant unique).

---

## 15. Plan de livraison (phases)

Durées indicatives pour un développeur avec Claude Code ; à ajuster après la phase 0.

| Phase | Contenu | Critères d'acceptation |
|---|---|---|
| **0. Fondations** (1–2 sem.) | Monorepo, CI GitHub Actions (lint, typecheck, tests), Vercel, projet Supabase staging, migrations de base, auth, rôles, RLS de base + tests pgTAP, design tokens, Sentry | Un utilisateur peut s'inscrire et se connecter sur le web ; tests RLS verts ; CI verte |
| **1. Artisan : inscription et abonnement** (3–4 sem.) | F-14, F-15, back-office F-50/F-51, Stripe Billing, Stripe Connect onboarding | Un artisan s'inscrit, dépose ses documents, est validé par un admin, paie son abonnement et devient visible |
| **2. Recherche et demande** (3–4 sem.) | F-01 à F-11, IA, BAN, correspondance PostGIS, pages SEO | Un particulier décrit son besoin, voit des artisans du 06, envoie une demande reçue par l'artisan |
| **3. Devis et signature** (3–4 sem.) | F-16 à F-21, PDF, signature, F-13 | L'artisan fixe un RDV, crée un devis (manuel + dictée), le client le signe avec OTP |
| **4. Paiements et chantier** (3–4 sem.) | F-30 à F-35 (hors Alma), F-22, F-12, machine à états complète | Acompte payé par carte et par virement directement sur le compte Stripe de l'artisan, versement J-2, suivi de chantier avec photos |
| **5. Réception, avis, messagerie** (2–3 sem.) | F-25 à F-28, F-40, F-41, F-42, F-23 | Parcours complet jusqu'à `cloture` avec et sans réserves ; avis publiés |
| **6. App native** (4–6 sem.) | Expo : parcours particulier + artisan, push, EAS, publication TestFlight / test interne Play | Les parcours des phases 2 à 5 fonctionnent sur iOS et Android |
| **7. Gamification et finitions** (1–2 sem.) | F-24, F-58, accessibilité, performance | Badges et niveaux fonctionnels |
| **8. Pré-lancement pilote** (2 sem.) | Passage Supabase Pro + PITR, test de charge, audit sécurité / pentest, textes légaux validés, données réelles du 06, seed des référentiels | Checklist de lancement section 18 complète |

Le web est livré et utilisable avant l'app (phases 0 à 5), conformément à la stratégie « web d'abord ». L'espace artisan existe donc aussi en version web responsive.

---

## 16. Corrections à appliquer par rapport aux maquettes

1. Supprimer tout *lorem ipsum* (description de chantier côté artisan).
2. Dates incohérentes : « Jeudi 28 février 2026 » (le 28/02/2026 est un samedi) ; heures 08h30 / 16h30 différentes pour la même intervention. Les dates sont toujours calculées, jamais saisies en dur.
3. Solde : 231 € partout (330 − 99), et non 221 € sur le PV. Le solde est toujours calculé.
4. Alma au paiement du solde : échéances calculées sur 99 € au lieu du solde ; échéancier 10x dont la somme ne correspond pas au total affiché.
5. Texte « versés à l'artisan 48 h avant le début du chantier » affiché au paiement du solde : remplacer par le texte de F-32.
6. PV « avec réserves » portant la case « SANS RÉSERVES » cochée.
7. Adresse : ville « Strasbourg » avec une adresse proposée à Paris ; les exemples doivent concerner le pilote (Alpes-Maritimes).
8. IBAN « MENAO » et mentions « fonds sécurisés par Menao » : MENAO ne reçoit pas d'argent. Bénéficiaire = l'artisan via Stripe, mention « Paiement sécurisé par Stripe » (F-30, F-31).
9. Coordonnées du client visibles par l'artisan avant acceptation : voir F-17 [À VALIDER].
10. Avis demandé avant la signature du PV : ordre corrigé (F-27).
11. Cases de consentement CGU / confidentialité absentes à la création du compte particulier : à ajouter (F-08).
12. Chiffres marketing de l'accueil non justifiés (F-01).
13. Le devis affiche « Paiement par virement ou CB » avec l'IBAN de l'artisan, ce qui contredit le paiement via MENAO : afficher « Paiement via MENAO selon l'échéancier ».

---

## 17. Décisions à valider (fondateurs)

| # | Sujet | Option par défaut implémentée |
|---|---|---|
| D1 | Compte obligatoire avant ou après les résultats | Après (au moment de la demande) |
| D2 | Demande envoyée à 1 ou plusieurs artisans | 1 (paramétrable) |
| D3 | Coordonnées du client visibles par l'artisan | Après acceptation de la demande |
| D4 | Contenu et noms des formules 195 / 500 / 1 500 € | Paramètres en base, à remplir |
| D5 | Configuration Stripe Connect (charges directes, type de compte, contrôle des versements) | Charges directes, sans commission — **Stripe Connect exclusivement (validé)** |
| D6 | Frais Stripe des paiements de chantier | Payés par l'artisan (validé : MENAO ne prend pas d'argent) |
| D7 | Alma en V1 ou V1.1 | V1.1 |
| D8 | Prestataire de signature (Universign vs Yousign) | Universign (maquettes) |
| D9 | Fournisseur de transcription vocale | À choisir, derrière une interface |
| D10 | Catalogue d'articles avec prix fournisseurs | Catalogue personnel de l'artisan seulement |
| D11 | Notation du client par l'artisan : visibilité et base légale | Visible des artisans validés uniquement, après avis juridique |
| D12 | Type de compte Stripe Connect (Express ou Standard) | Selon la recommandation Stripe pour les charges directes (voir D5) |
| D13 | Plateforme agréée pour la facture électronique | Choix en V1.1 |

---

## 18. Exigences non fonctionnelles et checklist de lancement

### Sécurité
- RLS sur 100 % des tables, testée (pgTAP) dans la CI : un particulier ne voit jamais les données d'un autre ; un artisan ne voit que ses demandes et chantiers.
- Clé `service_role` uniquement côté serveur ; secrets dans Vercel / Supabase / EAS, jamais dans Git.
- MFA obligatoire pour les admins ; MFA proposée aux artisans.
- Limitation de débit sur l'auth, l'IA, l'OTP SMS.
- En-têtes de sécurité web (CSP, HSTS), dépendances surveillées (Dependabot).
- Audit de sécurité / test d'intrusion avant le lancement.

### RGPD
- Hébergement UE (Supabase Irlande, Vercel région UE pour les fonctions, PostHog UE).
- Registre des traitements, durées de conservation (ex. comptes inactifs 3 ans, documents comptables 10 ans), export et suppression des données à la demande, notification de violation sous 72 h (CNIL).
- Consentement cookies ; pas de données personnelles dans les outils d'analyse ni dans les prompts IA.

### Performance et qualité
- Pages publiques : LCP < 2,5 s sur mobile ; pages SEO rendues côté serveur.
- Accessibilité : RGAA / WCAG 2.1 AA visé.
- Tests : unitaires sur `packages/core` (calculs, machine à états) avec couverture élevée ; e2e Playwright sur les parcours critiques (recherche → demande, devis → signature → acompte, réception → solde).
- Observabilité : Sentry, journaux des Edge Functions, alertes sur échecs de webhooks et de paiements.

### Checklist avant le pilote
- [ ] Supabase en plan Pro, sauvegardes + PITR actives, staging séparé
- [ ] Test de charge réalisé sur staging
- [ ] Audit sécurité / pentest réalisé, points critiques corrigés
- [ ] CGU, CGV, confidentialité, critères de classement validés par l'avocat
- [ ] Mentions des devis/factures validées par l'expert-comptable
- [ ] Stripe Connect et Billing en mode live, webhooks vérifiés
- [ ] Apps publiées (TestFlight / test interne puis stores)
- [ ] Référentiels (métiers, travaux, pièces, communes du 06) chargés
- [ ] Premiers artisans validés dans le 06 (objectif : seuil de rentabilité ≈ 52 abonnés à 250 € de panier moyen)

---

## 19. Glossaire

- **Acompte** : première tranche payée à la signature du devis.
- **Solde** : montant restant dû à la réception (total TTC − acomptes).
- **PV de réception** : document signé par le client qui constate la fin des travaux, avec ou sans réserves.
- **Réserves** : défauts signalés à la réception, que l'artisan doit corriger.
- **Décennale** : assurance obligatoire couvrant les dommages graves pendant 10 ans après la réception.
- **RLS** : Row Level Security, règles Postgres qui limitent les lignes visibles par chaque utilisateur.
- **Compte connecté (Stripe Connect)** : compte Stripe de l'artisan rattaché à la plateforme MENAO ; c'est sur ce compte, et non chez MENAO, que le client paie.
- **Score MENAO** : note agrégée de l'artisan calculée à partir des avis vérifiés.
