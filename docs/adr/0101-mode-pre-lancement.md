# ADR 0101 — Mode pré-lancement : page d'attente et code des testeurs

- Statut : accepté
- Date : 15 octobre 2026

## Contexte
- **Exposition** : avec le domaine `menao.fr` (ADR 0100), le site devient facile à trouver, alors que :
  - il tourne sur les données de staging, avec des artisans de démonstration ;
  - Stripe et DocuSeal sont en mode test ;
  - les textes légaux sont des brouillons (`TODO(legal)`).
- **Risque** : un vrai visiteur pourrait créer un compte et envoyer une demande à un artisan fictif.
- **Choix de l'utilisateur (15 octobre 2026)** : une page d'attente pour le public, et le vrai site pour les testeurs grâce à un code d'accès.
- **Contraintes** :
  - la protection par mot de passe de Vercel est payante ;
  - le proxy ne tourne que sur les routes à session (spec §4.4 : les pages publiques ne déclenchent aucune fonction) ;
  - le code doit rester déployable sur Cloudflare via OpenNext.

## Décision
- **Activation** : par la variable `PRELAUNCH_ACCESS_CODE`, lue au build. Sans elle, rien ne change, et `/bientot` répond 404.
- **Filtre** : des réécritures `beforeFiles` de `next.config` (`lib/site/prelaunch.ts`) servent `/bientot` à toute adresse quand le cookie `menao_acces` manque ou n'a pas la bonne valeur. La règle est évaluée par le routage, sans fonction et sans rendre les pages dynamiques ; OpenNext la gère aussi.
- **Toujours servis** :
  - la page d'attente, les fichiers statiques et les icônes ;
  - `robots.txt` ;
  - les flux d'agenda `/calendrier/…`, lus par les calendriers sans cookie (protégés par leur jeton) ;
  - `/.well-known/…`, pour les vérifications de domaine et les liens universels à venir.
- **Code** :
  - le formulaire de la page appelle une Server Action. Elle compare les empreintes en temps constant, ralentit les erreurs, pose le cookie (empreinte SHA-256 du code, `HttpOnly`, 30 jours) et rouvre l'adresse demandée, que la réécriture a conservée ;
  - changer le code invalide les accès déjà donnés.
- **Page d'attente** :
  - présentation courte, sans chiffre inventé (F-01) ;
  - lancement dans les Alpes-Maritimes ;
  - vidéo de l'Espace Pro (ADR 0099) ;
  - contact `contact@menao.fr` ;
  - jamais indexée.
- **Mentions légales** : `TODO(legal)`, l'identité de l'éditeur doit aussi y figurer dès qu'elle est connue.

## Conséquences
- **Testeurs** : ils saisissent le code une fois par navigateur. Un lien d'e-mail ouvert dans un autre navigateur (celui du téléphone, par exemple) passe d'abord par la page d'attente, puis rouvre le lien après la saisie du code.
- **Webhooks** : Stripe et DocuSeal appellent les Edge Functions de Supabase, pas le site, donc ils ne sont pas concernés.
- **Lancement** : supprimer `PRELAUNCH_ACCESS_CODE` dans Vercel, puis redéployer.
- **Choix du code** : il doit être long (plusieurs mots), car il n'y a pas de limite de débit au-delà du ralentissement.
