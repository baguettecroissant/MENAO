# ADR 0256 — Écrans restants de l'espace client repensés (refonte « Nette », lot 11)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0255 (espace client : ADR 0251). Lot 11 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Parcours en étapes** : une barre d'étapes commune (`ClientSteps`) avec pastilles numérotées ou cochées. Elle sert pour la signature puis l'acompte, et pour les réserves, le PV, le solde puis l'avis. Elle est posée dans une mise en page commune (`ClientFlowPage`) : retour, grand titre, phrase, contenu à gauche, résumé ou paiement à droite.
- **Signature du devis** : le devis à gauche (numéro, total en grand, échéancier, dates, PDF) ; les cases à cocher et « Signer le devis » à droite.
- **Paiement de l'acompte / du solde** : l'échéancier ou le récapitulatif du chantier à gauche. À droite, une carte de paiement : montant en grand, bénéficiaire, moyens, bouton « Payer », paiement sécurisé par Stripe.
- **Réception des travaux** : les étapes, puis les réserves et le PV en cartes. Les cases de consentement passent en bleu nuit.
- **Votre avis** : les étapes, un titre plus grand. Le rapport qualité/prix choisi est bordé de bleu nuit, et les curseurs passent en vert.
- **Mes documents** : un grand titre et des chiffres (devis signés, factures, PV). Une carte par chantier avec son nombre de documents, et une pastille par type (Devis, Facture, PV). Les documents de la fiche chantier prennent la même forme de liste.
- **Messages** : mêmes deux colonnes que l'espace pro (liste à gauche, conversation à droite en grand écran).
- **Inviter un artisan** : le formulaire à gauche, « Vos invitations » à droite.
- **Application** : même modèle sur ces écrans.

## Conséquences
- `ProMessagesLayout` sert aussi au particulier (`base`, `subtitle`) ; l'ancien `ConversationShell` est retiré.
- Écarts assumés :
  - pas d'aperçu du devis intégré à la page de signature (le PDF s'ouvre à part) ;
  - pas de choix « Tout est conforme / Points à corriger » ajouté à la réception, qui garde son parcours actuel ;
  - pas d'encadré « Comment ça se passe » à côté de la réception ;
  - pas de recherche dans Mes documents.
