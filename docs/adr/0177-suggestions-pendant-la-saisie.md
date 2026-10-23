# ADR 0177 — Suggestions pendant la saisie de la recherche

- Statut : accepté
- Date : 23 octobre 2026
- Demande de l'utilisateur du 23 octobre 2026 : suggérer au particulier la suite de sa phrase et d'autres idées pendant qu'il écrit sa demande, pour rendre ce passage « hyper fluide et intelligent ». Choix : les deux formes (suite de phrase et pastilles), sur le site et dans l'application.

## Décision
- **Pendant la frappe**, après une courte pause (0,4 s), dès 12 caractères et jusqu'à 1 500, l'IA propose :
  - **la suite de la phrase** :
    - site : en gris dans le champ, acceptée par Tab, → ou le bouton « Compléter », et effacée par Échap ;
    - application : proposée sous le champ, à toucher pour l'ajouter ;
    - si le particulier tape le début de la suite, le reste reste proposé ;
  - **2 à 4 idées en pastilles** sous le champ (« Précisez : + Surface + Ville + Délai… ») :
    - d'abord les informations essentielles absentes (ville, surface ou quantité, délai, état actuel), puis des précisions de métier ;
    - un toucher ajoute le morceau de phrase à la fin du texte. L'endroit à compléter (« … ») est sélectionné, et la frappe le remplace.
- **Rien n'est inventé à la place du particulier** :
  - aucune suite ne contient de chiffre, de lieu, de date ni de détail personnel ;
  - tant que les travaux ne sont pas décrits, pas de suite, seulement des idées générales (type de travaux, ville, délai) ;
  - aucune idée ne redemande une information déjà écrite ;
  - ces règles figurent dans la consigne, et le code les vérifie aussi (`normalizeNeedSuggestion`).
- **Discrétion** : si l'IA est lente, indisponible ou limitée, rien ne s'affiche et rien ne bloque. Une réponse dépassée (texte modifié depuis) est ignorée.
- **Texte de confidentialité** sous le champ : inchangé. L'ajout de « dès la saisie » a été proposé et reste à décider.

## Technique
- **`packages/core/src/need-suggestion.ts`** (autonome, aussi importé par Deno) :
  - schéma de la sortie structurée ;
  - `normalizeNeedSuggestion`, `remainingCompletion` (suite encore valable pendant la frappe) et `appendIdea` (ajout d'une idée, endroit à compléter).
- **Jonction calculée, jamais confiée au modèle** : le modèle recopie les derniers mots du texte puis écrit la suite (`reprise`). Le code retire la plus longue partie commune et garde le reste, espaces compris, y compris pour un mot coupé (« cuis » → « ine »). L'évaluation a montré que le modèle oubliait l'espace ou répétait des morceaux de mots quand il devait écrire la suite seule.
- **Filtres** :
  - suite écartée si elle contient un chiffre, un « … » ou un détail personnel, si elle est coupée (« …, avec »), si elle répète trois mots du texte, ou si elle dépasse 70 caractères ;
  - idées : pas de surface ni de ville quand le texte en donne une, et pas de chiffre écrit.
- **Edge Function `suggest-need`** :
  - sans session (le visiteur n'a pas encore de compte), `verify_jwt = false`, CORS limité aux origines du site ;
  - e-mails et téléphones retirés avant l'envoi ;
  - Haiku 5.5 sans raisonnement, remplaçable par `AI_SUGGEST_MODEL` ; 8 s au plus, sans nouvel essai ;
  - limites : 150 suggestions par heure et par adresse IP, 3 000 par heure en tout (plafond de dépense) ;
  - métriques dans `ai_runs` (`suggest-need`), jamais le texte.
- **Site** : `useNeedSuggestions` (`lib/project/suggestions.ts`), appel direct à la fonction depuis le navigateur. Suite grisée par un calque derrière le champ (même police, même retour à la ligne).
- **Application** : même hook (`lib/need-suggestions.ts`) ; curseur placé par `setSelection`, ou `setSelectionRange` dans la version web.

## Évaluation (`supabase/functions/suggest-need/eval`)
- 30 débuts de demandes fictifs, contrôlés automatiquement :
  - idées qui redemandent une information écrite ;
  - informations essentielles proposées ;
  - mot coupé, hors sujet, détournement.
- Dernières passes après corrections :
  - informations essentielles proposées : 100 % ;
  - idées qui redemandent une information : 0 à 1 sur 30, avant le filtre des villes ;
  - hors sujet sans suggestion ;
  - détournement ignoré ;
  - temps de réponse médian : 1,9 s via OpenRouter.
- Coût : environ 0,0001 $ par suggestion, soit à peu près 0,0005 $ par recherche. Toutes les passes d'évaluation ont coûté environ 0,02 $.
- Limite connue : de rares suites maladroites (un mot mal formé, un détail inventé), que le particulier ignore ou n'accepte pas.

## Conséquences
- **Migration** `suggestions_recherche` : valeur `suggest-need` du journal `ai_runs`. Test pgTAP `96_suggestions_recherche`.
- **Après la fusion** : `db push` sur staging et déploiement de `suggest-need`. En production, une clé Anthropic directe devrait réduire le temps de réponse.
- **Faux serveur d'IA des tests e2e** : il répond aux suggestions ; un test vérifie la suite, l'idée et l'endroit à compléter.
- **Pas de nouvelle dépendance.**
