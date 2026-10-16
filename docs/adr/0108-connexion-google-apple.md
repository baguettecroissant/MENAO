# ADR 0108 — Connexion avec Google ou Apple pour les clients

- Statut : accepté (site et application mobile)
- Date : 16 octobre 2026

## Contexte
- **Spec** : « Connexion aussi par lien magique e-mail ; Apple/Google en V1.1 ».
- **Demande** (16 octobre 2026) : l'utilisateur avance Google et Apple avant l'ouverture au public, **pour les clients seulement**. Leur compte se crée en pleine demande de devis, l'étape où l'on perd le plus de monde.
- **Apple** : sur iPhone, une application qui propose Google doit aussi proposer « Se connecter avec Apple » (règle 4.8 de l'App Store). Les deux vont donc ensemble.
- **Inscription par e-mail** : le nom, le téléphone, les newsletters et l'acceptation des CGU et de la politique de confidentialité (avec leur version) passent par les métadonnées lues par `app.after_auth_user_insert`. Google et Apple ne fournissent rien de tout cela, sauf parfois le nom.

## Décision
- **Où** :
  - boutons « Continuer avec Google » et « Continuer avec Apple » sur la connexion, l'inscription client et l'étape compte de la demande de devis ;
  - pas sur l'inscription pro : les artisans gardent l'inscription par e-mail (SIRET et CGV, ADR 0006). Un artisan dont l'adresse est la même peut tout de même se connecter avec Google, car Supabase rattache le fournisseur au compte existant.
- **Flux** :
  - PKCE côté serveur : la Server Action redirige vers Supabase Auth, puis vers le fournisseur ;
  - retour sur `/auth/confirm` (échange du code), puis sur `next` ou l'accueil du rôle ;
  - dans la demande de devis, un jeton de transfert rattache le projet de la session anonyme, comme pour l'inscription par e-mail (ADR 0014).
- **Nouveau compte** :
  - compte particulier, avec le marqueur `signup_pending` dans `app_metadata` (règle 7 : lisible dans le jeton, jamais modifiable par l'utilisateur) ;
  - prénom et nom repris du fournisseur quand il les donne.
- **« Finaliser mon compte »** (`/finaliser-compte`) :
  - le client vérifie son nom, ajoute son téléphone s'il le souhaite, accepte les CGU et la politique de confidentialité, et choisit les newsletters, comme à l'inscription ;
  - `complete_oauth_signup()` enregistre ces choix et retire le marqueur, puis le jeton est rafraîchi ;
  - tant que ce n'est pas fait, le garde du site (`proxy.ts`) y ramène depuis les espaces protégés et la recherche.
- **Activation** : `NEXT_PUBLIC_OAUTH_PROVIDERS` (« google,apple »). Vide, aucun bouton : on l'active une fois les fournisseurs configurés dans Supabase.
- **CSP** : Supabase, `accounts.google.com` et `appleid.apple.com` sont ajoutés aux cibles des formulaires (redirections après l'envoi du bouton).
- **Application mobile** :
  - mêmes boutons sur la connexion, l'inscription et l'étape compte de la demande (jeton de transfert gardé, demande reprise après la connexion) ;
  - la page du fournisseur s'ouvre dans la fenêtre sécurisée du téléphone (`openAuthSessionAsync`, comme ADR 0060), et Supabase rouvre l'application (`menao://auth/callback`, ou l'adresse d'Expo Go en développement) avec la session ;
  - c'est le flux web de Supabase, donc aucun identifiant Google iOS ou Android, et pas de module natif : il marche dans Expo Go ;
  - même écran « Finaliser mon compte », et garde dans `app/_layout.tsx`, y compris à la réouverture de l'application ;
  - activation par `EXPO_PUBLIC_OAUTH_PROVIDERS`.

## Configuration (à faire par l'équipe, hors du dépôt)
- **Google Cloud** : identifiant OAuth de type « Application Web », avec l'adresse de retour `https://<projet>.supabase.co/auth/v1/callback`, et l'écran de consentement au nom de MENAO (domaine menao.fr). Il sert aussi à l'application.
- **Apple Developer** :
  - Services ID et clé « Sign in with Apple » ;
  - le secret client (un jeton signé) **expire au bout de 6 mois** et doit être renouvelé dans Supabase ;
  - déclarer menao.fr et `notifications@menao.fr` dans le service de relais des adresses masquées. Sinon, les e-mails envoyés aux adresses `@privaterelay.appleid.com` sont rejetés.
- **Supabase** (Auth > Providers) : activer Google et Apple, et coller les identifiants. Les secrets ne sont jamais dans le dépôt (règle 1).
- **Vercel** : `NEXT_PUBLIC_OAUTH_PROVIDERS=google,apple`, puis redéployer.
- **Adresses de retour de l'application** (`scripts/supabase-auth.mjs --app-urls`) : `menao://**`, plus `exp://**` sur staging pour Expo Go.
  - Supabase refuse une adresse de retour dont l'hôte est une adresse IP (`exp://192.168.…`, celle d'Expo Go par défaut) : il renvoie alors vers le site.
  - Pour essayer dans Expo Go, lancer Expo avec le nom local du Mac : `REACT_NATIVE_PACKAGER_HOSTNAME="$(scutil --get LocalHostName).local" pnpm --filter mobile start`.
- **Application** : `EXPO_PUBLIC_OAUTH_PROVIDERS` dans `.env` (et les variables d'EAS pour les builds).

## Conséquences
- **`TODO(legal)`** :
  - la politique de confidentialité doit citer Google et Apple comme fournisseurs d'identité (données reçues : nom, adresse e-mail) ;
  - faire valider l'acceptation des CGU à l'étape « Finaliser mon compte ».
- **Hors périmètre** : connexion des artisans par Google ou Apple à l'inscription, photo de profil du fournisseur.
