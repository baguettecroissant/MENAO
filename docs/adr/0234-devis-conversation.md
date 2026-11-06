# ADR 0234 — Devis dicté en conversation avec Camille (agents IA, lot 4)

- Statut : accepté
- Date : 6 novembre 2026
- F-85, demandé le 6 novembre 2026 (« go pour la PR 1 du lot 4 »). Pépite n° 2 du plan des agents IA : l'artisan dicte son devis en parlant avec Camille, qui pose les questions qui manquent. Inclus dans Premium et Entreprise (`plans.limites.agents.devis_conversation`, ADR 0231). La dictée seule (F-19, ADR 0019) reste dans toutes les formules.

## Décision
- **Dans l'éditeur de devis du site**, un bouton « Dicter avec Camille » à côté de la dictée, pour les formules qui l'incluent. Appel web avec une assistante Vapi dédiée (« Devis artisan »).
- **Camille connaît le chantier** dès le début de l'appel (`voice_quote_context`, variables de l'appel) :
  - le titre du chantier, la demande du client, le métier du lot et la commune ;
  - le régime de TVA de l'artisan (franchise en base : aucune TVA) ;
  - ses 30 prix habituels les plus récents, tirés des lignes de ses anciens devis, lus en toutes lettres.
- **Ses deux outils** (Edge Function `voice-assistant`) :
  - `devis_prix_habituels` cherche un prix dans ses anciens devis par les mots de la prestation ;
  - `devis_proposer` reçoit la liste **complète** des lignes convenues. Elle remplace la précédente, corrections comprises. Les lignes sont contrôlées par `rawVoiceLinesFrom` puis `normalizeVoiceLines` (mêmes règles que la dictée) et gardées en brouillon (`voice_quote_drafts`, une par appel). L'outil renvoie le total en toutes lettres (`quoteTotalsSpoken`) pour qu'elle le relise.
  - Elle n'invente jamais de prix : un prix non donné reste à 0 €, à compléter.
- **Les lignes arrivent dans l'éditeur pendant l'appel.** Le navigateur reçoit l'appel d'outil de Vapi (message « tool-calls ») et applique les mêmes fonctions de `@menao/core`. À la fin de l'appel, les lignes enregistrées par le serveur font foi. Elles sont marquées « À vérifier » comme celles de la dictée.
- **Rien ne part chez le client sans l'artisan** : il relit, enregistre et envoie lui-même. Le brouillon est clos dès qu'il enregistre son devis (`settle_voice_quote_drafts`). S'il ferme la page avant, l'éditeur propose au retour « Ajouter au devis » ou « Écarter ». Les brouillons sont purgés au bout de 90 jours.
- **Jeton propre au devis** :
  - `voice-session` (usage « devis ») vérifie le droit, les minutes restantes et que le chantier est à l'artisan et attend un devis ;
  - il signe un jeton de 30 minutes lié à l'artisan **et au chantier**, avec un préfixe de signature distinct de celui de la secrétaire : aucun jeton ne sert à l'autre usage.
  - L'identifiant de l'assistante est renvoyé par le serveur (secret Supabase `VAPI_QUOTE_ASSISTANT_ID`) : rien à régler dans Vercel.
- **Minutes** : appel compté à sa fin dans les minutes de l'artisan (`voice_record_usage`, agent « devis »). Sans minutes, l'appel ne démarre pas et l'artisan est renvoyé vers les recharges.

## Conséquences
- Tests pgTAP `124_devis_conversation` ; tests unitaires du jeton, des montants en toutes lettres, des prix habituels et de la lecture des lignes.
- Consigne de l'assistante dans `medias/secretaire-vocale/consigne-devis-artisan.md` (hors dépôt).
- **Ensuite** : le même bouton dans l'application iPhone (page web intégrée, le kit Vapi natif ne tourne pas dans Expo Go), puis le devis par téléphone sur la ligne de l'artisan, reconnu par son numéro.
