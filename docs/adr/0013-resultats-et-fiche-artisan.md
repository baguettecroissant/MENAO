# ADR 0013 — Résultats de recherche, fiche artisan publique, dossiers envoyés à MENAO

- Statut : accepté
- Date : 9 octobre 2026

## Contexte
F-09 et F-10 : proposer au particulier les artisans qui peuvent réaliser son projet, puis leur fiche. La spec prévoit une fonction `match_artisans(project_id)` et une vue `artisans_public`. Décision D (phase 2) : aucune mise en avant payante.

## Décisions
- **`match_artisans(projet, limite)`** (SQL, `SECURITY DEFINER`, propriétaire du projet ou équipe) :
  - artisans visibles (`app.artisan_is_visible` : validés, abonnés, paiements actifs), non en pause, exerçant le métier du projet ;
  - zone : commune du chantier parmi les communes de l'artisan, ou point du chantier (adresse exacte, sinon point de la commune, nouvelle colonne `projects.ville_location`) à moins de `radius_km` de sa base ;
  - tri : disponibilité (immédiate, puis date), distance, puis `md5(projet || artisan)`, ordre stable pour un projet et équitable entre ex æquo. Le score MENAO passera en tête quand les avis existeront ;
  - 5 résultats (`MAX_SEARCH_RESULTS`).
- **Fiche publique : fonction `artisan_public_profile(id)`** plutôt qu'une vue `SECURITY DEFINER`, que l'analyseur de sécurité de Supabase signale. Champs non sensibles uniquement : prénom (sinon nom commercial), entreprise, photo, expérience, présentation, métiers, travaux, zone (commune de base extraite du libellé BAN, **jamais l'adresse**), décennale vérifiée (date, assureur), certifications vérifiées et valides, photos de chantier. Jamais de téléphone, d'e-mail, de SIRET ni d'adresse. Lisible sans session (pages publiques et SEO en 2d).
- **Disponibilité** : `artisans.paused` (exclu des résultats) et `available_from` (badge « Dispo immédiate » sinon « Disponible à partir du … »), réglées par l'artisan (`set_artisan_availability`).
- **Tickets (début de F-56)** : table `tickets` ; `send_project_to_menao` crée un dossier par projet (pas de doublon tant qu'il est ouvert), échéance à 7 jours. Une session anonyme n'a pas d'e-mail de compte : le particulier en indique un. Suivi dans le back-office (`/admin/tickets`) ; statut changé par l'équipe (`staff_set_ticket_status`).
- **Critères de classement** : page `/criteres-de-classement` publiée dès le premier classement (obligation d'information des plateformes), `TODO(legal)`.

## Conséquences
- `save_project_criteria` prend deux paramètres de plus (point de la commune) ; le point est conservé si la ville ne change pas.
- La fiche affiche « Envoyer une demande » désactivé jusqu'à la phase 2c (demande à 1 à 3 artisans).
- Temps de réponse moyen et score MENAO : affichés quand les demandes (2c) et les avis existeront.
- Notifications à l'équipe pour un nouveau dossier : avec `NotificationProvider` (Resend), plus tard.
