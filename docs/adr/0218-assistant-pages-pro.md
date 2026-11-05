# ADR 0218 — Assistant IA des pages Pro

- Statut : accepté
- Date : 4 novembre 2026
- F-69, demandé le 4 novembre 2026. Complète F-03 (espace Pro) et l'ADR 0177 (modèle d'Edge Function sans compte).

## Contexte
- **Demande de l'utilisateur** (4 novembre 2026) : répondre aux artisans qui découvrent MENAO à toute heure, et les convertir, en commençant par les pages Pro avant la pré-ouverture de janvier 2027. C'est la première brique d'agents commerciaux IA. Plan validé (« go pour tout, comme tu recommandes ») : bouton sur les pages Pro uniquement, rappel par l'équipe via un ticket, 4 questions à réponse immédiate, nom « Assistant MENAO ».
- Le chat du site artisans de Checkatrade (Leadoo) sert d'exemple : boutons scriptés qui mènent à l'inscription, IA seulement pour les questions libres (rapport `medias/recherche`, hors dépôt).
- Contraintes : règle 11 (rien de personnel dans les journaux), règle 13 (pages Pro pré-générées, aucun service Vercel), promesses retirées du guide des commerciaux (« 48 h », « 4 demandes par mois ») à ne pas réintroduire par une IA qui improvise.

## Décision
- **Bouton « Une question ? »** en bas à droite de `/pro` et `/pro/[metier]` (`components/pro-landing/pro-assistant.tsx`). La fenêtre (`pro-assistant-panel.tsx`) n'est téléchargée qu'au premier clic.
- **Mention IA** permanente dans l'en-tête de la fenêtre (« IA · répond en quelques secondes » : transparence, règlement européen sur l'IA, article 50). Le paragraphe d'avertissement en tête de conversation a été retiré le 5 novembre 2026 à la demande de l'utilisateur (trop long, comme chez Checkatrade).
- **4 questions à réponse immédiate** (prix, documents, demandes, commission) : la réponse est celle de la FAQ de la page Pro, sans appel au modèle.
- **Questions libres** : Edge Function `pro-assistant`, sans compte, sur le modèle de `suggest-need` :
  - limites par adresse IP (40 par heure) et globale (1 500 par heure), 6 questions par conversation (`PRO_ASSISTANT_MAX_QUESTIONS`) ;
  - modèle `AI_PRO_ASSISTANT_MODEL`, sinon le modèle principal (Haiku), consigne en cache chez le fournisseur ;
  - **seule source** : le texte `/assistant-pro.txt` du site (`lib/site/pro-assistant-knowledge.ts`), construit avec les textes publiés de la page Pro, les formules et le comparatif lus en base. Il suit le site sans copie à tenir à jour. La fonction le relit au plus toutes les 30 minutes et garde la dernière version si le site ne répond pas. Adresse : `PRO_ASSISTANT_KNOWLEDGE_URL`, sinon la première origine de `SITE_URLS` ;
  - consigne : aucune invention, « je ne sais pas » avec proposition de rappel quand l'information manque, aucune promesse de résultat, aucun concurrent, pas de conseil juridique ou fiscal personnalisé, refus du hors-sujet et des tentatives de détournement ;
  - réponse structurée (`reponse`, `sans_reponse`, `hors_sujet`) nettoyée dans `packages/core/src/pro-assistant.ts`. Quand l'information manque ou que la question est hors sujet, les boutons « Être rappelé » et « Écrire à l'équipe » s'affichent sous la réponse ;
  - l'historique vient du navigateur, nettoyé et borné, jamais conservé. E-mails et téléphones sont retirés avant l'envoi au modèle. Seules les métriques sont journalisées (`ai_runs`, `pro-assistant`).
- **« Être rappelé »** : prénom, téléphone, e-mail, métier et commune facultatifs, case d'accord. `request_pro_callback` crée un ticket `rappel_pro` pour l'équipe, à traiter sous 24 h (nouvelle colonne `tickets.contact_phone`, lien `tel:` dans la fiche du back-office). Limites : 2 demandes par téléphone ou par e-mail et par 24 h, 30 par heure au total.
- **Évaluation** (`supabase/functions/pro-assistant/eval/`) : 31 questions fictives, dont des pièges (promesse de demandes, concurrent, hors-sujet, détournement, coordonnées tapées dans le chat). Estimation du coût d'abord, appels payants seulement avec l'accord du responsable. Résultat du 4 novembre 2026 (Haiku 5.5, après réglage de la consigne) : 31 réponses sur 31, informations attendues présentes à 100 %, aucun contenu interdit, hors-sujet et détournements refusés, médiane 1,6 s, 0,006 $ pour les 31 questions.
- **FAQ des pages Pro** : « Kbis de moins de 3 mois » remplacé par la vérification au registre (ADR 0217), texte validé par l'utilisateur le 4 novembre 2026 ; l'assistant reprend la FAQ.

- **FAQ des artisans** (`/pro/faq`, demandée le 4 novembre 2026) : 59 questions détaillées en 10 thèmes, après les 8 questions de `/pro`, rédigées à partir des textes publiés, du code et des ADR (chaque réponse vérifiée contre sa source), sans promesse ni affirmation juridique non publiée. Données structurées FAQPage, lien depuis la FAQ de `/pro`, plan du site et `llms.txt`. Le texte de l'assistant la reprend en entier : nouvelle évaluation à 100 %, aucun contenu interdit, 0,006 $.
- **Mentions du Kbis** alignées sur l'ADR 0217 sur tout le site public (Garanties, page Pro, accueil, « Comment ça marche »).

- **Fenêtre** (demande du 4 novembre 2026) : plein écran sur téléphone (moins de 640 px de large, page derrière figée), fenêtre en bas à droite sur grand écran ; en-tête aux couleurs de la marque ; animations discrètes sans rebond (feuille qui monte, apparition des messages, trois points pendant la réponse), coupées si « Réduire les animations » est activé.
- **Questions de relance** : l'IA propose 2 ou 3 questions courtes sous sa réponse (`suggestions`, nettoyées dans `normalizeSuggestions`) ; après une réponse immédiate, les autres questions fréquentes. Évaluation : relances dans 31 réponses sur 31, toujours 100 % et aucun contenu interdit, 0,01 $.
- **Pré-lancement** : `/assistant-pro.txt` fait partie des adresses ouvertes (`lib/site/prelaunch.ts`) ; la fonction refuse une page HTML comme texte de référence.

## Conséquences
- Aucune donnée personnelle hors du ticket de rappel ; la conversation n'est pas enregistrée.
- Une modification de la page Pro (FAQ, formules) change les réponses de l'assistant dans l'heure, sans intervention.
- TODO(legal) : formulation de l'accord pour être rappelé, et paragraphe sur l'assistant et les demandes de rappel dans la politique de confidentialité (document encore en rédaction).
- Questions écartées de la FAQ, à trancher avant de les publier : limites de la formule Base non appliquées par le code, date de départ de l'essai, application dans les stores, paiement hors Stripe, effets d'une résiliation, exclusion des demandes directes de la garantie annuelle, mois offert de démarrage (CGV), questions juridiques (rétractation, médiation, garanties légales), facture électronique, suspension après plaintes, délai de vérification, prise en compte de la fiche Google, comptes multiples.
- Lot 2 : demandes de rappel attribuées aux commerciaux (espace commercial), tableau des questions les plus posées sans données personnelles, version côté particulier.
