# ADR 0262 — Plus de barre du haut sur ordinateur dans l'espace pro

- Statut : accepté
- Date : 9 novembre 2026
- Modifie l'ADR 0035 (coque des espaces). Demandé par l'utilisateur le 9 novembre (« ça fait doublon »), option 1 retenue.

## Contexte
Sur ordinateur, la barre du haut de l'espace pro ne contenait que le bouton de repli du menu, le nom de la rubrique (déjà en grand titre de page) et la cloche des notifications : 64 px pris pour un doublon.

## Décision
- Espaces **pro**, **exemples** et **commercial**, sur ordinateur : plus de barre du haut.
  - Le bouton qui replie le menu passe dans l'en-tête du menu latéral, à droite de l'étiquette d'espace (sous le logo quand le menu est replié).
  - La cloche devient une ligne « Notifications » du pied du menu, au-dessus de « Aide et support », avec le nombre de non lues (point bleu quand le menu est replié). Même nom accessible qu'avant.
  - L'étiquette « Espace commercial » devient « Commercial » dans le menu, faute de place à côté du bouton.
  - Les colonnes collantes des pages pro et commerciales remontent (`lg:top-6`).
- **Client** et **back-office** gardent leur barre du haut : elle porte la recherche (nouvelle demande, recherche globale).
- **Téléphone** : la barre du haut reste partout (menu, logo, messages, cloche, compte).
