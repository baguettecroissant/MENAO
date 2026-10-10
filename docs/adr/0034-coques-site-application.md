# ADR 0034 — Coques du site, de l'application et du back-office

- Statut : accepté
- Date : 10 octobre 2026

## Contexte
- Une seule mise en page racine affichait l'en-tête et le pied de page du site vitrine sur toutes les pages, y compris l'espace client, les notifications, le suivi d'un signalement, l'onboarding artisan et le back-office.
  - Le logo menait à l'accueil du site et le pied de page marketing apparaissait dans l'application.
  - L'espace pro masquait l'en-tête du site, mais gardait son pied de page.
- **Maquettes** :
  - « Mes chantiers - Desktop » : l'application client a son propre en-tête (logo, champ « Rechercher un devis, une facture ou décrivez un besoin », messages, notifications, compte), sans pied de page ;
  - « Mes chantiers - Mobile » : un en-tête réduit et une barre d'onglets, avec un bouton central de recherche.
- Le porteur du projet a comparé avec une application séparée sur son propre sous-domaine (`app.<domaine>`).

## Décision
Choix du porteur du projet (10 octobre 2026) : coques séparées dès maintenant, sur le même domaine ; sous-domaines plus tard, par configuration.

- **Groupes de routes** (adresses inchangées) :
  - `(site)` : accueil, pages métiers et villes, pages légales, contact, connexion et inscription, présentation de l'Espace Pro ; en-tête et pied de page du site ;
  - `recherche` : parcours de demande, avec l'en-tête du site (maquette « Dernière étape avant de découvrir vos artisans ») et sans pied de page ;
  - `mon-espace` : application client ;
  - `pro/(espace)` : application artisan ; `pro/onboarding` : inscription de l'artisan avec son propre en-tête ;
  - `(compte)` : notifications et suivi d'un signalement, dans la coque client ou artisan selon le rôle ;
  - `admin` : back-office avec son propre en-tête.
- **Coque de l'application client** :
  - en-tête : logo vers « Mes chantiers », champ « Décrivez votre besoin de travaux » vers la recherche, messages (non lus), cloche, menu du compte (nom, type de compte, liens de l'espace, déconnexion) ;
  - barre d'onglets mobile sur les écrans principaux : Chantiers, Documents, bouton central « Démarrer un chantier », Messages, Aide ;
  - nouvelle page « Mes documents » : devis, factures et PV de tous les chantiers.
  - Le rôle et la déconnexion quittent la page « Mes chantiers » pour le menu du compte ; le lien « Messages » passe dans l'en-tête.
- **Aucune coque applicative n'affiche le pied de page du site.**

## Passage aux sous-domaines (plus tard)
À faire quand le domaine de production sera branché : `menao.fr` pour le site, `app.menao.fr` pour l'application, `admin.menao.fr` pour le back-office.
- Ajouter les domaines au projet Vercel (DNS Cloudflare).
- Ajouter dans `proxy.ts` des règles d'hôte : chaque préfixe sert son hôte et les autres redirigent. `/pro` reste sur le site (présentation), et `/pro/tableau-de-bord` passe sur l'application.
- Poser les cookies de session Supabase sur `.menao.fr`, pour que le site connaisse la session (cloche, « Mon espace »).
- Mettre à jour :
  - les URL de redirection de Supabase Auth ;
  - `SITE_URLS` (retours Stripe et DocuSeal) ;
  - `NEXT_PUBLIC_SITE_URL` et l'adresse des liens d'e-mails vers l'application.
- Ne pas indexer `app.` ni `admin.`.

## Conséquences
- e2e : la déconnexion d'un client passe par le menu du compte.
- La recherche par devis ou facture annoncée par le champ de la maquette n'existe pas encore : le champ mène à « Décrivez votre besoin ».
