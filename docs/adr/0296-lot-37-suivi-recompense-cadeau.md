# ADR 0296 — Lot 37 : Suivi, récompense de niveau et cadeau de bienvenue repensés

- Statut : accepté (12/11/2026)
- Fonctionnalité : F-142 (refonte « Nette », écrans oubliés)

## Contexte

Le recensement du 12/11/2026 a montré que trois écrans artisan n'avaient jamais eu de maquette :
Argent › Suivi (agent comptable avancé, ADR 0237), la récompense de niveau (« Mon grade ») et le
cadeau de bienvenue du filleul (« Mon profil », ADR 0154). Le lot 37 les a maquettés (site sur
ordinateur et téléphone, application) et l'utilisateur l'a validé.

## Décision

- **Suivi** : les 4 chiffres du mois arrondis à l'euro, avec l'écart sur le mois précédent
  (flèche verte si c'est une bonne nouvelle, rouge sinon) ; « À encaisser » avec l'ancienneté en
  pastille, la frise des relances J+7 · J+15 · J+30 (min(relances, 3) points pleins) et la date du
  prochain rappel automatique ; à droite, les relances automatiques en interrupteur et « À
  vérifier ». Calculs dans `@menao/core` : `moneyMonthDeltas`, `lateOpenCount`,
  `nextAutoReminder`. L'affichage du site sort de la page (`MoneyOverviewView`) ; la liste
  s'adapte à sa propre largeur (requêtes de conteneur).
- **Récompense** : carte en grand en haut de « Mon grade » (illustration, tailles en pastilles,
  adresse de l'entreprise en résumé avec « Modifier l'adresse », téléphone).
- **Cadeau** : carte en haut de « Mon profil », deux grands choix illustrés (t-shirt, casquette),
  taille en pastilles, adresse en résumé ; après le choix, la frise Choisi → En préparation →
  Envoyé.
- Briques communes `gift-kit` (site et application) : pastilles de taille, tuiles de choix,
  résumé d'adresse, frise d'envoi, dessins du t-shirt et de la casquette.

## Conséquences

- Le suivi n'a pas le nom du client : seul le type de paiement est affiché sous le chantier.
- La frise compte les relances faites (manuelles ou automatiques), sans distinguer leur origine.
- Aucun changement de base ni de fonction.
