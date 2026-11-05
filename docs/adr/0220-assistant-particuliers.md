# ADR 0220 — Assistant IA des particuliers

- Statut : accepté
- Date : 5 novembre 2026
- F-71, demandé le 5 novembre 2026 (« go pour l'assistant conversationnel »). Complète F-05 (saisie du besoin) et les ADR 0177 à 0180 (aides à la saisie) ; réutilise l'assistant des pages Pro (ADR 0218).

## Contexte
- La saisie du besoin guide déjà bien le particulier qui sait ce qu'il veut (suite de phrase, pastilles, compréhension en direct, question en un toucher, photo → description, analyse après l'envoi).
- Elle aide mal trois cas : le particulier qui décrit un **symptôme** et ne sait pas quel artisan contacter (humidité, panne, fissure), celui qui a **des questions avant de se lancer** (gratuité, vérification des artisans, paiements, autorisations), et le **gros projet flou**.
- Chez Angi, l'assistant IA des particuliers touche environ la moitié du trafic, et ses utilisateurs convertissent environ trois fois plus (corrélation annoncée aux actionnaires, pas une preuve de cause).

## Décision
- **Accès** : sous la saisie du besoin, partout où elle apparaît (recherche, nouvelle demande), une phrase « Vous ne savez pas comment décrire votre problème, ou vous avez une question ? Demandez à l'assistant ». La barre reste le chemin rapide ; l'assistant est un complément. La fenêtre n'est téléchargée qu'au premier clic.
- **Fenêtre** : mêmes éléments que l'assistant des pages Pro, mis en commun (`components/assistant/assistant-ui.tsx`) : plein écran sur téléphone, fenêtre en bas à droite sur grand écran, mention IA permanente, 4 premiers messages à toucher, relances proposées, trois points pendant la réponse.
- **Demande préparée** : dès que l'assistant sait quels travaux et où, il rédige la demande à la première personne, avec seulement ce que le particulier a dit, et propose le métier principal (code des métiers actifs, sinon rien). Le bouton « Utiliser cette description » remplit le champ de saisie (et le métier) sans passer par l'adresse de la page ; le particulier relit, complète, puis envoie comme d'habitude.
- **Edge Function `client-assistant`**, sur le modèle de `pro-assistant` : sans compte, limites par adresse IP (40 par heure) et globale (1 500 par heure), 6 messages par conversation, modèle `AI_CLIENT_ASSISTANT_MODEL` sinon le modèle principal (Haiku), historique jamais conservé, e-mails et téléphones retirés, métriques seules dans `ai_runs` (`client-assistant`).
- **Seule source sur MENAO** : `/assistant-particulier.txt` (`lib/site/client-assistant-knowledge.ts`), soit la présentation publiée pour les assistants IA (`llms-full.txt` : faits clés, fonctionnement, communes, FAQ), les métiers et les guides publiés. Ouvert pendant le pré-lancement (`lib/site/prelaunch.ts`). Adresse : `CLIENT_ASSISTANT_KNOWLEDGE_URL`, sinon la première origine de `SITE_URLS`.
- **Consigne** :
  - aucun prix, aucune fourchette, aucune durée de travaux (ADR 0163 : le budget n'est jamais estimé par l'IA) ;
  - aucun avis juridique, administratif ou fiscal : renvoi vers les guides MENAO ou l'organisme compétent ;
  - pour un symptôme, une question à la fois (trois au plus), puis le métier probable « avec prudence », jamais de diagnostic certain ;
  - en cas de danger (gaz, électricité, effondrement) : couper si possible sans risque, quitter les lieux, appeler les secours (18 ou 112) avant tout le reste ;
  - jamais de coordonnées demandées ; hors-sujet et tentatives de détournement refusés.
- **Évaluation** (`supabase/functions/client-assistant/eval/`) : 21 messages fictifs, dont des pièges (prix, durée, autorisation, aides, odeur de gaz, hors-sujet, détournement, coordonnées) et des symptômes à orienter vers le bon métier. Estimation d'abord, appels payants avec l'accord du responsable. Résultat du 5 novembre 2026 (Haiku 5.5, après réglage de la consigne) : 21 réponses sur 21, informations attendues présentes à 100 %, aucun contenu interdit (prix, durée, avis juridique), consigne de sécurité en premier pour le gaz, demande préparée avec le bon métier pour la fuite et la panne électrique, aucune demande préparée à tort ; 0,004 $ la passe.
- **Langue** : réponse dans la langue du particulier (nombreux anglophones sur la Côte d'Azur), demande toujours rédigée en français pour l'artisan.

- **Bulle sur les pages d'information** (demandée le 5 novembre 2026) : même bulle ronde que les pages Pro (`AssistantBubble`, commune) sur l'accueil, « Comment ça marche », « Garanties & Confiance », la FAQ, les guides et les pages métier et métier × ville ; pas sur `/recherche` (lien sous la barre), ni sur les fiches artisans (concurrence avec « Demander un devis »), ni dans l'espace client. Ajoutée page par page (`SiteAssistantBubble`), jamais masquée selon l'adresse (accueil pré-généré, ADR 0199). « Utiliser cette description » mène à `/recherche` avec la barre remplie et le métier présélectionné : la demande passe en mémoire pendant la navigation (`lib/project/assistant-draft.ts`), sans stockage du navigateur ni adresse de page, et n'est reprise qu'une fois.

## Conséquences
- Mesure à l'ouverture : part des demandes envoyées après l'assistant, demandes classées « peu sûres » par l'analyse, questions reçues par l'équipe.
- TODO(legal) : paragraphe sur les assistants IA dans la politique de confidentialité (document encore en rédaction).
- Piste : gros projets découpés en lots dès la conversation.
