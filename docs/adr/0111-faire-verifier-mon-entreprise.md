# ADR 0111 — « Faire vérifier mon entreprise »

- Statut : accepté
- Date : 17 octobre 2026
- Suite de l'ADR 0110 (inscription en un seul parcours) ; complète les ADR 0006, 0009 et 0104.

## Contexte
- **L'inscription en un seul parcours** (ADR 0110) fait entreprise, métiers et zone en 2 minutes. Restaient la charte, les documents et le profil public, présentés en huit étapes affichées d'un coup (barre d'étapes).
- **Demande** : un parcours « le plus fluide, facile et rapide possible », d'après la maquette validée : la liste des pièces, une à la fois, en photo depuis le téléphone.
- **Cahier des charges du CEO** : la signature de l'engagement doit garder la date, l'heure, l'adresse IP et la version signée.

## Décision
- **Une page « Faire vérifier mon entreprise »** (`/pro/onboarding`) remplace la barre des huit étapes :
  - la liste de ce qu'il reste à faire avant l'envoi, chaque élément ouvrant sa page ;
  - l'état de chaque élément : à ajouter, déposé, vérifié, refusé (avec le motif), à refaire (date dépassée), fait, signée ;
  - la barre de progression (« 3 sur 7 ») et le bouton « Envoyer mon dossier en vérification », toujours visible, actif quand tout est prêt ;
  - la section « Après la vérification » : paiements (Stripe Connect) et formule, accessibles dès maintenant.
- **Les sept éléments** (`DOSSIER_ITEM_COUNT`, `dossierItemsLeft` dans `packages/core`) :
  - entreprise, métiers et zone, regroupés car faits à l'inscription, avec un lien « Modifier » pour chacun ;
  - la charte ;
  - chaque document ;
  - la photo et la présentation.
  - Les règles d'envoi ne changent pas : `canSubmitOnboarding` et `submit_artisan_onboarding`.
- **Sur chaque étape** : le titre de l'étape et un lien « Mon dossier ». Après l'enregistrement d'une étape, retour au dossier au lieu de l'étape suivante.
- **Documents, une pièce à la fois** (`/pro/onboarding/documents?type=…`) :
  - « Prendre en photo » ouvre l'appareil photo du téléphone (`capture`) ; « Choisir un fichier » ouvre la galerie ou un PDF ;
  - « Retour à mon dossier » une fois la pièce déposée ;
  - sans `type`, la page montre toutes les pièces, comme avant : renouvellements d'un artisan validé (F-51).
- **Charte** :
  - le texte, les 25 règles à cocher et la signature ne changent pas (ADR 0104) ;
  - l'adresse IP est enregistrée (`artisan_charter_acceptances.signer_ip`). Le site transmet l'adresse de son visiteur (`x-forwarded-for` de Vercel), car la base, appelée par le serveur, ne voit que celle du serveur. L'application ne transmet rien : la base lit l'adresse de la requête ;
  - après la signature, « Continuer : mes documents » ramène au dossier.
- **Artisan validé** : la même page reste « Mon dossier » (visibilité, tableau de bord, disponibilités), avec la liste pour suivre et renouveler les documents.

## Conséquences
- **Pas encore fait** :
  - l'engagement de l'artisan (travail déclaré, documents exacts) : le texte du CEO n'a pas été fourni ;
  - les nouvelles pièces et contrôles du cahier des charges (URSSAF, décennale couvrant les métiers, statut « Radié ») ;
  - la lecture automatique des attestations.
- **Charte en une seule case** : remplacer les 25 cases par une seule acceptation changerait la charte conçue par le CEO (ADR 0104). C'est à décider avec lui.
- **`TODO(legal)`** : conservation de l'adresse IP (5 ans après la fin de l'abonnement, selon le cahier des charges) et mention dans la politique de confidentialité.
