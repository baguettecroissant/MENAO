# ADR 0012 — Recherche IA : session anonyme, analyse du besoin, transcription

- Statut : accepté (décisions A à D validées par les fondateurs le 9 octobre 2026)
- Date : 9 octobre 2026

## Contexte
F-05 à F-07 : le particulier décrit son projet (texte, dictée, photos), une IA pré-remplit les critères, puis il les vérifie sur 5 cartes. La spec laisse ouvert le moment de création du compte (F-08, `REQUIRE_ACCOUNT_BEFORE_RESULTS`, défaut `false`) ; le projet saisi avant l'inscription doit être conservé et rattaché au compte.

## Décisions
- **A. Session anonyme Supabase** (`signInAnonymously`) créée à la première dictée ou au premier envoi : le projet appartient à cet utilisateur dès sa création (RLS habituelle sur `user_id = auth.uid()`), et le restera quand il créera son compte (conversion de l'utilisateur anonyme, phase 2c). Le rôle stocké est `particulier` ; le claim `is_anonymous` distingue la session : le proxy et `/mon-espace` la traitent comme « pas de compte ». Pas de captcha pour l'instant (limites de Supabase : 30 sessions anonymes par heure et par IP, et nos limites par fonction). À revoir si abus (Cloudflare Turnstile).
- **B. Compte demandé à l'envoi de la demande** (`REQUIRE_ACCOUNT_BEFORE_RESULTS=false`), phase 2c.
- **C. Coordonnées** communiquées après acceptation de la demande par l'artisan (phase 2c).
- **D. Pas de mise en avant payante** dans les résultats (phase 2b).
- **Analyse du besoin (`analyze-need`)** : Claude Haiku 5.5, sorties structurées (`output_config.format` json_schema, listes fermées construites depuis les référentiels `trades`, `work_types`, `rooms`), puis validation Zod et normalisation (`normalizeNeedAnalysis` dans `@menao/core`). Modèle de secours Claude Sonnet 5.5 si la réponse est invalide, refusée, sans métier ou de confiance inférieure à 0,7. Si tout échoue : projet créé avec le seul texte (et le métier choisi par les puces), critères à compléter. Le projet est créé par la fonction (service_role) ; ville et adresse géocodées au mieux (Géoplateforme).
- **Données personnelles** : e-mails, téléphones, prénom et nom du compte retirés du texte avant l'envoi au modèle (`scrubPersonalData`). Journal `ai_runs` (admin) sans texte : modèle, issue, latence, jetons, confiance. Le texte reste dans `projects` et disparaît avec lui.
- **Limites** : 20 analyses par heure et par utilisateur, et autant par IP (empreinte SHA-256, jamais l'IP en clair) ; 30 dictées par heure et par utilisateur, 60 par IP.
- **Transcription (`transcribe`)** : le navigateur enregistre (MediaRecorder), décode et convertit en WAV PCM 16 bits mono 16 kHz (`encodeWav`), 2 minutes au plus ; la fonction vérifie l'en-tête et la durée. Interface `TranscriptionProvider` : Voxtral Mini Transcribe via OpenRouter (tests, staging), Mistral en direct si `MISTRAL_API_KEY` est posée. Ni l'audio ni le texte ne sont conservés. Les erreurs de vocabulaire du bâtiment sont rattrapées par l'analyse (consigne dans le prompt).
- **CORS** : `analyze-need`, `transcribe` et `process-upload` sont appelées par le navigateur ; sur Supabase hébergé, elles répondent elles-mêmes aux requêtes OPTIONS (`_shared/cors.ts`), pour les seules origines de `SITE_URLS`. La passerelle locale de la CLI le fait déjà : la CI ne peut pas détecter un oubli.
- **Passerelle** : SDK officiel Anthropic. `ANTHROPIC_API_KEY` (production, recommandé : contrat et RGPD directs) prioritaire sur `OPENROUTER_API_KEY` (tests et staging, point d'accès compatible Anthropic). Modèles surchargeables par variables (`AI_ANALYZE_MODEL`, `AI_ANALYZE_FALLBACK_MODEL`, `AI_TRANSCRIBE_MODEL`).
- **Photos** : réduites dans le navigateur (JPEG, 2 000 px), puis vérifiées par `process-upload` (type réel, métadonnées retirées) et rangées dans l'espace privé `project-photos` (10 au plus). Le HEIC est accepté si le navigateur sait le décoder (Safari) ; sinon le particulier est invité à le convertir.
- **Critères** : modifiés uniquement par `save_project_criteria` (référentiels, travaux du métier choisi, adresse dans la ville, date non passée) ; `validate_project_criteria` exige métier et ville.

## Conséquences
- Coût mesuré sur staging : environ 0,0003 $ par analyse (Haiku), 0,003 $ par minute de dictée.
- En CI, faux serveur OpenRouter et Géoplateforme (`apps/web/e2e/mock-ai.mjs`) : aucun appel réel.
- À faire : purge des utilisateurs anonymes inactifs et de leurs fichiers (avec la purge de `uploads`), description des photos envoyée au modèle (vision) si le besoin se confirme, test de la dictée avec de vraies voix et du vocabulaire de chantier.
- Avant le pilote : clés directes Anthropic et Mistral, et activation des sessions anonymes sur la production.
