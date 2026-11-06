# ADR 0237 — Agent comptable avancé : le suivi de l'argent

- Statut : accepté
- Date : 7 novembre 2026
- F-87, PR A du lot 5 des agents IA (« go pour la PR A comme tu recommandes »). Premium et Entreprise (`plans.limites.agents.comptable_avance`, ADR 0231). La PR B ajoutera les relances des impayés.

## Contexte
Les factures MENAO naissent à l'encaissement (ADR 0024, 0029) et les paiements arrivent de Stripe : le rapprochement entre paiements et factures est déjà automatique. Ce qui manque à l'artisan, c'est la vue sur **ce qui n'est pas encore réglé** et sur **ce qui cloche**.

## Décision
- **Onglet « Suivi » dans Argent** : site `/pro/suivi`, application `?vue=suivi`. Visible seulement si la formule comprend l'agent avancé, sans nouvelle entrée de menu. Il montre :
  - le mois en bref (heure de Paris) : encaissé, devis signés, à encaisser, dépenses, comparés au mois précédent ;
  - « À encaisser » :
    - acompte dû depuis la signature, ni payé ni en cours de confirmation ;
    - solde dû depuis la réception (total TTC − paiements reçus, toujours calculé) ;
    - ancienneté et palier (avant J+7, à relancer, en retard à J+30), dernier paiement échoué signalé ;
  - « À vérifier » : paiement reçu depuis plus d'une heure sans facture, avec renvoi vers l'aide.
- **Une seule source** : `my_money_overview()` (artisan connecté), sur `app.money_month`, `app.money_open_items` et `app.money_paid_without_invoice`. Le cœur `money-overview.ts` lit la réponse et calcule ancienneté et paliers ; il sert au site et à l'application.
- **Synthèse du mois** : le 1er à 6 h 30 UTC, `app.send_monthly_summaries` envoie la notification `synthese_mois` (e-mail et push, préférence « activité »).
  - Elle part aux artisans dont la formule comprend l'agent avancé, au dossier vérifié et qui ont de l'activité, une seule fois par mois.
  - Contenu : encaissé, devis signés, à encaisser, dépenses, factures émises.
- **Export du comptable** : pour ces formules, `synthese.csv` (nombre et totaux HT, TVA, TTC des factures et des dépenses) s'ajoute à l'archive (ADR 0187).
- Des chiffres seulement, aucun conseil. `TODO(legal)` : présentation des montants à faire relire par l'expert-comptable ; le suivi ne remplace pas la comptabilité.

## Conséquences
- Tests pgTAP `126_suivi_argent` ; tests du cœur, de l'e-mail et de l'archive.
- `packages/emails` a changé : redéployer `notify`, `voice-assistant` et `accountant-export` (ce dernier change aussi).
- PR B : relances au client à J+7, J+15 et J+30, d'un toucher depuis « À encaisser » ou automatiques (désactivées par défaut).
