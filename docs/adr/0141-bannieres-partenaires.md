# ADR 0141 — Bannières du kit partenaire

- Statut : accepté
- Date : 19 octobre 2026
- Complète les ADR 0138 (widget et kit) et 0139 (espace partenaire).

## Contexte
- **Demande de l'utilisateur** : des bannières visuelles dans le kit, comme les programmes d'affiliation de référence. Le kit n'avait que des formats texte : lien, bouton HTML, widget et iframe.
- **Contraintes** :
  - aucun traceur ;
  - textes et promesses repris du site uniquement ;
  - pas de service d'hébergement d'images Vercel (règle 13) ;
  - pas de nouvelle dépendance.

## Décision
- **Six bannières SVG** aux couleurs de MENAO (dégradé, logo, titre, mentions, bouton), en fichiers statiques du site (`/bannieres/menao-<public>-<format>.svg`) :
  - **particuliers** : 728×90, 300×250, 160×600, 320×50, « Trouvez un artisan du bâtiment vérifié » ;
  - **artisans** : 728×90, 300×250, « Artisans : des chantiers près de chez vous », 0 % de commission.
  - **Fabrication** : elles sont produites par `scripts/partner-banners.mjs`, qu'on relance après une modification. Le texte utilise les polices du système, puisqu'une image SVG ne charge pas de police externe.
- **Code à coller** : `partnerBanners` (`@menao/core`, testé) produit, pour chaque bannière, une image reliée au lien du partenaire (`/p/<code>` pour les particuliers, `/p/<code>/pro` pour les artisans).
  - L'image porte ses dimensions et son texte alternatif, et s'adapte à la largeur disponible.
  - Il n'y a ni script, ni pixel de suivi. L'image est un simple fichier, sans cookie.
- **Dans le kit** (fiche du back-office et espace partenaire) : un aperçu, le code à copier et l'image à télécharger pour chaque bannière, regroupés par public.
- **Pré-lancement** : `/bannieres` est ouvert, comme l'espace partenaire, pour que les aperçus s'affichent et qu'une bannière déjà collée ne s'affiche pas cassée.

## Conséquences
- **Un partenaire choisit le format** qui convient à son site, sans rien installer.
- **Formats supplémentaires** (970×250, 300×600, versions sombres) : il suffit de les ajouter au script et à `PARTNER_BANNERS`.
- **Pas de mesure des affichages** : seuls les clics, attribués par le lien, sont comptés (ADR 0136).
