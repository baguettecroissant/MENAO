# ADR 0299 — Cartes de visite : quatre modèles aux couleurs de MENAO, recto et verso

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-144 (remplace les modèles Nuit, Clair et Sobre de l'ADR 0263)

## Contexte

Les cartes du lot 17 (une face, initiales, MENAO discret) ont été jugées « trop fades ». Le lot 39
a maquetté quatre pistes plus marquées MENAO ; l'utilisateur veut les proposer toutes au choix de
l'artisan.

## Décision

- Quatre modèles, recto (l'entreprise, avec un petit QR code d'environ 14 mm dans un coin libre)
  et verso (grand QR code de la fiche) : **Signature** (dégradé bleu
  nuit, symbole en filigrane, badge vérifié), **Sourire** (courbe du sourire en dégradé, verso bleu
  MENAO), **Bleu vif** (tout bleu, symbole géant) et **Label** (crème quadrillé, sceau « Artisan
  vérifié · MENAO »). Signature par défaut ; une ancienne adresse `?modele=nuit` retombe sur
  Signature.
- Chaque face est dessinée dans le repère de la maquette (425 × 275 px) puis ramenée à
  85 × 55 mm par `zoom` (et non `transform`) : sans cela, le navigateur découpait les pages
  d'après la taille non réduite et coupait la dernière rangée à l'impression.
- La planche imprime deux pages (rectos puis versos, cartes identiques) à imprimer en recto-verso
  bord long ; sans recto-verso, page 1 puis page 2 sur la même feuille. À l'écran : recto et verso
  en grand, la planche seulement à l'impression.
- Badge et sceau « Artisan vérifié » seulement pour un artisan vérifié, jamais sur les cartes des
  commerciaux (modèle Signature, sans la phrase « me demander un devis »).
- Application : mêmes modèles dans le visualiseur de carte (règle 10 : ni commande ni achat).

## Conséquences

- Imprimée sur une seule face, la carte garde son lien vers la fiche grâce au petit QR du recto
  (demande de l'utilisateur du 13/11) ; la place du QR est réservée pour qu'un nom long ne passe
  pas dessous.
- Commande d'impression pro (recto-verso 350 g) toujours prévue en lot 2, sur le site seulement.
