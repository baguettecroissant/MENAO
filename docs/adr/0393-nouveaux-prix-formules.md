# ADR 0393 — Nouveaux prix des formules : Premium 350 €, Ultimate 950 €

- Statut : accepté (plaquette des commerciaux mise à jour par l'utilisateur le 27/11/2026,
  « les formules / tarifs ont changé » ; choix du même jour : paiement à l'année gardé, accroches de
  la plaquette corrigées, 110 € toujours dus à la validation du dossier)
- Fonctionnalité : F-193. Modifie l'ADR 0200 (offres et formules) et l'ADR 0385 (Ultimate).

## Décision

- **Prix HT par mois** : Base 150 € (inchangé), Premium 350 € (au lieu de 500 €), Ultimate 950 €
  (au lieu de 1 500 €). Migration sur `plans.prix_mensuel_ht_centimes` : le site, l'application,
  l'assistant et le paiement lisent ces prix en base.
- **À l'année** : toujours 12 mois au prix de 10, soit 1 500 €, 3 500 € et 9 500 € HT par an
  (125 €, 292 € et 792 € par mois). Les prix Stripe sont recréés par `pnpm stripe:setup` (la clé
  de recherche passe au nouveau prix) ; les abonnements déjà souscrits gardent leur prix.
- **Accroches** reprises de la plaquette, chevauchement corrigé (« 0 à 10 salariés » et « plus de 8
  salariés ») : « Accessible à toutes les entreprises », « Pour les auto-entrepreneurs et les
  entreprises jusqu'à 10 salariés », « Pour les entreprises de plus de 10 salariés ».
- **Primes des commerciaux inchangées** (110 € à la validation, puis 30, 100 ou 200 €) ; seuls les
  libellés « Offre 350 € / 950 € » du back-office changent.
- Textes écrits en dur mis à jour : guide des commerciaux, CGV artisans, FAQ de /pro, libellés du
  back-office, test de bout en bout du calculateur (Premium : 1 chantier tous les 3 mois).

## Conséquences

- CGV artisans (version provisoire) : nouveaux prix à signaler à l'avocat.
- Prix Stripe de production à recréer au branchement de la production (même script, `--live oui`).
- Plaquettes (hors dépôt) régénérées ; contrat d'agent commercial (annexes 1 et 5) mis à jour.
