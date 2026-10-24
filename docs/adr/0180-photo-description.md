# ADR 0180 — Photo → description

- Statut : accepté
- Date : 24 octobre 2026
- Troisième des pistes choisies par l'utilisateur le 23 octobre 2026, après les propositions instantanées (ADR 0178) et la compréhension en direct (ADR 0179) : le particulier joint une photo de son problème, l'IA rédige le début de sa demande.

## Décision
- **Quand le particulier joint une photo** (trombone ou glisser-déposer sur le site, photothèque ou appareil photo dans l'application) et que sa description est encore courte, la première photo est décrite par l'IA :
  - champ vide : la description est écrite dans le champ, avec « Description rédigée d'après votre photo : vérifiez-la et complétez-la. » ;
  - texte déjà commencé : la description est proposée (« D'après votre photo : … [Ajouter] »), puis ajoutée en nouvelle phrase ;
  - pendant la lecture : « Lecture de votre photo… » ; en cas d'échec : « Cette photo n'a pas pu être décrite : décrivez votre besoin avec vos mots. ».
- Une description déjà détaillée (niveau « suffisant », 12 mots ou plus) ne déclenche pas d'appel.
- **Ce qui est écrit** : une ou deux phrases à la première personne, seulement ce que montre la photo, sans chiffre, lieu, marque ni rien sur les personnes visibles. Pas de description pour une photo hors sujet ou illisible.
- **La photo n'est ni enregistrée ni conservée** pour cette description : une copie réduite (1 024 px, JPEG, métadonnées retirées) est envoyée au modèle. Les photos du projet suivent leur chemin habituel (process-upload, après l'analyse).

## Technique
- **`packages/core/src/need-photo.ts`** (autonome, aussi importé par Deno) : schéma de la sortie structurée, `normalizePhotoDescription`, qui écarte une description illisible, hors sujet, chiffrée ou trop longue, et `appendDescription`.
- **Edge Function `describe-photo`** :
  - sans session, `verify_jwt = false`, CORS limité au site ;
  - image en base64 (1,5 Mo au plus), type réel vérifié (JPEG ou PNG) ;
  - Haiku 5.5, remplaçable par `AI_PHOTO_MODEL` ; 15 s au plus ;
  - limites : 20 photos par heure et par adresse IP, 500 par heure en tout ;
  - métriques dans `ai_runs` (`describe-photo`), écrites après la réponse.
- **Site** : `describeProjectPhoto` (réduction dans le navigateur, puis appel direct). **Application** : `photoBase64` (copie réduite en base64 avec expo-image-manipulator), même appel.
- **Essai réel**, sur des photos de la vitrine (images générées, sans personne réelle) réduites comme sur le site :
  - les quatre descriptions sont justes (cuisine à rénover, fissure près d'une fenêtre, pièce en peinture, pose de fenêtre) ;
  - pas de description pour une image hors sujet, ni pour une image contenant une consigne piégée ;
  - 2 à 4 s par photo (7 s au premier appel), environ 950 jetons en entrée, quelques millièmes de dollar en tout.

## Conséquences
- **Migration** `photo_description` : valeur `describe-photo` du journal `ai_runs`. Test pgTAP `97_photo_description`.
- **Faux serveur d'IA** : il répond aux descriptions de photo. Test de bout en bout : une photo jointe à un champ vide le remplit.
- **Après la fusion** : `db push` sur staging, puis `functions deploy describe-photo`.
- **Pas de nouvelle dépendance.**
