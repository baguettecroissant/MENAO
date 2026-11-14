# ADR 0315 — Écrans artisan restés hors de la refonte « Nette » (lot 46)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-151 (maquette lot 46 validée) ; suite de l'audit du 14/11/2026

## Contexte

L'audit des écrans du 14/11/2026 a trouvé des écrans de l'espace artisan jamais maquettés.
Décisions de l'utilisateur : pas de refonte de la page d'attente `/bientot`, ni de la charte d'un
artisan déjà inscrit (et de l'écran « charte signée »). Le lot 46 couvre les quatre autres.

## Décision

- **Secrétaire non incluse** (`/pro/secretaire` en Base) : deux colonnes, ce qu'elle fait en trois
  points et « Voir les formules » (patron) ou « Votre patron peut l'activer » ; à droite, un
  exemple d'appel qui se termine par un rendez-vous pris.
- **Ma formule, abonné** : la formule et son statut en tête (statut, paiement mensuel ou annuel,
  « Gérer mon abonnement »), les agents IA en pastilles et les rappels SMS en interrupteurs à
  gauche ; à droite, les minutes de voix et la recharge, les derniers appels et la secrétaire.
  `AiAgentsCard` est découpée en `AiAgentsCard`, `VoiceMinutesCard`, `RecentCallsCard` et
  `SecretaryLinkCard`. Le titre garde son nom accessible « Votre abonnement : Base ».
- **Aperçu du devis** : en-tête large, le papier en grand à gauche, à droite « Votre devis est
  prêt ! », le récapitulatif (client, lignes, totaux), « Voir le PDF » et « Continuer vers
  l'envoi » ; la barre collante du bas disparaît.
- **Accueil d'un ouvrier** : ses chantiers à gauche, ses prochains rendez-vous à droite.
- Aucune règle ni donnée changée ; tests de bout en bout adaptés au nouveau libellé du bouton.
