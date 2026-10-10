# ADR 0021 — Envoi du devis : numéro par artisan, données figées, réponse du client

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- **F-21** : l'artisan passe de l'aperçu à l'envoi, choisit l'échéancier (« Mon échéancier par défaut » ou personnalisé) et envoie le devis. Le client peut ensuite :
  - refuser, avec un motif ;
  - demander une modification, ce qui crée une nouvelle version (`DEVIS-2026-0018-v2`).
- **F-20** : le devis porte un numéro unique et chronologique, sa durée de validité, la date de début et la durée des travaux, et l'échéancier.
- **Maquettes** : « Aperçu du devis », « Envoi du devis », « Devis envoyés ».
- **ADR 0020** : l'aperçu ne porte pas de numéro, celui-ci est attribué à l'envoi.

## Décisions
- **Numérotation `DEVIS-AAAA-NNNN`, par artisan et par année, sans trou.**
  - Le compteur `quote_number_counters` est mis à jour dans la transaction d'envoi. Un envoi refusé par les contrôles ne consomme donc aucun numéro, ce que ne garantit pas une séquence Postgres.
  - Le numéro est unique par artisan : contrainte `(artisan_id, numero)`.
  - Une nouvelle version reprend le numéro d'origine suivi de l'indice (`-v2`), sans consommer de nouveau numéro.
- **Envoi par `artisan_send_quote`**, avec deux séries de contrôles.
  - Mentions obligatoires de F-20 :
    - identité de l'entreprise complète ;
    - assurance décennale renseignée (assureur, numéro, couverture) et non échue.
  - Modalités :
    - acompte entier entre 1 et 99 % ;
    - début après aujourd'hui (heure de Paris) et dans l'année ;
    - durée de 1 à 365 jours.

  La validité est de 30 jours (`QUOTE_VALIDITY_DAYS`). L'écran signale à l'avance une assurance incomplète.
- **Données figées à l'envoi** (`quotes.document`) :
  - elles reprennent la réponse de `quote_document` au moment de l'envoi, complétée des modalités ;
  - le PDF et la vue du client lisent ces données. Un changement d'adresse ou d'assurance de l'artisan ne modifie donc pas un devis déjà envoyé ;
  - le PDF envoyé est produit dès l'envoi, puis conservé tel quel dans le bucket privé `quote-pdfs`. `generate-pdf` le ressert après contrôle d'accès.
- **Échéancier (V1)** : un acompte à la signature, puis le solde à la réception.
  - Le pourcentage vient de l'échéancier par défaut de l'artisan (30 %, modifiable à l'envoi) ou d'un échéancier personnalisé.
  - L'acompte est arrondi au centime inférieur ; le solde vaut TTC − acompte. Le calcul est identique dans `packages/core` et en base.
  - L'échéancier est figé en JSON (`payment_schedule`). Les paiements (phase 4) s'appuieront dessus.
- **Réponse du client** :
  - **Refus** : un motif choisi dans une liste, plus un commentaire facultatif.
  - **Demande de modification** : un message. La base crée une nouvelle version en brouillon, reprenant les lignes (`supersedes_id`). L'artisan la modifie puis l'envoie ; la version précédente passe à « remplacé ».
  - Le client ne voit jamais les brouillons.
- **États et notifications** :
  - les transitions passent par `transition_chantier` (`devis_envoye`, `revision_demandee`, `devis_refuse`) ;
  - les notifications partent du journal du chantier : « devis reçu » au client, « refusé » ou « modification demandée » à l'artisan. Les e-mails passent par Resend (ADR 0017).
- **Accès** :
  - un devis envoyé est lisible par l'artisan, par le particulier du chantier et par l'équipe ;
  - les compteurs ne sont lisibles que par l'équipe ;
  - aucune écriture directe : tout passe par les fonctions.

## Points à valider
- **TODO(legal), acompte et rétractation**, à traiter avec la signature (3g) et les paiements (phase 4) :
  - un contrat conclu hors établissement interdit tout paiement avant sept jours (art. L221-10 du Code de la consommation) ;
  - les contrats à distance ou hors établissement ouvrent un droit de rétractation de 14 jours.
- **TODO(legal), à faire valider par l'expert-comptable** : durée de validité de 30 jours, arrondi de l'acompte, rédaction de l'échéancier.
- **Tranches intermédiaires** : la spec prévoit un échéancier personnalisé en *n* tranches. Leur déclenchement et leur paiement ne sont pas définis (F-31 et F-32 ne décrivent que l'acompte et le solde). La V1 se limite donc à acompte + solde. À trancher avec la phase 4.

## Conséquences
- **3g, signature électronique DocuSeal (F-13)** : elle portera sur le PDF conservé. L'acceptation de l'échéancier fait partie de la signature.
- **Phase 4** : les paiements de l'acompte et du solde partiront de `payment_schedule`.
- **Phase 6** : la notification push « devis reçu » arrivera avec l'application native.
