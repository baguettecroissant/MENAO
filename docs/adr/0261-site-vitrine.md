# ADR 0261 — Site vitrine repensé et Inter partout (refonte « Nette », lot 16)

- Statut : accepté
- Date : 9 novembre 2026
- Suite des ADR 0245 à 0260 (en-tête pilule : ADR 0199). Lot 16 maquetté (ordinateur, téléphone) et validé le 9 novembre avec la consigne « passe tout en Inter ». Dernier lot de la refonte.

## Décision
- **Police** : Inter (texte) et Inter Tight (titres) sur tout le site, y compris les pages publiques ; Google Sans n'est plus chargée. Les jetons `fontFamily.sans`, `app` et `display` de `packages/ui-tokens` pointent vers Inter, et le formulaire Stripe intégré reçoit Inter.
- **Titres** : tous les titres du site en gras serré, titre d'accueil plus grand. Les textes et les titres eux-mêmes ne changent pas.
- **Intertitres de section** : surtitre plus marqué, titre plus grand, sous-titre en gris doux.
- **Garanties** : pastille d'icône bleu nuit, cartes plus arrondies.
- **Bandeau d'appel à l'action de fin de page** : carte bleu clair, texte bleu nuit, bouton principal bleu et bouton secondaire.
- **Encart « Espace Pro »** : fond bleu nuit.
- **Pied de page** : fond bleu nuit, logo blanc, liens en blanc atténué.

## Conséquences
- Écart assumé : l'en-tête reste la pilule flottante (ADR 0199) et non la barre simple des maquettes.
- L'application garde ses propres polices (jetons partagés vérifiés par ses tests).
