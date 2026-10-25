# ADR 0191 — Carte de visite et parrainage par QR code dans l'application

- Statut : accepté. Modifie l'ADR 0137 sur un point : le QR code de parrainage.
- Date : 25 octobre 2026
- Demande de l'utilisateur du 25 octobre 2026 : dans « Mon profil » de l'application, l'encart « Parrainez un confrère » doit proposer, au choix, un QR code ou le code de parrainage pour l'inscription d'un confrère. Il doit aussi offrir une carte de visite (lien ou QR code vers la fiche MENAO), à montrer sur un chantier. La section doit être agréable, sans friction, facile à comprendre et belle.

## Décision
- **Une seule carte, deux onglets**, juste sous « Voir ma fiche » :
  - **Ma carte de visite** : nom, entreprise et ville, badges « Assuré et vérifié » et score, QR code de la fiche publique et son adresse. Boutons « Agrandir » et « Partager » (message avec le lien de la fiche).
  - **Parrainage** : QR code de l'inscription artisan avec le code déjà rempli (`menao.fr/p/<code>/pro`), et le code en grand juste en dessous. Le confrère choisit : il scanne ou il saisit le code. Boutons « Agrandir » et « Partager », puis le suivi des filleuls (ADR 0161).
- **Plein écran** : un toucher sur un QR code, ou « Agrandir », l'affiche en grand sur fond blanc, pour le montrer de près.
- **Visible pour un artisan validé seulement**, comme le code de parrainage avant. La fiche publique n'existe qu'à la validation : même règle que les cartes de visite du site.
- **Règle 10 (CLAUDE.md)** :
  - aucune mention de l'abonnement ;
  - le QR code de parrainage est une image destinée au téléphone du confrère, pas un lien touchable dans l'application ;
  - « Partager » côté parrainage reste du texte seul, sans lien (ADR 0137) ;
  - le lien partagé côté carte de visite est la fiche publique destinée aux clients, pas une page d'achat.

## Technique
- `toqr` (0.1.1), déjà utilisé par le site pour ses QR codes : petite bibliothèque sans dépendance. Tracé SVG (`lib/qr.ts`, même calcul que le site) rendu avec `react-native-svg`, déjà présent.
- `components/qr-code.tsx` (QR sur fond blanc) et `components/pro/share-card.tsx` (la carte, ses onglets et le plein écran). L'ancienne carte de parrainage de `profile-hub.tsx` est retirée.
- `loadProfileHub` lit le `slug` de l'artisan et fournit `pageUrl` (`artisanPageUrl`) quand le dossier est validé. Pas de fiche dans les exemples (ADR 0184).
- Site inchangé : « Mon profil » y montre déjà le lien et le QR code de parrainage, et les cartes de visite à imprimer.

## Conséquences
- Le QR code de parrainage ouvre `menao.fr/pro/inscription?p=<code>`. Tant que le site est derrière la page d'attente, le confrère tombe sur cette page.
- Pas de changement de base.
