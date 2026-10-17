# ADR 0115 — Attestation de vigilance URSSAF

- Statut : accepté
- Date : 17 octobre 2026
- Complète les ADR 0009 (suivi des documents), 0037 (relances) et 0111 (« Faire vérifier mon entreprise »).

## Contexte
- **Cahier des charges du CEO** : l'attestation de vigilance URSSAF est obligatoire, valable 6 mois, et son code de sécurité se vérifie sur le site de l'URSSAF.
- **Même document** : relances à J-30 et J-7, puis suspension le jour de l'expiration, comme pour les autres documents obligatoires.
- **Décision de l'utilisateur** (17 octobre 2026) : la mettre en place.

## Décision
- **5ᵉ document obligatoire** (`document_type` « urssaf », `REQUIRED_DOCUMENT_TYPES`) :
  - champs : date d'émission (pas dans le futur, moins de 6 mois) et code de sécurité (`numero`), vérifié par l'équipe sur le site de l'URSSAF ;
  - la date de fin est calculée par la base : 6 mois après l'émission (déclencheur `artisan_documents_urssaf_date_fin`) ;
  - mêmes règles partout : `documentIsValid` (`packages/core`), `documentMetadataSchema`, et en base `app.documents_complete`, utilisée à l'envoi du dossier et à la validation par l'équipe.
- **Suivi** :
  - document surveillé (`MONITORED_DOCUMENT_TYPES`) : relances à J-30 et J-7, l'équipe comprise ;
  - à l'expiration, suspension automatique (`artisan_insurances_valid`, `daily_compliance`), qui nomme l'attestation dans l'e-mail ;
  - réactivation automatique dès qu'une attestation à jour est validée ;
  - les e-mails parlent désormais d'un « document obligatoire », plus seulement d'une assurance.
- **Artisans validés avant ce changement** : pas de suspension tant qu'ils n'ont jamais eu d'attestation validée. Un message les invite à l'ajouter, sur le tableau de bord du site et de l'application (bouton vers l'écran du document), et ils la déposent comme un renouvellement.
- **Partout où la liste des documents s'affiche** : dossier du site et de l'application, page des documents, back-office (vérification pièce par pièce), « Votre profil est créé ».

## Conséquences
- **Jeu de démonstration** : les dossiers du seed ont leur attestation ; les tests (pgTAP 05, 06, 33 ; bout en bout artisan et admin) passent à cinq documents.
- **Déploiement** : appliquer les migrations et redéployer `process-upload` (nouveau type de document) et `notify` (textes des e-mails).
- **Pas encore fait** : la vérification automatique du code de sécurité (pas d'API publique de l'URSSAF connue) ; l'équipe la fait à la main.
