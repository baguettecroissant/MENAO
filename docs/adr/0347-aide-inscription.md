# ADR 0347 — Aide à chaque étape de l'inscription (site, PR 1)

- Statut : accepté
- Date : 16 novembre 2026
- F-161, maquette du lot 60 validée le 16 novembre 2026 (« Validé »). Complète l'ADR 0111 (dossier à faire vérifier), l'ADR 0217 (Kbis vérifié au registre), l'ADR 0219 (relances de l'inscription) et l'ADR 0254 (refonte « Nette »).

## Contexte
- Beaucoup d'artisans ne sont pas à l'aise avec le numérique. Ils bloquent moins sur les écrans de MENAO que sur l'obtention des pièces : décennale chez l'assureur, attestation URSSAF, Kbis si le registre échoue, et sur ce que demande Stripe.
- Proposition retenue : trois couches, dans l'ordre :
  1. l'aide dans chaque étape ;
  2. douze vidéos verticales de 15 à 40 secondes ;
  3. un mémo A4 pour les commerciaux.
- Pas de visite guidée en surimpression : c'est une étape de plus, et elle est fermée aussitôt.

## Décision
- **Contenu partagé dans `@menao/core`** (`onboarding-help.ts`), pour que le site et l'application disent la même chose :
  - `PREPARE_ITEMS` : 6 éléments à préparer ;
  - `DOCUMENT_HELP` : par pièce, un ou plusieurs cas (URSSAF : micro-entrepreneur, société ou autre statut), trois étapes, le lien officiel quand il existe et une note ;
  - `STRIPE_CHECKLIST` : 4 éléments demandés par Stripe ;
  - `buildInsurerRequest` et `insurerMailto`.
  - Chemins des sites officiels relevés le 16 novembre 2026.
- **Message pour l'assureur** (`/pro/onboarding/documents/assureur?type=`) : décennale au modèle fixé par l'arrêté du 5 janvier 2016 et RC Pro (case « aussi la RC Pro »), avec l'entreprise, le SIRET, les métiers à vérifier dans les activités couvertes, et le numéro de contrat à compléter.
  - Adresse, objet et texte modifiables.
  - L'artisan l'envoie **depuis sa propre messagerie** (lien `mailto`) ou le copie : MENAO n'envoie rien à sa place et ne garde rien.
- **Page d'une pièce :**
  - « Où trouver ce document ? » dans la colonne de droite sur ordinateur, replié dans la carte sur téléphone et dans la liste de toutes les pièces ;
  - affiché seulement quand il y a quelque chose à déposer, et pour le Kbis seulement si la vérification au registre a échoué ;
  - phrase « Plus tard » : les relances de l'ADR 0219 rappellent déjà les pièces manquantes.
- **Dossier :** carte « Avant de commencer » tant qu'aucune pièce n'est déposée.
- **Paiements :** « Gardez sous la main » avant le premier formulaire Stripe (compte pas encore créé).
- **Espace commercial :** « Mémo pour l'artisan » (`/commercial/memo`), une page A4 avec la liste, ce que fait le conseiller, la règle « jamais de mot de passe ni de code SMS » et son QR code.

## Conséquences
- Aucune migration, aucune fonction, aucune dépendance.
- Écarts avec la maquette, laissés pour la suite :
  - « M'envoyer cette liste par e-mail » demande un modèle d'e-mail et un type de notification ;
  - le rappel « dans 3 jours » après la demande à l'assureur n'existe pas : les relances du dossier en brouillon (J+1, J+3, J+7) s'appliquent.
- PR suivantes :
  - **application iPhone :** mêmes écrans, avec la feuille « Où trouver ce document ? » ;
  - **vidéos :**
    - 12 vidéos MP4 720 × 1280 hébergées hors de Vercel (règle 13) ;
    - un lecteur dans l'application (nouvelle bibliothèque, à justifier) ;
    - dans l'application, la vidéo de la formule ne montre ni prix ni bouton d'abonnement (règle 10).
- Les chemins des sites de l'URSSAF et de MonIdenum sont à revoir quand ces sites changent.
