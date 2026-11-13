# ADR 0305 — Envoi des devis : corrections de l'audit du 31/10/2026

- Statut : accepté (13/11/2026)
- Source : audit des devis et factures du 31/10/2026 (« bugs lus, non reproduits »)

## Constats vérifiés

1. Un artisan **suspendu ou radié** pouvait encore envoyer un devis : `artisan_send_quote` ne
   regardait pas le statut du compte.
2. Un artisan déclaré **non soumis à l'assurance décennale obligatoire**
   (`decennale_non_soumis`) ne pouvait pas envoyer de devis (attestation exigée), et ses
   documents auraient affiché « Assurance décennale : informations à compléter ».
3. Le **régime de TVA** était contrôlé à l'enregistrement du brouillon, pas à l'envoi : un
   artisan passé en franchise (ou l'inverse) entre-temps envoyait des taux incohérents.

## Décision

- `artisan_send_quote` : refuse l'envoi si le compte n'est pas « validé » ; revérifie les taux
  de TVA des lignes contre le régime actuel ; n'exige l'attestation décennale que si l'activité
  y est soumise.
- `quote_live_document` fige `issuer.decennale_non_soumis` ; `@menao/documents` n'affiche alors
  aucune ligne d'assurance (devis, facture, PV, DPGF). Les écrans d'envoi (site et application)
  ne signalent plus d'assurance manquante dans ce cas.

## Non traité

- L'adresse d'un établissement masquée par l'Insee (diffusion partielle) bloque toujours l'envoi
  (« Identité de l'entreprise incomplète ») : il faut d'abord décider qui saisit et vérifie
  l'adresse.

## Conséquences

- TODO(legal) : confirmer qu'aucune mention d'assurance n'est due pour une activité non soumise
  (C. assurances L243-2) et s'il faut citer la RC Pro.
- Test pgTAP `144_corrections_envoi_devis`. Déploiement : la migration, puis les fonctions qui
  produisent les PDF (generate-pdf, signature-create, accountant-export, sirene-check).
