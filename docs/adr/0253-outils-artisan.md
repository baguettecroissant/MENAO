# ADR 0253 — Outils de l'artisan repensés (refonte « Nette », lot 8)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0252. Lot 8 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Aide et support** : deux colonnes. À gauche, l'assistant dans une carte (en-tête, « Connaît votre espace et votre compte », bulles bleu nuit, barre d'écriture séparée). À droite, les guides (chantiers, paiements, agenda, secrétaire) et le contact.
- **Dépense** : en-tête de fiche commun (`SheetHeader`), la pièce justificative à gauche, le total, les détails et la suppression à droite.
- **Mon comptable** : chiffres clés (prochain envoi, dernier envoi, dépenses sans pièce) ; le réglage à gauche et l'historique des envois à droite.
- **Mon équipe** : jauge des places de la formule, membres avec leurs initiales et leur état en pastille, invitation à droite.
- **Disponibilités** : carte d'état teintée selon le statut, titres de rubrique de niveau 2.
- **Mon grade** : carte du niveau sur fond bleu nuit.
- **Cartes de visite** : la planche à gauche ; « Imprimer » et « Ou montrez-la à l'écran » à droite. L'impression reste identique.
- **Charte qualité** : cases cochées en bleu nuit.
- **Accès suspendu** : page centrée, avec le cadenas, l'explication, le contact et la déconnexion.
- **Application** : même modèle sur ces écrans, sans achat ni formule (règle 10).

## Conséquences
- Mêmes briques que les lots précédents (`SheetPage`, `SheetHeader`, `SheetChip`, `MoneyFigures`, `sheetCard`).
- « Dépenses sans pièce » compte les dépenses dont `document_path` est vide.
- Écarts assumés : l'assistant garde ses réponses et ses limites actuelles, et il n'y a pas de nouveau moteur de recherche dans l'aide.
