# ADR 0258 — Comptes communs repensés (refonte « Nette », lot 13)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0257. Lot 13 maquetté (ordinateur, téléphone, application) et validé le 8 novembre, avec le passage aux polices Inter demandé par l'utilisateur.

## Décision
- **Connexion, inscription, mot de passe oublié, nouveau mot de passe, vérification de l'e-mail, finalisation du compte** : polices Inter (`appTheme`) par une mise en page commune `(site)/(auth)` ; `finaliser-compte` et `nouveau-mot-de-passe` y sont rangées (mêmes adresses). Dans le thème « Nette », `PageShell` réunit le titre et le formulaire dans une seule grande carte centrée.
- **Mon compte** : grand titre ; en grand écran, les rubriques à gauche (liens vers chaque carte, « Supprimer mon compte » en rouge) et les cartes à droite.
- **Notifications** : « Aujourd'hui » puis « Plus tôt » (`notificationGroups`, @menao/core, au jour de Paris), point bleu et titre en gras pour les non lues, préférences d'e-mails à droite.
- **Mes échanges avec MENAO** : une liste en carte, type et état en pastilles, « Écrire à l'équipe MENAO » en bouton principal.
- **Un échange / un signalement** : pastilles du type et de l'état, grand titre ; pour un signalement, la description et le fil à gauche, le chantier à droite. Dans le fil, mes messages en bulles bleu nuit à droite, ceux de l'autre partie à gauche (`TicketThread`, prop `mine` : l'équipe MENAO dans le back-office).
- **Application** : même modèle sur la connexion, l'inscription, Mon compte, les notifications et les échanges.

## Conséquences
- Écarts assumés :
  - pas de bouton « Tout marquer comme lu » : la page marque déjà tout comme lu à l'ouverture ;
  - pas d'icône par type de notification (le type n'est pas transmis) ;
  - pas de filtres dans Mes échanges ;
  - pas de bandeau « litige » dans le résumé d'un signalement (le texte existant parle au futur, avant l'envoi).
