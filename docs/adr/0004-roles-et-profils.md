# ADR 0004 — Rôles, profils et inscription

- Statut : accepté
- Date : 9 octobre 2026

## Contexte
La spec (§3) impose le rôle dans `auth.users.app_metadata.role`, modifiable uniquement côté serveur, et liste aussi un champ `role` dans `profiles` (§14).

## Décision
- **Source de vérité : `app_metadata.role`.** Enum SQL `public.app_role`. Un trigger `BEFORE INSERT` sur `auth.users` fixe `particulier` par défaut et refuse un rôle inconnu. `signUp()` côté client n'écrit que dans `user_metadata` : impossible de s'attribuer un rôle.
- **`profiles.role` est une copie en lecture seule**, synchronisée par trigger quand `app_metadata` change, utile pour les listes du back-office. Les privilèges de colonnes interdisent sa modification par `authenticated` (même admin) : un changement de rôle passe par le serveur (clé `service_role`) sur `app_metadata`.
- **Politiques RLS** fondées sur `app.jwt_role()` (lecture du JWT), `app.is_admin()`, `app.is_staff()` (admin + support), dans un schéma `app` non exposé par l'API.
- **Inscription** : les données du formulaire (prénom, nom, téléphone, consentement marketing, versions des documents légaux acceptés) transitent par `user_metadata`. Un trigger `AFTER INSERT` crée le profil et les lignes de `legal_acceptances`, puis retire téléphone, consentement et acceptations de `user_metadata` (ils ne restent pas dans le JWT).
- **Lien magique** : connexion uniquement (`shouldCreateUser: false`), l'inscription exigeant l'acceptation des CGU.

## Conséquences
- Après un changement de rôle, le JWT de l'utilisateur reflète le nouveau rôle au prochain rafraîchissement de session.
- L'adresse IP n'est pas enregistrée dans `legal_acceptances` à l'inscription (l'utilisateur n'a pas encore de session) ; elle figure dans le journal d'audit de Supabase Auth. TODO(legal) : confirmer que cela suffit comme preuve.
- Un client appelant directement l'API Auth sans passer par le formulaire peut créer un compte sans acceptation enregistrée. À traiter avant le pilote (vérification des acceptations à jour lors de l'accès aux fonctionnalités).
