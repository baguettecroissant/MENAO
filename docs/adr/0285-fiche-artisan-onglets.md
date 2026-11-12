# ADR 0285 — Rangement du back-office, lot 3 : fiche artisan en onglets (F-134)

- Statut : accepté
- Date : 12 novembre 2026
- Suit les ADR 0283 (menu et noms) et 0284 (Réglages et équipe). Complète les ADR 0047 (actions sur un artisan), 0048 (actions sur un compte), 0133 (fiche à l'en-tête fixe) et 0252 (refonte « Nette » du dossier).

## Contexte
La fiche d'un artisan empilait 21 sections, avec un menu d'ancres incomplet et dans un autre ordre que la page. Deux actions aux noms proches faisaient des choses très différentes :
- « Suspendre l'artisan », sur la fiche artisan, le retire des recherches ;
- « Suspendre l'accès au compte », sur la fiche du compte, bloque la connexion.

Depuis une demande ou un chantier, rien ne menait au compte du client. Maquettes validées le 12 novembre 2026 (lot 32 du canevas).

## Décision
- **Quatre onglets** en pilule (`PillTabs`), dans l'adresse (`?onglet=`) :
  - **Vérification** : ce qui reste à vérifier, documents, certifications, RGE, charte, décision, contrôles aléatoires, historique des décisions. La décision reste collée à droite tant que le dossier est en attente.
  - **Entreprise et profil** : entreprise, dirigeant, métiers, zone, profil public, visibilité.
  - **Activité** : objectif de demandes, activité, abonnement, score MENAO, parrainage.
  - **Compte** : « Retirer des recherches » et « Bloquer la connexion » côte à côte, puis la radiation.
- **Onglet par défaut** : Vérification tant que le dossier est en attente (ou au retour d'un contrôle RGE), sinon Activité. Après une décision, la fiche revient sur l'onglet Vérification.
  - Le compteur de l'onglet Vérification est le nombre de points qui restent à vérifier.
- **En-tête** : nom, statut, SIRET, puis quatre repères (score MENAO, demandes du mois face à l'objectif, abonnement, date d'inscription) et les onglets.
- **Noms des deux actions**, chacune expliquée par « Ce que ça fait » et « Ce qui ne change pas » :
  - **« Retirer des recherches »** (avant « Suspendre l'artisan ») : statut « Suspendu », il ne reçoit plus de demandes, mais se connecte et termine ses chantiers.
  - **« Bloquer la connexion »** (avant « Suspendre l'accès au compte ») : il ne peut plus se connecter, sessions fermées ; sa fiche et ses données restent.
  - Les mêmes noms valent sur la fiche du compte. Le badge « Compte suspendu jusqu'au … » devient « Connexion bloquée ».
- **Liens croisés** :
  - « Voir son compte » sous le client, sur les fiches demande (sauf visiteur sans compte) et chantier.
  - Depuis l'onglet Compte, la fiche du compte (connexion, mot de passe, données).
  - Depuis la page des objectifs, l'onglet Activité de l'artisan.
- Site seulement : aucune migration. Les actions existent déjà ; seuls leurs noms et leur place changent.
