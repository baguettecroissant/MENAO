# ADR 0360 — Photo de profil du particulier, facultative (F-169, lot 66)

- Date : 17/11/2026
- Fonctionnalité : F-169 ; maquettes du lot 66 (« ComptePhotoApp », « ComptePhotoSite »,
  « PhotoClientVueArtisan »), validées le 17/11/2026.

## Contexte

Un particulier n'avait aucun moyen de déposer une photo de profil, alors que le serveur l'accepte
de tout compte (`process-upload`, usage « avatar ») et que la messagerie sait déjà la montrer à
l'artisan. L'artisan ne voyait donc jamais que l'initiale de son client.

## Décision

- **Dépôt dans « Mon compte »** : dans l'application, le rond de l'en-tête ouvre « Prendre une
  photo », « Choisir dans mes photos », « Retirer ma photo » ; sur le site, une carte « Photo de
  profil » avec glisser-déposer et cadrage. Pour un particulier seulement : un artisan règle son
  image dans sa fiche (ADR 0355).
- **Facultative**, sans relance ni incitation, et dite comme telle.
- **Qui la voit** : l'artisan, dans la messagerie (depuis la migration 20261010152143) et sur la
  fiche d'une demande et de son chantier, **une fois la demande acceptée**, comme le nom de
  famille, le téléphone et l'e-mail (`artisan_request_detail`). Jamais avant, jamais sur une page
  publique. Le profil du client reste illisible par les autres comptes (RLS de `profiles`).
- **Retrait** : `process-upload` avec l'usage `avatar_remove` efface le chemin et supprime le
  fichier. Le particulier ne peut pas écrire lui-même le chemin de sa photo.

## Conséquences

- Le fichier est rangé dans le compartiment `avatars`, public comme pour les artisans : il n'est
  listé nulle part et son adresse (identifiants aléatoires) n'est donnée qu'aux artisans ci-dessus,
  mais quiconque détient cette adresse peut l'ouvrir. Un compartiment privé avec adresses signées
  serait plus strict ; à décider si le besoin se présente.
- Les listes de l'artisan (demandes, chantiers) gardent l'initiale : seules la fiche et la
  messagerie montrent la photo.
