# ADR 0344 — Démo de l'espace commercial par lien secret (F-65, lot 57)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-65 ; maquette du lot 57 validée le 16/11/2026

## Contexte

Le recrutement des conseillers commence : l'associé et les candidats en entretien doivent voir
l'espace d'un conseiller sans compte. Un vrai compte rempli de fausses données polluerait la base :
un faux commercial dans le back-office et les totaux de primes, de fausses entreprises parmi les
prospects importés du registre.

## Décision

- **Un lien de démo à clé secrète** (`/commercial/demo/<clé>`, 32 caractères) : table
  `commercial_demo` à une ligne, RLS sans politique ; `commercial_demo_open` (sans compte) dit si
  la clé ouvre la démo ; l'admin lit le lien, le change (l'ancien tombe aussitôt) ou le désactive
  (`admin_commercial_demo`, `admin_rotate_commercial_demo`, `admin_set_commercial_demo`, aal2,
  journalisés). Encadré « Lien de démo » en tête de Apporteurs › Commerciaux. pgTAP 164.
- **Le lien pose un cookie de 7 jours**, puis la démo s'ouvre sur les vraies adresses de l'espace
  commercial : les liens internes marchent tels quels, et la démo artisan (`/pro/decouvrir`) aussi.
  Chaque page revérifie la clé : lien changé ou désactivé, la démo se ferme. Le proxy et les
  réécritures du pré-lancement laissent passer ces pages avec le cookie (sa présence seulement).
- **Les vrais écrans, données fictives** : `getCommercialSpace()` renvoie l'espace d'une
  conseillère fictive (Sarah K.) dont le client de base est un faux client sans réseau
  (`demo-data.ts`) : prospects du 06, journée, résultats, primes au barème 110 € + 30 €, fiche du
  copilote déjà préparée. Aucune écriture possible. Pas d'objectif mensuel affiché (indépendants).
- **Actions arrêtées avant d'agir** : bandeau orange « Démo » sur chaque page (couleur des
  exemples), et un gardien qui intercepte appels, messages, itinéraires, enregistrements et
  copilote avec un message « C'est une démo » qui dit ce qu'ils font dans le vrai espace.
- **Pas d'appel payant à l'IA** : l'entraînement montre un échange d'exemple déjà noté 16/20.
- Téléphones fictifs pris dans les plages réservées par l'Arcep à la fiction ; SIRET et adresses
  inventés.

## Conséquences

- Un commercial connecté qui ouvre le lien voit la démo jusqu'à « Quitter la démo ».
- Le lien peut circuler : il ne montre que des données fictives et ne coûte rien ; « Changer le
  lien » le coupe.
