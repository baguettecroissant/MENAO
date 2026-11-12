# ADR 0293 — Bibliothèque d'ouvrages et marge, lot 1 (F-141)

- Statut : accepté
- Date : 12 novembre 2026
- Proposition du 25 octobre 2026 (doc « Bibliothèque d'ouvrages et marge »). Décisions 1 à 4 validées le 12 novembre 2026. Maquettes du lot 36 validées le même jour. Décision D10 du cahier des charges : catalogue personnel seulement, aucun prix fournisseur sans source autorisée.

## Contexte
« Rechercher l'article » reprend la dernière ligne saisie, avec son prix de vente. Cela pose plusieurs problèmes :
- l'artisan ne connaît pas son coût ni sa marge ;
- ses prix restent figés ;
- un ouvrage composé se retape ligne à ligne.

Décisions de l'utilisateur :
- la marge s'affiche en euros et en taux de marque ;
- aucun seuil d'alerte par défaut ;
- le lot 1 est ouvert à toutes les formules ;
- un ouvrage tient sur une ligne du devis, ou se détaille au choix.

Le lot 1 sort en trois PR :
- **1** (celle-ci) : base, calculs et onglet Bibliothèque ;
- **2** : dans le devis, insertion d'un ouvrage, marge privée par ligne et au total, et alerte d'envoi. Les prix de la bibliothèque passent aussi en premier dans les appels d'offres.
- **3** : l'application.

## Décision
- **Calculs** dans `packages/core/src/library.ts`, testés d'abord :
  - coût d'un élément ;
  - prix de vente : fournitures et frais × coefficient, heures × prix de vente de l'heure ;
  - prix retenu : fixé à la main, sinon calculé ;
  - taux de marque ;
  - marge d'un devis sur les seules lignes dont le coût est connu ;
  - alerte, seulement si un seuil est fixé ;
  - ancienneté des prix d'achat ;
  - saisie du coefficient et des pourcentages.

  Montants en centimes, quantités en millièmes, un arrondi par élément.
- **Données** (migration `20261112180000_bibliotheque_ouvrages.sql`) :
  - `artisan_pricing_settings` : coût et prix de l'heure, coefficient en points de base, seuil facultatif, ancienneté des prix, date du remplissage initial ;
  - `artisan_supplies` : fournitures et prix d'achat, avec la perte ;
  - `artisan_works` : ce que voit le client, affichage sur une ligne ou détaillé, prix fixé à la main, origine (`devis`, `manuel`). Une désignation est unique par unité.
  - `artisan_work_components` : fourniture, heures ou autre frais. Une fourniture utilisée ne peut pas être supprimée (`on delete restrict`).
- **Garde-fous** :
  - RLS sur les quatre tables, réservée à l'entreprise : patron et chef d'équipe, via `app.my_manager_artisan_id()`.
  - Aucune politique pour l'équipe MENAO ni pour le client : un coût n'apparaît jamais ailleurs.
  - Les ouvrages et leur composition s'écrivent par `artisan_save_work`, d'un bloc et en vérifiant que les fournitures sont celles de l'entreprise. Les réglages et les fournitures s'écrivent directement, sous RLS.
  - Tests pgTAP par rôle : propriétaire, autre artisan, client, admin, visiteur.
- **Remplissage initial** : `artisan_seed_library()`, une seule fois, à la première ouverture.
  - Chaque ligne déjà utilisée dans les devis de l'entreprise devient un ouvrage, au dernier prix.
  - Pas de doublon ; les lignes à 0 € sont écartées.
- **Écrans** :
  - **Onglet « Bibliothèque »** d'Argent (`/pro/bibliotheque`), sans nouvelle rubrique ; masqué dans les exemples.
    - Ouvrages : prix, coût, marge en euros et en taux de marque, origine.
    - Fournitures, modifiables sur place, avec « Prix à vérifier » au-delà de l'ancienneté réglée.
    - Réglages de chiffrage.
  - **Fiche d'un ouvrage** (`/pro/bibliotheque/[id]`, ou `nouveau`) :
    - ce que voit le client ;
    - la composition privée ;
    - le prix et la marge, recalculés à la frappe, avec « Fixer le prix à la main ».

## Hors de ce lot
- Lot 1, PR 2 et 3 : devis, appels d'offres et application (voir ci-dessus).
- Lot 2 : factures fournisseurs lues par l'IA, hausse en un geste, import depuis un tableur (décision 5 : coût à estimer avant).
- Lot 3 : dictée qui connaît les prix, marge au tableau de bord.
- Base de prix sous licence (décision 6) : rien avant l'usage réel.
- TODO(legal) : décompte détaillé exigé pour le dépannage, la réparation et l'entretien (arrêté du 24 janvier 2017). Les deux affichages sont prêts.
