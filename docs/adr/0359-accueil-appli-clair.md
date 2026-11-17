# ADR 0359 — Accueil de l'application : clair, avec photo, la saisie d'abord (F-168, lot 65)

- Date : 17/11/2026
- Fonctionnalité : F-168 ; maquettes du lot 65 (« AccueilAppVisiteur », « AccueilAppConnecte »),
  validées le 17/11/2026. Remplace la présentation de l'accueil des ADR 0055 et 0082, sans changer
  le tableau de bord du client connecté.

## Contexte

L'accueil d'un nouveau venu ouvrait sur un grand bloc bleu (« Bonjour ! », une question, trois
pastilles) puis une grille de huit métiers. Correct mais générique : aucune image, aucune preuve
des garanties annoncées, et une saisie qui ne donnait pas envie d'écrire.

## Décision

- **Ambiance claire avec photo** (la photo du site, personnages fictifs), comme le site vitrine ;
  la barre d'état reste sombre.
- **Une promesse en titre** : « Un artisan vérifié, près de chez vous ».
- **La saisie comme élément principal** : la carte ouvre l'écran de recherche ; « Photo »,
  « Dicter » et « Urgent » l'ouvrent avec l'action déjà lancée, un exemple avec son texte
  (paramètres `texte`, `urgent`, `action` de `/recherche`). L'accueil ne duplique pas la saisie.
- **« Comment on vérifie un artisan »** (registre, décennale, URSSAF) remplace les pastilles.
- **Métiers en une rangée qui défile**, « Comment ça marche » en trois étapes illustrées, et un
  accès « Vous êtes artisan ? » vers l'inscription.
- **Client connecté** : même saisie, plus compacte, puis son tableau de bord inchangé.

## Conséquences

- Quatre photos embarquées dans l'application (`apps/mobile/assets/home`, 150 Ko en tout).
- La carte « Votre espace MENAO » (créer un compte, se connecter) quitte l'accueil : le compte
  s'ouvre par le rond en haut à droite, comme sur la maquette.
- « Photo » et « Dicter » dès l'accueil ne se vérifient que sur un téléphone (autorisations).
