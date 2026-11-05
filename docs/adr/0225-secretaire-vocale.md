# ADR 0225 — Secrétaire vocale « Camille » (Vapi), en essai sur le site

- Statut : accepté (essai entre associés)
- Date : 5 novembre 2026
- F-75, demandé le 5 novembre 2026 : une « secrétaire virtuelle » vocale 24 h/24 pour les artisans (futurs et inscrits). Choix de la plateforme : comparatif du 5 novembre 2026 (hors dépôt), qui recommande Vapi pour l'essai (Claude avec notre propre clé, appels d'outils vers nos fonctions, environ 0,10 $ la minute).

## Contexte
- Un premier essai dans le tableau de bord de Vapi a validé la voix française et le naturel. La consigne de Camille est réglée dans Vapi. La seule correction de fond a porté sur les nombres : ils doivent être écrits en lettres, sinon la mise en forme de Vapi les fait lire en anglais.
- Les associés veulent tester depuis menao.fr (fermé par le code d'accès du pré-lancement), sans acheter de numéro, et recevoir le lien d'inscription par e-mail plutôt que par SMS pendant les essais.

## Décision
- **Bouton « Parler à Camille »** dans la fenêtre de l'assistant des pages Pro (ADR 0218) : appel web avec la bibliothèque de Vapi (`@vapi-ai/web` 3.0.1, téléchargée seulement au premier appel). États : connexion, en ligne (« Camille parle… »), micro coupé, raccroché ; message clair si le micro est refusé. Visible seulement si `NEXT_PUBLIC_VAPI_PUBLIC_KEY` et `NEXT_PUBLIC_VAPI_ASSISTANT_ID` sont posées (clé publique, faite pour le navigateur, à limiter aux origines du site dans Vapi).
- **Politique de sécurité** : quand la secrétaire est configurée, l'API Vapi et le transport audio Daily sont autorisés (scripts `*.daily.co`, connexions `api.vapi.ai`, `*.daily.co`, `*.pluot.blue`), sans `unsafe-eval` (option `avoidEval`). Le micro était déjà autorisé pour le site.
- **Edge Function `voice-assistant`**, appelée par Vapi seulement : secret partagé dans l'en-tête `X-Vapi-Secret` (`VAPI_SERVER_SECRET`), comparé en temps constant. Réponse toujours en HTTP 200, une entrée par appel d'outil (format de Vapi).
  - `envoyer_lien_inscription` : e-mail avec le lien d'inscription artisan.
  - `envoyer_etat_dossier` : l'état du dossier et ce qui manque partent par e-mail **à l'adresse du compte**. Rien n'est dit au téléphone, et la réponse est la même que le compte existe ou non (l'appelant n'est pas identifié).
  - `demander_rappel` : ticket `rappel_pro` « Demande de rappel (secrétaire vocale Camille) » avec motif et meilleur moment, traité comme le bouton « Être rappelé ». Le numéro dicté est mis au format international.
  - Limites : 3 e-mails par adresse et par jour, 100 par heure en tout (adresses comptées par empreinte) ; 2 demandes de rappel par numéro ou adresse et par 24 h, 30 par heure. Un seul envoi par appel d'outil (clé d'idempotence de Resend).
  - Fin d'appel (`end-of-call-report`) : durée dans `ai_runs` (`voice-assistant`), jamais la transcription.
- **Base** (migration `secretaire_vocale`) : `public.voice_dossier_for_email` et `public.voice_request_callback`, ouvertes au seul rôle service. Test pgTAP `116_secretaire_vocale`.
- **E-mails** (`packages/emails/src/voice-assistant.ts`) au format des notifications, avec un pied de page propre (« vous l'avez demandé à Camille »).
- **Hors du dépôt** : la consigne de Camille, les réglages de Vapi et le guide de branchement (`medias/secretaire-vocale/`).

## Conséquences
- Pour l'essai : fusion, `db push` et déploiement de la fonction sur staging. Ensuite, côté associés : secret dans Supabase et dans Vapi, outils et adresse du serveur dans Vapi, deux variables dans Vercel puis redéploiement.
- Traitement des appels par Vapi et ses fournisseurs aux États-Unis (offre standard). TODO(legal) : contrat de sous-traitance et clauses types, information de l'appelant (annonce de l'IA dans la première phrase, AI Act article 50, en place), durée de conservation des transcriptions chez Vapi (enregistrement audio désactivé).
- Plus tard : numéro en 04 (Twilio) pour les vrais appels, SMS (Brevo) à la place de l'e-mail, rendez-vous avec le commercial du secteur, secrétaire proposée à chaque artisan.
- Nouvelle dépendance : `@vapi-ai/web` (SDK officiel de Vapi pour les appels web), chargée à la demande.
