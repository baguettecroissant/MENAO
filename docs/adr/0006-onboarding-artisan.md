# ADR 0006 — Inscription et onboarding artisan (F-14, partie 1)

- Statut : accepté (choix A, B, C validés le 9 octobre 2026) ; inscription refaite en un seul parcours par l'ADR 0110
- Date : 9 octobre 2026

## Décisions

**A. Rôle à l'inscription.** Le formulaire pro envoie `account_type: "artisan"` dans `user_metadata`. Le trigger `app.before_auth_user_insert` en déduit le rôle stocké dans `app_metadata` : seules deux issues sont possibles, `particulier` (défaut) ou `artisan_en_attente`. `artisan` et les rôles d'équipe ne s'obtiennent jamais ainsi (testé en pgTAP). Le rôle reste dans `app_metadata` (CLAUDE.md règle 7) ; `user_metadata` n'exprime qu'une intention, nettoyée après création. Alternative écartée : création par la clé `service_role`, qui obligeait à envoyer nous-mêmes l'e-mail de confirmation.

**B. Vérification Sirene après confirmation de l'e-mail.** À l'inscription : format et clé de Luhn du SIRET (exception La Poste). L'appel à l'API Sirene se fait à l'étape « Entreprise », par l'Edge Function `sirene-check`, réservée à un artisan connecté et limitée à 10 vérifications par heure et par compte (quota INSEE de 30 requêtes/minute pour toute l'application). Les données INSEE (raison sociale, forme juridique, APE, adresse) ne sont écrites que par le serveur ; l'artisan ne saisit sa raison sociale qu'en cas de diffusion partielle (« [ND] »).

**C. Codes APE « bâtiment ».** Table `ape_codes_btp` (préfixes 41, 42, 43, 81.30Z), modifiable sans code. Un code hors liste donne `ape_eligible = false` : avertissement pour l'admin, pas de refus automatique ([À VALIDER] dans la spec).

## Choix techniques

- Écritures des étapes 2 et 3 par fonctions SQL `SECURITY DEFINER` (`set_artisan_trades`, `set_artisan_zone`) : atomiques, limitées à la fiche de l'appelant, sur des colonnes que l'artisan ne peut pas modifier directement. Garde-fou par trigger : SIRET verrouillé après envoi en vérification, données Sirene effacées si le SIRET change.
- L'Edge Function importe `packages/core/src/siret.ts` et `sirene.ts`, volontairement autonomes (aucun import : Deno exige les extensions). `deno.json` par fonction (`nodeModulesDir: none`) pour ne pas interférer avec le workspace pnpm. Déploiement avec `supabase functions deploy --use-api` (regroupement côté serveur, sans Docker). À confirmer au premier déploiement en staging.
- Limitation de débit générique en base (`rate_limits`, `consume_rate_limit`), réutilisable pour l'IA (F-06), sans service propriétaire Vercel (spec §4.4). Purge des fenêtres expirées à ajouter avec `pg_cron`.
- Adresses : géocodage de la Géoplateforme IGN (`data.geopf.fr/geocodage`, format BAN), appelé depuis le navigateur. L'ancienne URL `api-adresse.data.gouv.fr` répond encore, mais la Géoplateforme est l'adresse de référence.
- Tests : SIRET choisis valides **et absents de Sirene** (vérifié via l'API : 404). En e2e, un faux serveur Sirene remplace l'INSEE.

## Conséquences

- Les étapes 4 à 7 (documents, profil public, paiements, formule) sont affichées « bientôt disponibles ».
- L'API Sirene expose déjà `activitePrincipaleNAF25Etablissement` (NAF 2025) : à surveiller lors du passage à la nouvelle nomenclature (les divisions 41 à 43 restent la construction).
