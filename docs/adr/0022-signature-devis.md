# ADR 0022 — Signature du devis : DocuSeal (UE), page de signature hébergée, webhook signé

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-13** : le client signe le devis.
  - Il voit d'abord l'aperçu du devis et coche « J'ai lu et j'accepte », puis trois cases : conditions du prestataire de signature, CGU de MENAO et confidentialité, échéancier.
  - Il confirme son identité par un code à usage unique envoyé par SMS, puis signe au doigt ou à la souris.
  - Le PDF signé et le fichier de preuve sont conservés.
- **Décision D8** : DocuSeal, en signature simple, hébergé dans l'UE. La valeur probante reste à confirmer (`TODO(legal)`).
- **Règle 9** : un webhook doit être authentifié et traité une seule fois.

## Décisions
- **`SignatureProvider`** (`packages/core/src/signature.ts`) : une interface et une vérification du webhook sans réseau, testées. DocuSeal en est la seule implémentation (`supabase/functions/_shared/docuseal.ts`). Son API UE est `https://api.docuseal.eu`, avec la clé dans l'en-tête `X-Auth-Token`.
- **Parcours** :
  1. Page « Signature du devis » (`/mon-espace/devis/[id]/signature`) : rappel du devis et de l'échéancier, lien vers le PDF, quatre cases à cocher.
  2. `particulier_start_signature` contrôle la demande (client du chantier, devis envoyé et encore valable, toutes les cases cochées). Elle enregistre les cases horodatées, avec les versions des conditions et l'échéancier accepté, et ouvre une procédure. Si une procédure est déjà en cours, elle la reprend avec le même lien.
  3. `signature-create` transmet tel quel le PDF envoyé et conservé (ADR 0021) à DocuSeal (`POST /submissions/pdf`). Le client signe sur la page de signature hébergée par DocuSeal, puis revient sur MENAO (`completed_redirect_url`).
  4. **Code à usage unique** : par SMS si le numéro est connu (`require_phone_2fa`), sinon par e-mail. Le réglage `DOCUSEAL_OTP` (`sms`, `email`, `aucun`) dépend de l'offre DocuSeal souscrite.
  5. La demande expire avec le devis (`expire_at`, fin de journée à Paris).
- **Page hébergée plutôt que formulaire intégré** :
  - aucun script tiers dans les pages de MENAO ;
  - même parcours sur le web et, plus tard, dans l'application native ;
  - le code SMS et le pavé de signature sont ceux de DocuSeal.

  L'intégration dans la page (`<docuseal-form>`) reste possible plus tard.
- **Placement des champs** : des balises texte DocuSeal (`{{Signature;role=Client;type=signature;…}}` et `{{Date;…}}`) sont écrites en blanc dans le cadre « Bon pour accord » de tout devis envoyé. Ce cadre est agrandi pour recevoir la signature.
  - Les balises suivent la mise en page, quelle que soit la longueur du devis.
  - DocuSeal les retire du PDF signé.
  - Position et dimensions vérifiées lors de l'essai réel du 10 octobre 2026 : la date suit « Date : », la signature tient sous « Signature du client : ».
- **Webhook `signature-webhook`** (sans jeton) :
  - signature `X-Docuseal-Signature` vérifiée : HMAC-SHA256 de `<horodatage>.<corps brut>` avec le secret `whsec_…`, écart de 5 minutes au plus, comparaison en temps constant ;
  - traitement unique grâce à `webhook_events` (source `docuseal`) ;
  - **signature terminée** : la fonction relit la demande chez DocuSeal plutôt que de se fier aux liens du message. Elle télécharge aussitôt le PDF signé et le journal de preuve (liens valables 40 minutes) et les conserve dans le bucket privé `quote-signatures`. `record_quote_signature` (service_role) passe ensuite le devis en « signé » et le chantier en `devis_signe`, et l'artisan reçoit l'e-mail « devis signé » ;
  - **refus chez DocuSeal**, ou chantier annulé entre-temps : la procédure passe en « abandonnée » et le devis ne change pas.
- **Accès** :
  - les procédures sont lisibles par les parties du devis et par l'équipe, sans aucune écriture directe ;
  - le PDF signé est servi par `generate-pdf` après contrôle d'accès (`quote_document`) ;
  - le fichier de preuve est conservé mais pas encore affiché (dossier du chantier, phase 5).
- **Données personnelles** : DocuSeal reçoit le nom, l'e-mail et le téléphone du client, nécessaires à la signature. Les journaux n'en contiennent aucun.

## Mise en service (staging)
1. Créer le compte DocuSeal UE (docuseal.eu). L'offre doit permettre l'API et les codes par SMS, sinon régler `DOCUSEAL_OTP`.
2. Poser les secrets des fonctions : `DOCUSEAL_API_KEY`, puis `DOCUSEAL_WEBHOOK_SECRET` (onglet HMAC du webhook). `DOCUSEAL_API_URL` vaut par défaut `https://api.docuseal.eu`.
3. Déclarer le webhook `https://<projet>.supabase.co/functions/v1/signature-webhook` pour les événements `form.completed` et `form.declined`.
4. Essai réel fait le 10 octobre 2026, avec DocuSeal UE en mode test :
   - la vraie API a accepté la demande construite par `_shared/docuseal.ts` ;
   - le webhook `form.completed` est arrivé sur staging, signé, et a été traité une seule fois ;
   - le PDF signé et le journal de preuve ont été produits ;
   - **le code par SMS demande l'offre Pro de DocuSeal** (20 SMS inclus, puis 0,20 $ le SMS). En attendant, staging utilise le code par e-mail (`DOCUSEAL_OTP=email`).

## Points à valider
- **Offre DocuSeal avant la mise en production** : l'offre Pro permet le code par SMS demandé par F-13. Sinon, le code par e-mail est gardé en V1.
- **TODO(legal), valeur probante** : signature simple et code à usage unique, archivage du devis signé et du journal de preuve.
- **TODO(legal), rétractation et acompte** : le délai de rétractation et l'interdiction de tout paiement pendant 7 jours hors établissement (ADR 0021) sont à intégrer avant le paiement de l'acompte (phase 4).
- **Accord de traitement des données** (DPA) avec DocuSeal et hébergement UE à confirmer à la souscription.

## Conséquences
- **Phase 4** : l'onglet « Paiement de l'acompte » suivra la signature (chantier `devis_signe`), à partir de l'échéancier figé.
- **Procès-verbal de réception (F-26)** : il réutilisera le même mécanisme, avec un autre document et un autre rôle.
