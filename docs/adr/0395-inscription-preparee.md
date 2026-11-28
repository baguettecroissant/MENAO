# ADR 0395 — Inscription préparée par le conseiller

- Statut : accepté (lot 3 du plan de l'espace commercial du 28/11/2026, maquette lot 84 validée le
  même jour : « Validé, code-le » ; principes décidés le 16/11/2026 avec la démo commerciale)
- Fonctionnalité : F-195. Complète l'ADR 0394 (espace terrain), l'ADR 0110 (inscription artisan en
  un parcours) et l'ADR 0136 (code partenaire dans l'adresse).

## Décision

- **Le conseiller prépare, l'artisan finit.** Dans « Inscrire un artisan » (ou « Inscrire
  maintenant » pendant la tournée, l'entreprise déjà cherchée), le conseiller saisit avec lui
  l'entreprise (recherche du parcours artisan), ses métiers (proposés d'après le code APE, limite
  de la formule de Base), sa zone (rayon autour du siège) et son contact, après avoir coché que
  l'artisan est d'accord.
- La base garde la préparation dans `prepared_signups` (RLS : son conseiller et les admins ; aucune
  écriture directe) et crée un **lien personnel** à clé secrète de 32 caractères, valable 7 jours.
  Le brouillon est construit par `preparedSignupDraft` (`@menao/core`) dans la forme du parcours
  d'inscription ; dirigeant et TVA restent vides : c'est l'artisan qui répond.
- Le lien s'envoie **depuis le téléphone du conseiller** : QR code sur place, SMS ou e-mail prêts.
  MENAO n'envoie pas d'e-mail lui-même (écart avec la maquette : pas de destinataire sans compte
  dans les notifications pour l'instant).
- **L'artisan** ouvre `/pro/inscription/preparee/<clé>` sans compte (`prepared_signup_open`, qui
  note la première ouverture), vérifie, puis « C'est bien moi » range le brouillon et ses
  coordonnées dans son navigateur et ouvre le parcours habituel (`?reprendre=1&p=<code>`) : il
  confirme son entreprise, choisit son mot de passe, accepte les CGV et saisit le code reçu par
  e-mail. Les coordonnées ne passent jamais dans l'adresse. « Supprimer ces informations » efface
  la préparation (`prepared_signup_forget`).
- Quand l'inscription est rattachée au conseiller (`commercial_attributions`), un déclencheur passe
  la préparation à « inscrit » et **efface ses données personnelles** (brouillon, nom, e-mail,
  téléphone). Purge quotidienne : lien jamais ouvert après 7 jours, inscription pas finie après
  30 jours.
- **Suivi** (« Mes inscriptions ») : lien envoyé, ouvert, puis les étapes du dossier (mêmes étapes
  manquantes que « Mon code »), avec « Renvoyer le lien » par SMS ; rechargé toutes les 30 secondes.
- **Back-office** : le dossier artisan indique « Inscription préparée par … », son code et les
  heures (préparée, ouverte, finie).
- Jamais de mot de passe ni de code demandé, aucun document reçu, aucun appel enregistré (règles
  rappelées dans l'écran et dans le guide terrain).

## Conséquences

- TODO(legal) : texte d'information de l'artisan sur la saisie préalable de ses données, et la case
  d'accord cochée par le conseiller.
- Mise en service : `db push` sur staging ; redéployer `commercial-copilot` (la rubrique « démo » du
  guide, qu'il lit, a changé).
