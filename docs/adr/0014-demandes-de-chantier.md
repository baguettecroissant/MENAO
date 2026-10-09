# ADR 0014 — Demandes de chantier : compte au moment de la demande, 1 à 3 artisans, 48 h

- Statut : accepté (décisions des fondateurs du 9 octobre 2026 : 3 artisans ; B et C de la phase 2)
- Date : 9 octobre 2026

## Contexte
F-08, F-11, F-17. Le projet est créé en session anonyme (ADR 0012) ; le compte est demandé à l'envoi (décision B, `REQUIRE_ACCOUNT_BEFORE_RESULTS=false`), avec e-mail vérifié. La demande part vers 3 artisans au plus (« 3 devis en 72 h », écart assumé avec D2 de la spec). Les coordonnées ne circulent qu'après acceptation (décision C, D3 de la spec).

## Décisions
- **Transfert du projet plutôt que conversion de l'utilisateur anonyme.** Inscription ou connexion créent (ou retrouvent) un compte normal ; le projet lui est rattaché par un jeton aléatoire à usage unique (24 h, empreinte SHA-256 en base, `create_project_transfer` puis `claim_project`). Une seule mécanique pour « je crée mon compte » et « j'ai déjà un compte », sans les particularités de la conversion anonyme (changement d'e-mail, mot de passe après vérification).
  - Connexion : transfert immédiat dans la même action serveur.
  - Inscription : le jeton voyage dans le lien de confirmation (`next=/recherche/…/envoyer?transfert=…`). Le modèle d'e-mail de confirmation utilise désormais `{{ .RedirectTo }}` : toute inscription passe un `emailRedirectTo` contenant `?next=` (`confirmUrlFor`).
- **`requests`** : une ligne par artisan ; `send_project_requests` vérifie le compte (particulier, e-mail confirmé), le projet (critères validés), 3 demandes actives au plus par projet (un refus ou une expiration libère une place), et l'éligibilité de chaque artisan via `match_artisans`. Le projet passe en `demande_envoyee` : critères et photos figés.
- **48 h** : `expires_at`, tâche pg_cron toutes les 15 minutes (`app.expire_requests`). Le particulier peut alors choisir un autre artisan.
- **Réponse de l'artisan** (`artisan_respond_request`) : accepter, ou refuser avec motif (planning complet, hors expertise, hors zone, autre + précision). « Fixer un rendez-vous » (F-18) remplacera l'acceptation simple en phase 3.
- **Confidentialité** : avant acceptation, l'artisan voit le prénom du client, la ville, le projet et les photos ; e-mails et numéros sont masqués dans la description et le message (`app.scrub_contacts`). Après acceptation : nom, téléphone, e-mail, adresse exacte et carte. Côté particulier, téléphone et e-mail de l'artisan après acceptation seulement. Lecture par fonctions dédiées (`particulier_requests`, `artisan_inbox`, `artisan_request_detail`).

## Conséquences
- Notifications (nouvelle demande, acceptation, relance avant expiration) : à brancher sur `NotificationProvider` quand Resend sera configuré ; en attendant, l'artisan voit ses demandes dans son espace.
- Les utilisateurs anonymes dont le projet a été transféré restent en base : à purger avec les sessions anonymes inactives.
- Sur staging (modèles d'e-mails par défaut de Supabase, flux PKCE), le lien de confirmation doit être ouvert dans le même navigateur.
