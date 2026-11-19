# ADR 0379 — En-tête : un bouton pour les artisans, trois liens au centre

- Statut : accepté (option A de la maquette du lot 76, choisie par l'utilisateur le 19/11/2026)
- Fonctionnalité : F-182

## Contexte

« Espace Pro » était le quatrième lien gris du centre de l'en-tête ; sous 1 280 px, il n'existait
que dans le menu replié. Les artisans, second public du site, le trouvaient mal.

## Décision

- **Bouton des artisans** : « Vous êtes artisan ? », plein, bleu nuit (variante `dark`), vers
  `/pro`. Sur téléphone et tablette, il reste dans la barre à côté du menu : « Espace Pro » sous
  640 px, le libellé complet au-delà. Sous 360 px, il cède sa place et reste en tête des actions
  du menu. Marqué `aria-current` sur les pages de l'Espace Pro.
- **Une seule action principale** : « Décrire mon projet » reste le seul bouton bleu, en dernier.
  « Mon espace client » devient un lien discret avec une icône : trois boutons pleins ou bordés
  côte à côte se disputaient l'attention.
- **Trois liens courts au centre** : Métiers, Comment ça marche ?, Garanties (libellé court dans
  la barre ; la page et le pied de page gardent « Garanties & Confiance »).
- **Menu replié** : « Décrire mon projet » d'abord, puis « Mon espace client », puis, séparé, le
  bouton des artisans.

## Conséquences

- Aucun nouveau texte sur le site en dehors du libellé du bouton.
- `NAV_LINKS` ne contient plus l'Espace Pro ; `isProPath` repère ses pages.
