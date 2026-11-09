# ADR 0267 — Pages par fonction et pages Pro par métier enrichies (lot 21, lot C côté artisans)

- Statut : accepté
- Date : 9 novembre 2026
- Suite des ADR 0265 et 0266 et du rapport « Site vitrine wahou et SEO » (recherches à forte intention : logiciel de devis, secrétaire, acompte, facturation). Lot 21 maquetté et validé le 9 novembre.

## Décision
- **4 pages par fonction**, sur un gabarit commun (`FeaturePage`) : `/pro/logiciel-devis`, `/pro/secretaire-telephonique`, `/pro/acompte-en-ligne`, `/pro/facturation`. Chacune : bandeau (titre, « Créer mon compte pro », « Être rappelé », visuel d'exemple), 3 étapes, ce que l'artisan y gagne, extrait du comparatif (lignes choisies par libellé dans `plan_features`, valeurs lues en base), questions reprises de la FAQ des artisans, liens vers les autres fonctions, appel final.
- Faits repris de la FAQ des artisans et des réglages de l'espace pro ; la secrétaire n'a pas de bloc questions (aucune question existante).
- **Facturation** renvoie au guide « Facture électronique », sans promettre de conformité (aucun partenaire signé ni code, voir la mémoire « facture électronique »).
- **Pages Pro par métier** : bande de preuves, « Les outils MENAO pour votre métier » (liens vers les 4 pages), prix d'entrée lu en base avec la garantie de l'engagement ; titres et sections existants inchangés.
- Les 4 pages sont au plan du site.

## Conséquences
- TODO(legal) : faire relire les promesses des 4 pages avant l'ouverture.
- Les pages par fonction suivront l'arrivée de nouvelles fonctions (facture électronique conforme, agent comptable) : mettre à jour leurs textes et leurs lignes du comparatif.
