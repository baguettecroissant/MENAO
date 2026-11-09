# ADR 0266 — Page d'atterrissage des campagnes artisans (lot 20, lot B côté artisans)

- Statut : accepté
- Date : 9 novembre 2026
- Suite de l'ADR 0265 (Espace Pro et formules). Lot 20 maquetté et validé le 9 novembre.

## Décision
- **/pro/rejoindre** : page sans menu ni pied de page du site (groupe de routes `pro/(campagne)`), pour les publicités, les QR codes des flyers et les liens des commerciaux et partenaires. Une seule action : s'inscrire.
  - Bandeau « Code appliqué : … » quand l'adresse porte un code (`?p=`), avec le texte existant de l'inscription.
  - Première étape de l'inscription dans le bandeau : le métier choisi rejoint le brouillon d'inscription (ADR 0110) ; « Continuer » ouvre `/pro/inscription?reprendre=1` (avec le code), et le parcours reprend à la première étape non terminée, sans l'écran d'accueil.
  - Bande de preuves, simulateur de commission, 4 bénéfices, prix « Dès … » lu dans `plans` avec Premium et Entreprise, garantie de l'engagement, 4 objections de la FAQ, appel final, barre fixe sur téléphone ; « Être rappelé » ouvre le formulaire de rappel (ADR 0218, 0265).
  - Tous les boutons d'inscription gardent le code (`?p=`).
- **Liens suivis** : `/p/<code>/pro` mène désormais à `/pro/rejoindre?p=<code>` (au lieu de l'inscription directe).
- **Référencement** : page hors index (`noindex, follow`, canonique vers /pro), absente du plan du site : même contenu que /pro.

## Conséquences
- Écart avec la maquette : le bandeau dit « Code appliqué » (texte existant), car le code peut venir d'un commercial, d'un partenaire ou d'un parrain.
- Pendant le pré-lancement, la page est derrière la page d'attente comme le reste du site. [À VALIDER] Pour la pré-ouverture de janvier à mars 2027, il faudra ouvrir `/pro/rejoindre` et l'inscription aux visiteurs sans code (liste `OPEN` de `lib/site/prelaunch.ts`).
