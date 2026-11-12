# ADR 0289 — Appels d'offres : du DPGF chiffré au devis MENAO (F-138)

- Statut : accepté
- Date : 12 novembre 2026
- Suit les ADR 0287 et 0288. Respecte l'ADR 0209 (tout devis vient d'une demande MENAO) et s'appuie sur la demande directe (ADR 0198).

## Contexte
L'utilisateur voulait que le DPGF chiffré devienne un devis MENAO, avec signature, acompte et chantier, pour un maître d'ouvrage qui n'est pas client de MENAO.

Deux voies étaient possibles :
- **créer des chantiers sans demande** pour des clients hors MENAO. Cela touche la machine à états des chantiers, la signature et les chiffres du lancement, et casse la règle de l'ADR 0209 ;
- **faire venir le client par la fiche de l'artisan**. La demande directe existe déjà : la demande n'arrive qu'à cet artisan.

La seconde voie a été retenue le 12 novembre 2026 (« go pour la 1 »).

## Décision
- **Sur la fiche d'un appel d'offres**, un encart « Passer en devis MENAO » indique en trois étapes comment faire. Il donne :
  - le lien de la fiche publique, à copier ;
  - un e-mail prêt à envoyer (`mailto:` : aucun envoi par MENAO, aucune adresse enregistrée).
  - Sans fiche en ligne, il renvoie vers Ma vitrine.
- **Dans l'éditeur de devis**, un bloc « Reprendre un DPGF » (appels d'offres déjà lus de l'entreprise) ajoute les postes chiffrés en lignes à relire :
  - désignation précédée du n° du poste, lot en description ;
  - unité inconnue comptée au forfait, TVA de l'offre (0 % pour une entreprise non assujettie) ;
  - les postes sans quantité ou sans prix sont laissés de côté et comptés ;
  - la limite de 200 lignes d'un devis est respectée.
  - Rien n'est enregistré : l'artisan relit puis enregistre son devis comme d'habitude.
- **Calcul** : `tenderQuoteLines` (`packages/core/src/dpgf-totals.ts`), testé. Action serveur `tenderLinesForQuote`, avec la lecture soumise au droit « money » et à la RLS des appels d'offres.
- La suite ne change pas : demande, rendez-vous, devis, signature, acompte, chantier.
- Pas de migration ni de nouvelle dépendance.

## Écartés
- Un chantier ou un devis pour un client sans compte MENAO : à rouvrir seulement si les artisans le demandent, avec un cadrage de la signature et des paiements (règles 6 et 12).
