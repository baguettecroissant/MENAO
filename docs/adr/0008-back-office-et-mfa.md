# ADR 0008 — Back-office : double authentification et décisions des admins

- Statut : accepté (plan validé le 9 octobre 2026)
- Date : 9 octobre 2026

## Décisions
1. **Double authentification obligatoire pour les admins, imposée par la base** (spec §13). `app.is_admin()` n'est vrai que si le JWT porte `role = admin` dans `app_metadata` **et** `aal = aal2` (TOTP vérifié dans la session). Toutes les politiques RLS, les politiques Storage (documents) et les fonctions d'administration en dépendent : un jeton admin sans second facteur n'a aucun droit admin. L'interface (`/admin`) applique la même règle pour guider l'admin (activation par QR code, puis vérification à chaque session).
2. **Décisions par fonctions SQL** (`SECURITY DEFINER`, contrôle explicite) : `admin_review_document`, `admin_verify_certification`, `admin_decide_artisan`. Valider un dossier exige les 4 documents validés et en cours de validité et une entreprise active ; cela passe l'artisan en `valide` et son rôle en `artisan` (`app_metadata`). Refuser et demander un complément exigent un message ; le complément renvoie le dossier en brouillon avec le message affiché à l'artisan.
3. **Traçabilité** : `artisan_reviews` (historique, visible de l'artisan concerné) et `audit_logs` (toutes les actions admin, lecture seule pour les admins, écriture par les fonctions uniquement).
4. **Support exclu de la validation** : il ne voit pas les pièces d'identité ni les documents (spec F-43).
5. **F-51** (expirations, relances, suspension automatique, renouvellement) dans une PR séparée.

## Conséquences
- Créer un admin : passer `role` à `admin` dans `app_metadata` (SQL ou API d'administration, jamais depuis l'application) ; il devra activer son TOTP à la première connexion au back-office.
- Les e-mails de décision attendent Resend ; l'artisan voit son statut dans son espace.
- La validation ne rend pas encore l'artisan visible : abonnement actif et compte Stripe Connect requis (PR 3 et 4).
