# ADR 0197 — Moments de réussite et vibrations

- Statut : accepté
- Date : 26 octobre 2026
- Lot 5 sur 5 des idées validées par l'utilisateur le 26 octobre 2026 (« toutes dans cet ordre »).

## Décision
- **Quatre étapes clés seulement**, pour que le moment reste marquant :
  - **devis envoyé** (artisan) : « Votre client est prévenu » ;
  - **rendez-vous fixé** (artisan) : « Il est dans votre agenda » ;
  - **devis signé** (particulier) : au retour de la page de signature, une fois la signature enregistrée ;
  - **acompte payé** (particulier) : au retour de la page de paiement, une fois le paiement enregistré.
- **Ce qui s'affiche** : une carte au centre de l'écran. Une coche se trace dans un cercle vert, avec une vibration de réussite. La carte se ferme seule après 2 secondes, ou d'un toucher.
- **Une seule fois par événement.** Pour la signature et l'acompte, seulement quand le serveur a confirmé : jamais sur une simple fermeture de la page sécurisée.
- Annoncé aux lecteurs d'écran ; coche entière d'emblée si « Réduire les animations » est activé.
- **Les vibrations des lots précédents complètent l'ensemble** : envoi d'un message, erreur, « Annuler », glisser (ADR 0195 et 0196).

## Technique
- `ui/success.tsx` : `celebrate({ title, text })` et `SuccessHost`, monté à la racine (`app/_layout.tsx`) comme les messages éphémères. Textes `fr.moments`.
- Appels :
  - `app/pro-chantier/[id]/devis/envoi.tsx` (devis envoyé) ;
  - `app/opportunite/[id]/rendez-vous.tsx` (rendez-vous fixé) ;
  - `app/devis/[id]/index.tsx` (signature ou acompte enregistrés au retour, une seule fois).
- Pas de nouvelle dépendance.
