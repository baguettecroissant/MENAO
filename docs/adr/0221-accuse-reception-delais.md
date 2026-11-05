# ADR 0221 — Accusé de réception : délai de réponse habituel de chaque artisan

- Statut : accepté
- Date : 5 novembre 2026
- F-72, demandé le 5 novembre 2026 (« go pour 1 et 2 »). Complète l'ADR 0183 (notification « demande envoyée ») et l'ADR 0160 (badge « moins de 2 h »).

## Contexte
- À l'envoi d'une demande, le particulier reçoit « Chaque artisan a 72 heures pour vous répondre » : un texte fixe, qui laisse l'attente floue et peut le pousser à chercher ailleurs.
- Le temps de réponse réel de chaque artisan est déjà mesuré (`app.artisan_response_stats` : moyenne sur 180 jours, demandes avec réponse), mais le client n'en voit qu'un badge sur la fiche, sous 2 h.
- Une prise de rendez-vous automatique a été écartée (tri perdu par l'artisan, visites gratuites subies, agendas incomplets) au profit de « accepter en un toucher » (ADR 0222) et de cet accusé de réception.

## Décision
- **Tranches, jamais de chiffre** : « répond en général en moins de 2 h », « en moins de 6 h », « dans la journée ». Rien au-delà de 24 h ni sous 3 réponses (règle `responseBand` dans `packages/core/src/requests.ts`, identique à `app.response_band`).
- **E-mail et notification « demande envoyée »** : la liste des artisans de l'envoi qui ont une tranche (3 au plus), suivie de « C'est une indication tirée de ses réponses passées, pas un engagement. » (`data.delais`, nom de l'entreprise et tranche seulement).
- **Page de confirmation** (`/recherche/[id]/envoyee`) : la tranche sous chaque artisan contacté, et la mention « Délais indicatifs, tirés des réponses passées de chaque artisan. » ; lue par `public.particulier_response_bands`, réservée au particulier auteur des demandes.

## Conséquences
- Aucune promesse : la tranche disparaît dès que la moyenne dépasse 24 h ou faute d'historique.
- À suivre : la même information dans l'écran de confirmation de l'application (l'e-mail et la notification la portent déjà).
