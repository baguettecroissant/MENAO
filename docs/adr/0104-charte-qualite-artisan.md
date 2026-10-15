# ADR 0104 — Charte qualité de l'artisan dans l'inscription pro

- Statut : accepté
- Date : 15 octobre 2026

## Contexte
- **Demande** : l'équipe MENAO a rédigé une « Charte qualité de l'artisan partenaire » (version V5, maquette HTML). L'utilisateur veut l'intégrer à l'inscription pro **telle quelle, en tutoiement, sans rien changer**, alors que le reste de l'espace pro vouvoie.
- **Contenu** :
  - 25 règles numérotées (R1.1 à R6.2), réparties en 6 sections ;
  - le calcul du score MENAO, le challenge du trimestre, la procédure progressive ;
  - les engagements de MENAO et une signature (nom, entreprise, SIRET, tracé, case d'accord).

## Décision
- **Contenu** : `packages/core/src/charter.ts` (`CHARTER_SECTIONS`, `CHARTER_RULES`, `CHARTER_SCORE_WEIGHTS`, `CHARTER_LADDER`, `CHARTER_TEXT`), repris mot pour mot de la maquette. La version (`CHARTER_VERSION = "V5"`) est signée : une nouvelle version demandera une nouvelle signature.
- **Étape « charte »** de l'inscription, placée après la zone et avant les documents, comme le suggère la maquette (« Continuer : vérification de mes documents »). Elle est obligatoire pour envoyer le dossier : `canSubmitOnboarding` côté application, `submit_artisan_onboarding` en base.
- **Écran** (`/pro/onboarding/charte`) : la maquette reproduite avec les couleurs et composants du site :
  - introduction et parcours en 3 étapes ;
  - progression et sommaire ;
  - sections avec leurs règles à cocher ;
  - bandeau des 72 h, score et challenge, procédure ;
  - engagements de MENAO, encouragement, signature ;
  - bandeau du bas « Règle suivante ».
  
  Le nom, l'entreprise et le SIRET sont pré-remplis d'après l'inscription. Après la signature : écran de bienvenue avec le récapitulatif, et « Relire la charte » en lecture seule.
- **Base** :
  - **table** `artisan_charter_acceptances` : version, nombre de règles, nom, entreprise, SIRET, tracé (chemin SVG dans un cadre de 600 × 150), horodatage ;
  - **droits** (RLS) : lecture par l'artisan et par l'équipe MENAO, aucune écriture directe ;
  - **signature** : par `accept_artisan_charter()` seulement, qui vérifie la version en vigueur et les 25 règles, et ne garde qu'une signature par version.
- **Back-office** : le dossier artisan affiche la signature (date, version, signataire, entreprise, SIRET et tracé).

## Conséquences
- **Artisans déjà validés** : ils n'ont pas signé. Rien ne les y oblige pour l'instant ; ils peuvent ouvrir l'étape depuis « Mon dossier ». Un rappel ou une obligation sera à décider.
- **Engagements de la charte encore absents du produit**, gardés à la demande de l'utilisateur :
  - le score selon les poids de la charte (traité ensuite) ;
  - la notation du client par l'artisan, F-23 (traitée ensuite) ;
  - le challenge du trimestre et le statut « Élite Menao » ;
  - le rappel hebdomadaire du planning, l'orientation vers les aides et solutions de paiement, l'aide aux contrats de sous-traitance.
- **Délais** : le délai de 24 h pour accepter ou refuser une demande (R1.4) diffère de l'expiration des demandes, fixée à 48 h dans l'application.
- **`TODO(legal)`** :
  - validation par l'avocat et annexe aux CGV artisans ;
  - sanctions au regard du règlement P2B (UE 2019/1150) ;
  - non-contournement sans limite de durée ;
  - rôle de médiateur et médiation de la consommation ;
  - règlement d'un challenge avec lots ;
  - valeur de la signature (cases, tracé, horodatage).
