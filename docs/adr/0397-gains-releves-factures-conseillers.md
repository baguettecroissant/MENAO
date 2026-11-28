# ADR 0397 — Les gains des conseillers : relevé du 25, facture préparée, virement

- Statut : accepté (lot 5 du plan de l'espace commercial du 28/11/2026, maquette lot 86 validée
  le même jour : « Validé, code-le »)
- Fonctionnalité : F-197. Complète les ADR 0207 (primes), 0394 (Bien démarrer) et 0396 (moments
  forts). Applique l'article 11 du contrat d'agent commercial.

## Décision

- **« Mes résultats » devient « Mes gains »** (même adresse `/commercial/resultats`). En tête :
  gagné ce mois (montant attendu des primes créées), à venir (« jusqu'à… », rien n'est promis),
  payé dans l'année ; le mois étape par étape (primes comptées, relevé du 25, facture avant le 28,
  virement), calculé par `gainsMonthSteps` (`@menao/core`). Le reste de la page ne change pas.
- **À venir** (`/commercial/resultats/a-venir`, `commercial_gains`) : dossier en vérification
  (prime de validation si validé), essai en cours (prime d'abonnement de la formule choisie s'il
  continue), dossier à compléter.
- **Relevé du 25** : chaque matin à 6 h 30, à partir du 25 (heure de Paris), un relevé par
  conseiller et par mois avec les primes vérifiées depuis le précédent
  (`app.issue_commercial_statements`, table `commercial_statements`, `commercial_bonuses.statement_id`)
  et la notification `conseiller_releve` (e-mail, cloche, téléphone). Relevé imprimable (A4) avec
  le rappel du droit aux extraits comptables (R134-3).
- **Facture préparée au nom du conseiller** : à partir de ses informations de facturation
  (`commercial_billing` : nom, SIRET, adresse, franchise en base ou assujetti avec numéro de TVA,
  IBAN contrôlé par la clé 97, préfixe et premier numéro). Il la vérifie, coche « J'ai vérifié… »
  et l'émet (`commercial_issue_invoice`) : numéro suivant sans trou, TVA de son régime
  (« TVA non applicable, art. 293 B du CGI » ou 20 %), identité figée dans la facture. La
  numérotation ne se change plus après la première facture émise. Une facture émise ne se modifie
  plus ; une erreur se corrige par un avoir (à la main par l'équipe pour l'instant).
- **Ou sa propre facture** : PDF déposé (`process-upload`, motif `commercial_invoice`, rangé dans
  `commercial-documents/<conseiller>/factures/`), remplaçable tant que le virement n'est pas fait.
- **Informations de facturation** : nouvelle étape de « Bien démarrer » (`facturation`, groupe
  « Mon statut d'agent ») et page `/commercial/facturation`, avec le RIB déposé à côté.
- **Back-office** (Apporteurs > Commerciaux) : relevés du mois, factures reçues, montant à virer ;
  « Marquer payé » avec la référence du virement (`admin_mark_commercial_invoice_paid` : facture
  et primes du relevé payées, journalisé) ; fichier de virement (CSV : bénéficiaire, IBAN, montant,
  référence) à charger dans la banque et export des factures pour le comptable. MENAO ne vire rien
  automatiquement.
- RLS : chaque conseiller ne lit que sa facturation, ses relevés et ses factures ; les admins tout.
  Écritures par les fonctions seulement. Tests pgTAP 186.

## Conséquences

- Mise en service : `db push` (tâche planifiée `menao-releves-conseillers`) ; `functions deploy
  process-upload notify`.
- TODO(legal) : faire relire par l'avocat la facture préparée par MENAO au nom de l'agent
  (mandat de facturation ou simple modèle émis par l'agent), ses mentions et le relevé.
- L'IBAN est saisi en plus du RIB déposé (le fichier de virement en a besoin) : écart assumé avec
  la maquette, qui ne montrait que le RIB.
