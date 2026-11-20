# ADR 0384 — Stripe expliqué aux artisans : encart et mémo « Stripe en 1 minute »

- Statut : accepté (maquette du lot 80 validée par l'utilisateur le 20/11/2026, « ok ça marche »)
- Fonctionnalité : F-185. Complète l'ADR 0378 (avant Stripe : ce qui est transmis et demandé).

## Contexte

Les artisans ne connaissent pas Stripe : à l'étape « Vos paiements », ils ne savent ni qui c'est,
ni pourquoi il demande une pièce d'identité et un code par SMS, ni si MENAO touche leur argent.

## Décision

- **Encart « Stripe, c'est quoi ? »** en tête de l'étape tant que les paiements ne sont pas actifs :
  une image simple (« comme le terminal de carte d'un magasin ») et un lien « Comprendre en 1 minute ».
  Paiements actifs : lien discret sous « Comment vous êtes payé ».
- **Mémo « Stripe en 1 minute »** (`components/pro/stripe-explainer.tsx`) : 7 questions (qui est
  Stripe, à quoi ça sert, MENAO et l'argent, pièce d'identité, code SMS, frais, délai des
  virements), en panneau à droite sur ordinateur (`Drawer` avec `side`) et en volet du bas sur
  téléphone. Le « i » à côté de « Protéger votre compte par SMS » l'ouvre sur la bonne question.
- **Faits relus** sur les pages de Stripe le 20/11/2026 : agrément de la Banque centrale d'Irlande ;
  fonds disponibles environ 3 jours ouvrés après un paiement en France, premier virement sous 7 à
  14 jours. Aucun montant de frais écrit en dur (lien vers les tarifs publics de Stripe), aucun
  logo Stripe reproduit, aucun jargon (« Connect », « KYC »).

## Conséquences

- Le même texte pourra servir au mémo A4 des commerciaux et à l'application (écran des paiements,
  PR suivante).
