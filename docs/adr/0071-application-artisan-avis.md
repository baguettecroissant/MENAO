# ADR 0071 — Application, espace artisan : avis des clients et réponse publique (lot 6c, partie 5)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Sur le site, l'artisan voit l'avis de son client sur la page du chantier et dans « Mes avis » (F-28). Il peut y répondre publiquement une fois et le signaler à l'équipe MENAO.
- Dans l'application, l'artisan voyait seulement « Votre client a été invité à donner son avis ».

## Décision
- **Avis sur la fiche du chantier**, une fois publié ou masqué, comme sur le site (`ReviewCard`) :
  - score et étoiles, trois critères et rapport qualité/prix, commentaire ;
  - motif du masquage par l'équipe, le cas échéant ;
  - réponse publique tant qu'il n'y en a pas (`reviewReplySchema`, `artisan_reply_review`, une seule fois). La réponse publiée s'affiche ensuite sous l'avis ;
  - « Signaler cet avis », avec un motif (`reviewReportSchema`, `report_review`).
- **Écran « Mes avis »** (`/pro-avis`, hors onglets comme `/pro-chantiers`) :
  - avis reçus, du plus récent au plus ancien, avec leur date, la date de réception, un lien vers le chantier et les mentions « Sans réponse » ou « Masqué » ;
  - nombre d'avis qui attendent une réponse ;
  - score MENAO détaillé (`ScoreBreakdown`, désormais commun avec la fiche publique d'un artisan) ;
  - fonctionnement des avis.
- **Accès** : le tableau de bord gagne une section « Mes avis », avec le nombre d'avis sans réponse (le compteur du menu du site) et le lien vers l'écran.
- Les avis sont lus avec les droits de l'artisan (RLS) et filtrés sur son identifiant, comme sur le site. Aucune nouvelle dépendance, aucun changement côté serveur.
- Aucun lien vers le site ni vers la fiche publique sur le site (règle 10).

## Conséquences
- **Partie suivante** : agenda de l'artisan (créneaux, absences).
