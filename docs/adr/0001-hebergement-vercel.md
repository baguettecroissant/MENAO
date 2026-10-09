# ADR 0001 — Hébergement web : Next.js sur Vercel

- Statut : accepté
- Date : 9 octobre 2026

## Contexte
MENAO a besoin d'un site public très bien référencé (pages métier × ville) et d'espaces connectés riches (particulier, artisan, admin). Options étudiées : Next.js sur Vercel, Next.js sur Cloudflare (OpenNext), Astro (site public) + application React (espaces connectés) sur Cloudflare.

## Décision
Next.js (App Router) hébergé sur **Vercel** pour la V1, avec les règles de maîtrise des coûts et de portabilité de la spécification (§4.4). Domaine et DNS chez Cloudflare.

## Raisons
- Un seul projet web pour le site public, les espaces connectés et l'admin : le moins de complexité au démarrage.
- Outil le mieux maîtrisé par Claude Code et par les développeurs à recruter ; aperçus automatiques par PR.
- Écart de coût négligeable au regard du chiffre d'affaires (quelques dizaines de dollars par mois au pilote).
- La scalabilité dépend surtout de Supabase et de la qualité du code, pas de l'hébergeur.

## Conséquences
- Plafond de dépenses obligatoire, pas d'optimisation d'images Vercel, pages publiques en cache, aucun service propriétaire Vercel.
- Migration possible vers Cloudflare (OpenNext) si la facture devient significative.

## Alternatives écartées
- **Astro + React sur Cloudflare** : moins cher, mais deux projets web et une connexion partagée entre domaines à gérer dès le départ.
- **Next.js sur Cloudflare dès le départ** : adaptateur OpenNext, davantage de réglages et de cas particuliers.
