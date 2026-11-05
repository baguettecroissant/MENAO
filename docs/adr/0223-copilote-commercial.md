# ADR 0223 — Copilote du commercial : fiche de préparation, message et compte rendu dicté

- Statut : accepté
- Date : 5 novembre 2026
- F-74, demandé le 5 novembre 2026 (« go pour tout comme tu recommandes »), lot 1 des agents commerciaux IA « en plus des commerciaux physiques ». Complète l'espace commercial (ADR 0205 à 0207) ; reprend les briques des assistants IA (ADR 0218, 0220) et la demande de la zone (ADR 0182).

## Contexte
- Les commerciaux de terrain sont des indépendants payés à la commission, sans fixe. Leur qualité dépend de leur préparation et de leur suivi, inégaux d'une personne à l'autre.
- L'espace commercial a déjà la base de prospects (registre public), le suivi (étape, prochaine action, téléphone, notes), « Ma journée » et le guide terrain (offre, règles, objections, scripts).
- Objectif : plus de visites utiles par jour et une qualité constante, sans jamais envoyer de message à la place du commercial.

## Décision
- **Sur la fiche d'un prospect que je suis**, une carte « Copilote » à trois onglets :
  - **Préparer ma visite** : qui il est (2 phrases), la demande de sa zone, les 3 arguments et les 3 objections probables pour ce profil avec leur réponse, une question d'ouverture. La fiche est gardée en base (`prospect_briefs`, la dernière seulement) : relue sans nouvel appel, régénérée d'un clic.
  - **Préparer un message** : SMS, WhatsApp, e-mail ou script d'appel de 30 secondes, rédigé pour ce prospect. Le commercial le modifie, puis « Ouvrir WhatsApp », « Ouvrir SMS » ou « Ouvrir l'e-mail » ouvrent le message pré-rempli **sur son téléphone**, ou « Copier ». **MENAO n'envoie rien** et ne garde pas les messages. Le lien d'inscription du commercial (son code) et la mention de refus sont ajoutés par le code, jamais par l'IA.
  - **Compte rendu** : le commercial dicte (fonction `transcribe` existante, audio jamais gardé) ou écrit ; l'IA en tire un résumé, l'intérêt (chaud, tiède, froid), les objections, l'étape, la prochaine action datée et un message de suivi. Il corrige, puis « Enregistrer dans le suivi » : le compte rendu s'ajoute à l'historique (`prospect_reports`) et l'étape et la prochaine action du suivi sont mises à jour (le prospect revient dans « Ma journée » à la bonne date). Si l'artisan a demandé à ne plus être contacté : étape « pas intéressé », ni action ni message, et rappel de toucher « Ne plus contacter ».
- **Une seule source sur MENAO** : le guide terrain (`apps/web/src/content/commercial/guide.ts`, rubriques offre, règles, objections, démo, scripts, parcours), importé tel quel par l'Edge Function et mis en texte (`knowledge.ts`). Une correction du guide vaut pour le copilote au déploiement suivant de la fonction.
- **Garde-fous** :
  - consigne : rien en dehors du guide, aucune promesse (nombre de demandes ou de chantiers, même les limites des formules ; « clients garantis » ; revenu ; délai de vérification), jamais l'offre à l'année (le guide demande d'attendre la question de l'artisan), aucun concurrent nommé, ni « meilleurs artisans », ni urgence, ni remise, aucune adresse web, genre et prénom de l'artisan jamais devinés ;
  - **détecteur dans le code** (`copilotViolations`, `@menao/core`) sur tout texte destiné à l'artisan (arguments, réponses, question, message, message de suivi ; pas le portrait ni le résumé, qui rapportent ses propos) : une réponse fautive est redemandée une fois en nommant la règle, puis refusée (« Le texte proposé ne respectait pas les règles du guide terrain ») ;
  - la demande de la zone est calculée par la base, citée seulement à partir de 5 recherches (seuil de l'ADR 0182) et toujours comme des recherches passées ;
  - un rappel proposé est ramené dans la plage d'appel du guide (en semaine, 10 h à 13 h et 14 h à 20 h), jamais dans le passé (`callSlot`).
- **Données envoyées au modèle** : données publiques de l'entreprise (nom, activité, forme, ancienneté, effectif, commune, RGE), l'étape, les notes et les 3 derniers comptes rendus du commercial (e-mails et téléphones retirés), son prénom. Jamais le téléphone, l'adresse ni le SIRET du prospect (`public.commercial_copilot_context`). Journal : métriques seules (`ai_runs`, `commercial-copilot`).
- **Edge Function `commercial-copilot`** (jeton obligatoire, compte anonyme refusé) : contexte, demande et enregistrement de la fiche appelés **avec le jeton du commercial**, donc suivi vérifié par la base ; limites de 80 appels par commercial et par jour, 600 par heure en tout ; modèle `AI_COMMERCIAL_COPILOT_MODEL`, sinon le modèle principal (Haiku).
- **Base** (migration `copilote_commercial`) : tables `prospect_briefs` et `prospect_reports` liées au suivi (supprimées avec lui : « Ne plus suivre », « Ne plus contacter », purge des suivis inactifs), lecture par le commercial qui suit ou un admin, aucune écriture directe ; fonctions `commercial_copilot_context`, `commercial_prospect_demand` (métiers probables d'après le code APE, `prospectTradeCodes`, à moins de 20 km sur 30 jours, sinon dans la commune), `commercial_save_brief`, `commercial_add_report`. Test pgTAP `114_copilote_commercial`.
- **Évaluation** (`supabase/functions/commercial-copilot/eval/`) : 18 cas fictifs (6 fiches, 6 messages, 6 comptes rendus), dont des pièges : notes qui citent des concurrents et réclament une garantie ou une remise, demande sous le seuil, métier inconnu, prospect déjà inscrit, « ne plus me rappeler », rappel un samedi, tentative de détournement dans la dictée. Estimation d'abord ; appels payants avec l'accord du responsable.

## Conséquences
- Après la fusion : `db push` sur staging, puis `functions deploy commercial-copilot`. Pas de nouvelle version de l'application : l'espace commercial est sur le site (installable sur l'écran d'accueil, ADR 0211).
- TODO(legal) : mention d'information et de refus ajoutée aux messages écrits (« Vos coordonnées professionnelles viennent du registre public des entreprises… répondez simplement STOP ») et règles exactes des SMS et WhatsApp de prospection vers des entrepreneurs individuels : à faire valider par l'avocat (question n°2, comme le rappel « Au premier contact » de la fiche).
- Mesure : fiches, messages et comptes rendus par commercial (tables et `ai_runs`), passage des prospects d'une étape à l'autre avant et après.
- Lot 2 : simulateur d'entraînement (l'IA joue un artisan, un coach note l'échange), par écrit d'abord.
- Pas de nouvelle dépendance.
