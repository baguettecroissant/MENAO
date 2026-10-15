# ADR 0100 — Domaine menao.fr

- Statut : accepté
- Date : 15 octobre 2026

## Contexte
- **Achat** : l'utilisateur a acheté `menao.fr` chez OVH le 15 octobre 2026. Jusque-là, le site tournait sur `menao-web.vercel.app`.
- **E-mails bloqués** : sans domaine, Resend n'écrit qu'au titulaire du compte. Le service d'e-mail par défaut de Supabase n'écrit qu'aux membres de l'équipe, et seulement 2 e-mails par heure. Le test réel de A à Z avec plusieurs comptes était donc impossible.
- **Spec** : DNS chez Cloudflare (§4), e-mails par Resend, y compris ceux de l'authentification par SMTP (ADR 0002).

## Décision
- **DNS** : le domaine reste enregistré chez OVH (Cloudflare ne vend pas le .fr). Ses serveurs DNS passent chez Cloudflare (offre gratuite). Les enregistrements de Vercel et de Resend restent en « DNS only », sans le proxy de Cloudflare.
- **Site** : `menao.fr` est le domaine principal du projet Vercel, et `www.menao.fr` y redirige. `NEXT_PUBLIC_SITE_URL` vaut `https://menao.fr`. L'ancienne adresse `menao-web.vercel.app` est redirigée (308) vers le domaine dès que cette variable le désigne. Les déploiements de prévisualisation gardent leur adresse.
- **Données** : en attendant le pilote, `menao.fr` reste branché sur Supabase staging, avec le référencement fermé (`ALLOW_INDEXING`). Au passage en production (phase 8), il pointera vers le projet de production, et staging passera sur `staging.menao.fr`.
- **E-mails** :
  - domaine `menao.fr` vérifié chez Resend, en région UE (Irlande) ;
  - expéditeur `MENAO <notifications@menao.fr>` pour les notifications (valeur par défaut de `notify`, surchargeable par `EMAIL_FROM`) ;
  - même expéditeur pour l'authentification, par le SMTP de Resend ;
  - enregistrement DMARC en `p=none` pour commencer.
- **Réception** : `contact@` et `support@menao.fr` sont transférées vers la boîte de l'équipe par Cloudflare Email Routing (gratuit).
- **Authentification** : `scripts/supabase-auth.mjs` applique à un projet hébergé :
  - l'adresse du site et les adresses de retour autorisées ;
  - les objets et modèles français de `supabase/config.toml` (les mêmes qu'en local) ;
  - le SMTP de Resend.
  
  Les modèles reprennent la mise en page des notifications : bandeau bleu clair avec le logo servi par le site, bouton centré. Le script refuse le projet de production sans `--production oui`.
- **Edge Functions** : `SITE_URLS` commence par `https://menao.fr`. La première adresse sert aux liens des e-mails et aux retours de Stripe et de DocuSeal ; les autres restent autorisées.

## Ordre de mise en service
1. Zone Cloudflare, puis serveurs DNS chez OVH (DNSSEC désactivé chez OVH avant le changement).
2. Domaine ajouté dans Vercel, enregistrements créés chez Cloudflare, certificat émis.
3. `NEXT_PUBLIC_SITE_URL=https://menao.fr` dans Vercel, puis redéploiement.
4. Domaine vérifié chez Resend.
5. Sur staging :
   - secret `SITE_URLS` mis à jour ;
   - `scripts/supabase-auth.mjs --smtp oui` lancé ;
   - `notify` redéployée (nouvel expéditeur).
6. Essai : inscription, réinitialisation du mot de passe et notification reçues sur une adresse extérieure.

## Conséquences
- **Test de A à Z** : il devient possible avec de vrais comptes.
- **Quota Resend** : l'offre gratuite permet 100 e-mails par jour et 3 000 par mois. Il faudra passer à l'offre payante avant le pilote si le volume l'exige.
- **Application** : `EXPO_PUBLIC_SITE_URL` passe à `https://menao.fr`, dans le fichier local et les profils EAS. Les liens universels (`apple-app-site-association`, `assetlinks.json`) viendront avec les comptes des stores.
- **Hors périmètre** :
  - Brevo (SMS, marketing) : domaine à authentifier quand le compte sera ouvert ;
  - Google Search Console : vérification DNS au moment d'ouvrir le référencement.
