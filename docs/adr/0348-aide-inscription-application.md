# ADR 0348 — Aide à chaque étape de l'inscription (application, PR 2)

- Statut : accepté
- Date : 16 novembre 2026
- F-161, suite de l'ADR 0347 (site), maquette du lot 60 (« AidePreparer », « AideDocument », « AideAssureur », « AideStripe »).

## Décision
- **Même contenu que le site**, lu dans `@menao/core` (`onboarding-help.ts`) : les deux disent la même chose.
- **Écran d'un document** (`pro-document`) : ligne « Où trouver ce document ? » sous le titre. Elle ouvre une feuille du bas (`BottomSheet`) avec :
  - le choix du cas (URSSAF) ;
  - les étapes, la note et le lien officiel (ouvert dans le navigateur du téléphone) ;
  - pour les assurances, « Demander mon attestation à mon assureur » ;
  - « Plus tard ».
  - Le Kbis n'a cette aide que si la vérification au registre a échoué.
- **Message pour l'assureur** (`pro-assureur`, lien du site `/pro/onboarding/documents/assureur` relié) :
  - objet et texte modifiables, interrupteur « aussi la RC Pro » qui repart du message préparé ;
  - « Envoyer avec ma messagerie » ouvre la messagerie du téléphone (`mailto`) ;
  - « Copier ou partager le message » passe par le partage du téléphone, sans nouvelle dépendance.
  - Réservé, comme les documents, selon la place dans l'entreprise (ADR 0241).
- **Dossier** : carte « Avant de commencer » tant que l'artisan n'a déposé aucune pièce (le Kbis vérifié au registre ne compte pas).
- **Paiements** : « Gardez sous la main » avant le premier formulaire Stripe.
- Rien sur la formule ni l'abonnement (règle 10).

## Conséquences
- Aucune migration, aucune fonction, aucune dépendance.
- Restent : les 12 vidéos (hébergement hors Vercel, lecteur dans l'application) et l'envoi de la liste par e-mail.
