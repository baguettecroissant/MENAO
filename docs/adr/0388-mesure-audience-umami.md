# ADR 0388 — Mesure d'audience avec Umami

- Statut : accepté (23 novembre 2026)
- Fonctionnalité : F-189

## Contexte

Le site public est ouvert depuis le 23 novembre 2026 (ADR 0387). Les dirigeants veulent savoir
quelles pages sont vues, d'où viennent les visiteurs et ce qu'ils font, avec l'outil Umami Cloud
(compte de l'entreprise, région UE). Règle 11 : aucune donnée personnelle dans les outils de mesure.

## Décision

- Script Umami Cloud chargé par `SiteAnalytics` dans les mises en page publiques seulement : site
  vitrine `(site)`, saisie de la demande, pages de campagne et inscription artisan de l'Espace Pro.
  Jamais dans les espaces privés (client, artisan, back-office).
- Production de menao.fr uniquement (`VERCEL_ENV` + adresse du site) et `data-domains` limité à
  menao.fr ; ni aperçus, ni staging, ni tests.
- Respect de la vie privée : pas de cookie ni de stockage, « ne pas suivre » respecté
  (`data-do-not-track`), paramètres et ancres d'adresse retirés (`data-exclude-search`,
  `data-exclude-hash`), adresses à jeton personnel jamais envoyées (`data-before-send` :
  demande préparée, espace partenaire).
- Politique de sécurité : `cloud.umami.is` et `api-gateway.umami.dev` autorisés (scripts et
  connexions).
- L'identifiant du site est écrit dans le code (`lib/site/analytics.ts`) : il n'est pas secret et le
  compte Vercel n'est pas accessible depuis le poste de développement.
- Umami ajouté aux prestataires de la politique de confidentialité et à la page cookies.

## Conséquences

- Aucun bandeau de consentement n'est ajouté : mesure sans cookie, à faire confirmer par l'avocat
  (TODO(legal) dans la page cookies).
- Les événements (clics sur « Demander un devis », inscription…) pourront s'ajouter plus tard avec
  les attributs `data-umami-event`.
