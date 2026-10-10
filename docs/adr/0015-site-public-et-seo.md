# ADR 0015 — Site public, pages SEO métier × ville, pages statiques

- Statut : accepté
- Date : 9 octobre 2026

## Contexte
F-01 à F-03 et spec §4.4 (pages publiques pré-générées et en cache, pas de rendu par visite), §18 (LCP mobile < 2,5 s, pages SEO rendues côté serveur).

## Décisions
- **Communes pilotes** : table `communes` (15 communes des Alpes-Maritimes ; codes INSEE et centres issus de la Géoplateforme, pas de code postal car plusieurs par commune). Ajouter une commune = une ligne en base.
- **Pages `/[metier]` et `/[metier]/[ville]`** : générées au build (`generateStaticParams` : métiers actifs × communes pilotes), régénérées toutes les heures ; métier ou commune inconnus → 404. Artisans lus par `public_artisans_for_commune` (fonction publique : mêmes règles que `match_artisans`, avec le centre de la commune comme point du chantier ; aucune coordonnée). Données structurées : `Service`, `ItemList` de `LocalBusiness` (nom et zone, sans adresse), `BreadcrumbList` ; `FAQPage` sur la FAQ. URL canoniques sur toutes les pages publiques.
- **Indexation fermée par défaut** : `robots.txt` « Disallow: / » et balise `noindex` tant que `ALLOW_INDEXING` n'est pas `true` (à poser seulement sur la production). Staging et aperçus Vercel ne sont jamais indexés. Sitemap XML généré (métiers, métiers × communes, pages statiques).
- **Chiffres de l'accueil** : `public_stats()` (artisans visibles, métiers couverts), affichés seulement s'il y a au moins un artisan. Aucun chiffre inventé (F-01).
- **Catalogue mis en cache** (`unstable_cache`, 1 h) : l'en-tête, le pied de page et les pages SEO ne sollicitent pas la base à chaque visite.
- **Contact** : ticket `contact` sans compte (`send_contact_message` : 3 messages par adresse et par 24 h, garde-fou global de 100 par heure), traité dans le back-office avec les dossiers.
- **Cookies** : seuls les cookies indispensables (session Supabase) sont utilisés ; pas de bandeau tant qu'aucun cookie non indispensable n'est déposé. Il sera ajouté avec la mesure d'audience (PostHog), refus aussi simple que l'acceptation.
- **Pages légales** : mentions légales et politique cookies ajoutées en version provisoire ; informations de l'éditeur à compléter (`TODO(legal)`), rien d'inventé.

## Conséquences
- Avant le lancement : `ALLOW_INDEXING=true` sur la production uniquement, domaine définitif (`NEXT_PUBLIC_SITE_URL`), textes légaux validés.
- Fiches artisans publiques indexables (`/artisan/[id]`) : à envisager quand les profils seront plus riches (avis, photos).
