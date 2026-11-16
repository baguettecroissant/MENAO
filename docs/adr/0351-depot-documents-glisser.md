# ADR 0351 — Dépôt des documents : glisser-déposer et « plus tard » (F-162, lot 61, partie 2)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-162 ; maquettes des lots 60 et 61

## Constat

L'écran d'un document ne suivait pas la maquette : pas de glisser-déposer, pas de bouton « plus
tard » (une phrase en bas de page), fichier choisi peu visible. La lecture automatique (ADR 0176)
remplissait déjà la date et le code dès le fichier choisi.

## Décision

- **Zone de dépôt** dans `UploadForm` (mode documents) : cadre en pointillés qui accepte un fichier
  glissé, avec « Prendre en photo » et « Choisir un fichier ». Le fichier glissé est posé dans le
  champ fichier puis suit le même chemin qu'un fichier choisi (dépôt, lecture, pré-remplissage).
  Un type non accepté est refusé avec le message habituel. Sur téléphone, seuls les deux boutons.
- **Fichier choisi** affiché dans une fiche avec une coche.
- **« Je le déposerai plus tard »** : carte et bouton dans la colonne de droite tant que la pièce
  n'est pas déposée (retour au dossier ; MENAO relance déjà par e-mail, ADR 0219). Une fois la
  pièce déposée, « Retour à mon dossier » comme avant.

## Reste du lot 61, dans la même PR

- **Zone** : les choix de l'inscription portent la même description que ceux du dossier ; dans le
  dossier, le rayon se choisit avec les mêmes boutons qu'à l'inscription (plus de liste déroulante).
- **Documents** : pastille « Document N sur M » sur l'écran d'une pièce.
- **« Mon dossier »** : carte « Prochaine étape » avec un seul bouton « Continuer », qui ouvre la
  première chose à faire dans l'ordre du dossier (entreprise, métiers, zone, charte, première pièce
  manquante ou refusée, fiche publique).
- **Fiche publique** : la partie « réalisations » n'apparaît plus côté client tant qu'il n'y a
  aucune photo ; l'aperçu du dossier montre les initiales comme la vraie fiche (illustration par
  défaut déjà en place, `ArtisanPhoto`) ; jauge sous la présentation ; trois cases d'idées de
  photos et glisser-déposer des réalisations. Aucune photo par défaut dans les réalisations :
  ce serait trompeur pour le client.

## Conséquences

- L'illustration par défaut reste celle de `ArtisanPhoto` (initiales) : pas d'image par métier,
  qui demanderait des visuels à produire.
