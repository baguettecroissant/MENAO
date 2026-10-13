# ADR 0067 — Application, espace artisan : préparation et envoi du devis (lot 6c, partie 3)

- Statut : accepté
- Date : 13 octobre 2026

## Contexte
- Après le rendez-vous, l'artisan prépare son devis (F-19), le vérifie (F-20) puis l'envoie (F-21). Jusqu'ici, l'application annonçait seulement que ce parcours arrivait.
- Sur le site, l'éditeur s'appuie sur des règles partagées :
  - `@menao/core` : calcul des lignes et des totaux, taux de TVA autorisés, unités, échéancier, date de début ;
  - `@menao/validation` : contrôle des lignes et de l'envoi.

## Décision
- **Éditeur** (`/pro-chantier/[id]/devis`), comme sur le site :
  - lignes typées (matériel, main d'œuvre, autre), ajoutées et modifiées dans l'écran ;
  - désignation avec le catalogue personnel (`artisan_previous_lines`), description, quantité, unité, prix HT, TVA selon le régime de l'artisan, totaux en direct ;
  - mêmes contrôles que le site (`quoteLineFormSchema`) ;
  - statut d'enregistrement, « Enregistrer » (`artisan_save_quote_draft`, totaux recalculés en base) ;
  - confirmation avant de quitter avec des modifications non enregistrées.
- **Dictée intelligente** : le texte de la dictée, saisi avec le micro du clavier du téléphone (ou écrit), devient des lignes proposées par `quote-from-voice`, comme sur le site. Elles sont signalées « À vérifier ». Aucun module d'enregistrement audio n'est ajouté.
- **Aperçu** (`…/devis/apercu`) : le brouillon tel qu'il sera envoyé, à partir du même modèle que le PDF, et son PDF.
- **Envoi** (`…/devis/envoi`), comme sur le site :
  - échéancier par défaut ou personnalisé, avec les montants calculés (`paymentSchedule`) ; « En faire mon échéancier par défaut » ;
  - date de début (à partir du lendemain, `quoteStartDateError`) et durée ;
  - rattachement au chantier : client et rappel du chantier ;
  - assurance décennale manquante signalée, sans lien vers le site (règle 10) ; la base refuse aussi l'envoi ;
  - `artisan_send_quote` attribue le numéro et fige le devis, puis le PDF envoyé est produit (`generate-pdf`), comme sur le site ;
  - retour à la vue du chantier, avec la confirmation.
- **Vue du rendez-vous** : « Créer un devis », « Reprendre le devis » ou « Modifier le devis » selon l'état, comme sur le site.
- Aucun changement côté serveur.

## Points à valider
- TODO(legal) inchangé : conditions des taux réduits de TVA, à faire valider par l'expert-comptable (même mention que le site).

## Conséquences
- **Partie 4** : suivi du chantier côté artisan, après l'acompte (confirmation du démarrage, nouvelles et photos, fin des travaux, levée des réserves), puis l'agenda. Les photos demanderont un module de choix des photos.
