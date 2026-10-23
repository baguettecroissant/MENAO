# ADR 0175 — Entreprise déjà inscrite à l'inscription artisan

- Statut : accepté
- Date : 23 octobre 2026
- Cas réel du 23 octobre 2026 : un artisan s'est inscrit avec son entreprise, déjà rattachée à un compte de test. Son compte a été créé sans entreprise, sans aucun message, et son dossier est resté bloqué en brouillon sur « SIRET pas encore vérifié ».

## Contexte
- Un SIRET ne peut appartenir qu'à un seul dossier artisan (`artisans.siret` unique).
- À la création du compte, `app.after_auth_user_insert` ignore un SIRET déjà pris. L'artisan l'apprenait seulement en essayant de renseigner son SIRET dans son espace (« SIRET déjà utilisé »).

## Décision
- **`public.siret_registered(p_siret)`** : répond oui ou non, sans rien dire du compte existant. Elle est accessible aux visiteurs, puisque l'inscription commence sans compte.
- **Étape « entreprise »** (site et application) : dès qu'une entreprise est choisie ou un SIRET saisi, le parcours demande si elle a déjà un compte.
  - Si oui, il affiche « Cette entreprise a déjà un compte MENAO », avec « Me connecter » et « Nous écrire ».
  - Le bouton « Continuer » reste bloqué. Il suffit de changer d'entreprise pour poursuivre.
- **Création du compte** (e-mail ou Google et Apple) : la même vérification est refaite côté serveur, juste avant. Si l'entreprise a été inscrite entre-temps, le compte n'est pas créé et le même message s'affiche.
- **Information révélée** : la réponse indique seulement qu'un compte existe pour ce SIRET, ce qui était déjà visible via le message « SIRET déjà utilisé » de l'espace pro. Aucune donnée du compte n'est donnée.

## Conséquences
- **Migration** `siret_deja_inscrit` ; test pgTAP `94_siret_deja_inscrit`.
- **Après la fusion** : `db push` sur staging. À faire aussi en production avant le lancement, avec les autres migrations.
- **Pas de nouvelle dépendance.**
