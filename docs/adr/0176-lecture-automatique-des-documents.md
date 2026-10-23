# ADR 0176 — Lecture automatique des documents par l'IA

- Statut : accepté
- Date : 23 octobre 2026
- Demande de l'utilisateur du 23 octobre 2026 : détecter automatiquement les dates de validité des documents (et les autres champs) avec l'IA. Cas réel du même jour : une pièce d'identité déposée avec la date du jour comme date d'expiration, ce qui bloquait l'envoi du dossier.

## Contexte
- Pour chacun des 5 documents du dossier (Kbis, décennale, RC Pro, pièce d'identité, attestation URSSAF), l'artisan recopie à la main les dates, l'assureur, le numéro de contrat ou le code de sécurité. C'est long, surtout sur téléphone, et source d'erreurs : date du jour laissée par défaut, date d'émission prise pour la date de fin…
- La règle 11 de CLAUDE.md interdisait toute donnée personnelle dans les requêtes envoyées à l'IA. Elle est modifiée : l'IA peut traiter des documents et des données personnelles quand c'est utile au service, via un fournisseur sous contrat, sans rien conserver d'autre que des métriques. Les logs, PostHog, les seeds et les tests restent sans données personnelles.

## Décision
- **Le document est lu dès qu'il est choisi** (photo prise, photo ou fichier choisi), sur le site et dans l'application.
  - Le fichier est déposé tout de suite dans `uploads`, puis lu par la nouvelle Edge Function `read-document`.
  - Les champs vides sont pré-remplis. Ce que l'artisan a déjà saisi est gardé ; si le document est remplacé, les champs remplis par la première lecture prennent les nouvelles valeurs.
  - Message : « Document lu automatiquement : vérifiez les informations ci-dessous avant de l'envoyer. » L'artisan corrige si besoin, puis envoie.
  - Les dates lues sont contrôlées tout de suite, avec les mêmes règles qu'à l'envoi (`documentMetadataSchema`) : document expiré, Kbis de plus de 3 mois, attestation URSSAF de plus de 6 mois.
  - À l'envoi, le fichier déjà déposé est réutilisé (pas de second envoi) ; process-upload le vérifie et le range comme avant. L'équipe MENAO vérifie toujours le document.
  - Si la lecture échoue (modèle indisponible, limite atteinte, image trop lourde…), l'artisan remplit les champs comme avant.
- **Champs lus par document** (`DOCUMENT_PREFILL_FIELDS`) :
  - Kbis : date d'émission ;
  - décennale : assureur, numéro de contrat, date de fin, couverture géographique ;
  - RC Pro : assureur, numéro de contrat, date de fin ;
  - URSSAF : date d'émission, code de sécurité ;
  - pièce d'identité : date d'expiration. Son numéro n'est jamais relevé.
  - Les métiers couverts par la décennale restent cochés par l'artisan (ADR 0116).
- **Alertes**, montrées sans bloquer l'envoi :
  - document difficile à lire (« reprenez la photo ») ;
  - autre document que celui attendu (par exemple une RC Pro déposée à la place de la décennale) ; rien n'est alors pré-rempli ;
  - numéro SIREN du document différent de celui de l'entreprise de l'artisan.
- **Date de fin égale à aujourd'hui refusée** (décennale, RC Pro, pièce d'identité), avec son propre message : « C'est la date du jour : indiquez la date de fin de validité inscrite sur le document. » C'est presque toujours la valeur par défaut du sélecteur de date. Dans l'application, le calendrier commence à demain.
- **[TODO(legal)]** : les cartes d'identité plastifiées délivrées à un majeur entre 2004 et 2013 restent valables 5 ans après la date inscrite. Le modèle relève la date inscrite ; l'équipe tranche à la vérification. À faire confirmer avant d'automatiser davantage.

## Technique
- **`packages/core/src/document-reading.ts`** (autonome, aussi importé par Deno) : schéma JSON de la sortie structurée, `normalizeDocumentReading` (dates réelles au format AAAA-MM-JJ, textes bornés, champs du seul document attendu, alertes) et `prefillUpdates` (ce qui peut être pré-rempli sans écraser la saisie).
- **Edge Function `read-document`** :
  - réservée à l'artisan connecté, pour un fichier de son propre dossier `uploads/<user_id>/<uuid>`, quand le dépôt de documents est ouvert (inscription ou renouvellement) ;
  - type réel vérifié (`detectFileType`) ; photo envoyée comme image (5 Mo au plus), PDF comme document ;
  - modèle `llmConfig().primary` (Haiku 5.5), remplaçable par `AI_DOCUMENT_MODEL` ; sortie structurée ;
  - 30 lectures par heure et par artisan, 60 par adresse IP ;
  - le fichier n'est pas retiré (process-upload s'en charge à l'envoi) ; rien n'est conservé, sauf la ligne de métriques dans `ai_runs` (`read-document`).
- **Site** : `UploadForm` prend `readAs` ; le fichier passe avant les champs. Une photo de plus de 5 Mo est réduite à 2 400 px avant le dépôt. Action serveur `readDocument`.
- **Application** : `depositPhoto` et `processDeposit` séparent le dépôt du traitement (`uploadPhoto` les enchaîne, comme avant) ; `readDocument` appelle la même fonction.
- **Fichiers bruts** : un document remplacé est retiré de `uploads` par l'artisan lui-même (nouvelles règles de lecture et de suppression de son propre dossier). Dans l'application, il l'est aussi quand l'écran est quitté sans envoi. La purge des fichiers abandonnés reste à faire (TODO de `app.daily_compliance`).
- **Coût** : une image ou une page de PDF, plus les consignes, soit quelques milliers de jetons en entrée par lecture avec Haiku. À mesurer sur staging (`ai_runs`, back-office « Suivi de l'IA »).

## Conséquences
- **Migration** `lecture_documents_ia` : valeur `read-document` du journal `ai_runs`, règles de lecture et de suppression de son propre dossier dans `uploads`. Test pgTAP `95_lecture_documents_ia`.
- **Après la fusion** : `db push` sur staging et déploiement de `read-document`. Même chose en production avant le lancement, avec une clé Anthropic (ou OpenRouter) configurée.
- **Faux serveur d'IA des tests e2e** : il répond aux lectures de documents ; le test artisan vérifie la date pré-remplie de la pièce d'identité.
- **Pas de nouvelle dépendance.**
