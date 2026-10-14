# ADR 0083 — Application : gestion du compte, comme « Mon compte » sur le site

- Statut : accepté
- Date : 14 octobre 2026

## Contexte
- Sur le site, « Mon compte » (F-08, ADR 0039) permet de :
  - modifier ses informations (prénom, nom, téléphone) ;
  - changer d'adresse e-mail, avec une double confirmation ;
  - changer de mot de passe ;
  - choisir ses communications ;
  - télécharger ses données (RGPD) ;
  - demander la suppression du compte ;
  - se déconnecter de tous ses appareils.
- L'onglet « Compte » de l'application ne proposait que la suppression du compte (ADR 0080) et la déconnexion.
- L'export des données du site est une route Next.js (`/compte/donnees`) qui lit la session dans les cookies. L'application ne peut pas l'appeler avec sa propre session.

## Décision
- **Onglet « Compte »**, commun au particulier et à l'artisan, dans l'ordre du site :
  - carte d'identité (nom, adresse e-mail, rôle) ;
  - « Paramètres du compte » : trois lignes vers des écrans dédiés (« Mes informations », « Adresse e-mail », « Mot de passe ») ;
  - « Communications » : la case des actualités, enregistrée dès l'appui. Le choix est daté par la base ; en cas d'échec, la case revient en arrière. Un lien mène aux e-mails de suivi (centre de notifications) ;
  - « Mes données », « Supprimer mon compte », « Sécurité » (déconnexion de tous les appareils).
  - S'y ajoutent, comme avant : l'abonnement (artisans, sans lien d'achat, règle 10), l'aide (particuliers), le légal et la déconnexion.
- **Mêmes règles que le site**, avec les schémas de `@menao/validation` :
  - « Mes informations » : téléphone obligatoire pour un compte professionnel ;
  - adresse e-mail : `updateUser` envoie un lien aux deux adresses. Les liens s'ouvrent sur la page « Mon compte » du site, qui confirme le changement. L'application relit l'adresse et le changement en attente sur le serveur (`getUser`) ;
  - mot de passe : l'actuel est vérifié par une nouvelle connexion, puis les autres sessions sont révoquées (`scope: "others"`). « Mot de passe oublié ? » ouvre l'écran de l'application ;
  - mêmes messages d'erreur (adresse déjà utilisée, mot de passe trop faible ou inchangé, trop de tentatives).
- **Export des données commun au site et à l'application**, dans `@menao/documents` (`accountExport`, testé) :
  - il reçoit le client Supabase de chacun, vu comme une simple lecture de tables. Le paquet reste sans dépendance réseau ;
  - le contenu ne change pas : mêmes tables, mêmes filtres, mêmes clés, par pages de 1 000 lignes. Toute table illisible fait échouer l'export plutôt que de rendre un fichier incomplet ;
  - la route du site n'est plus qu'une enveloppe ;
  - l'application écrit le fichier JSON dans son cache et ouvre le partage du téléphone (enregistrer dans Fichiers, envoyer). Comme sur le site, l'export est réservé aux particuliers et aux artisans.
- **Déconnexion de tous les appareils** : l'appareil cesse d'abord de recevoir les notifications du compte (ADR 0079), puis toutes les sessions cessent (`scope: "global"`), y compris celle-ci.
- Aucune migration, aucune fonction serveur, aucune nouvelle dépendance.

## Conséquences
- Le client et l'artisan gèrent leur compte depuis l'application comme depuis le site.
- Une table ajoutée à l'export l'est pour le site et l'application à la fois.
