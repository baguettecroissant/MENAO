# ADR 0007 — Dépôt et contrôle des fichiers

- Statut : accepté
- Date : 9 octobre 2026

## Contexte
Spec F-43 : buckets privés et URL signées, suppression des métadonnées EXIF à l'upload, contrôle du type MIME réel, antivirus. Spec §4.4 : images redimensionnées à l'upload, aucune logique lourde ni gros transfert dans les fonctions Vercel (limite de 4,5 Mo par requête).

## Décision
1. **Le navigateur dépose le fichier brut** dans le bucket privé `uploads`, sous `uploads/<user_id>/<uuid>` (politique Storage : seulement dans son propre dossier). Les photos sont d'abord redimensionnées et réencodées en JPEG dans le navigateur (512 px pour la photo de profil, 1600 px pour les réalisations).
2. **Une Server Action valide les métadonnées** (Zod) puis appelle l'**Edge Function `process-upload`** avec la session de l'utilisateur.
3. `process-upload` (clé `service_role`) : vérifie le **type réel** par signature binaire (PDF, JPEG, PNG), la taille (10 Mo), **supprime les métadonnées** des images (EXIF/GPS, XMP, IPTC, commentaires, chunks texte PNG) avec une implémentation sans dépendance (`packages/core/src/files.ts`, testée), range le fichier dans son espace définitif, l'enregistre en base, puis **supprime toujours le fichier brut**.
4. Espaces définitifs, **écrits uniquement par le serveur** :
   - `artisan-documents` (privé) : lecture par le propriétaire et les admins (pas le support, spec F-43), par URL signées de 5 minutes ;
   - `avatars` (public, spec F-43) ;
   - `portfolio` (public) : photos de réalisations affichées sur la fiche artisan. Ajout par rapport à la liste de la spec.

## Conséquences
- Un fichier n'est jamais visible publiquement avant d'avoir été vérifié et nettoyé.
- **Antivirus non implémenté** : [À VALIDER] choix d'un prestataire (analyse dans `process-upload` avant rangement). Les PDF ne sont pas réécrits.
- Fichiers bruts abandonnés (dépôt sans appel à `process-upload`) : purge à planifier avec `pg_cron`, comme `rate_limits`.
- Documents figés pendant la vérification ; renouvellement (assurances qui expirent) à traiter avec le back-office (F-51).
