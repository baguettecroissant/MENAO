# ADR 0265 — Espace Pro repensé et page Formules (lot 19, lot A côté artisans)

- Statut : accepté
- Date : 9 novembre 2026
- Suite du plan « côté artisans » du 9 novembre (lots A, B, C) et du rapport « Site vitrine wahou et SEO » (recommandations E1 à E6). Lot 19 maquetté et validé le 9 novembre.

## Décision
- **/pro** : bandeau bleu nuit avec « Créer mon compte pro » et « Être rappelé » ; bande de preuves (0 % de commission, 3 artisans au plus, 100 % des paiements sur le compte, 2 mois d'essai) ; constat avec la réponse de MENAO sur fond vert ; vidéo ; grille de l'outil où chaque carte montre un fragment d'interface (valeurs d'exemple) ; nouvelle section « Assistants IA » (Camille, brouillon de devis, tickets lus, relances) ; simulateur de commission ; étapes ; réseau juste ; aperçu des 3 formules ; métiers ; 6 objections reprises de la FAQ des artisans ; appel final avec « Être rappelé ».
- **/pro/formules** (nouvelle page, au plan du site) : les 3 formules au mois ou à l'année, Premium en bleu nuit et en relief, la ligne « assistants IA » de chaque formule calculée depuis `plans.limites.agents` ; la garantie de l'engagement mise en avant ; un calculateur de rentabilité (`subscriptionPayback`, @menao/core, testé) ; le comparatif avec la nouvelle catégorie « Assistants IA » (migration `20261109150000_comparatif_assistants_ia.sql`, test pgTAP) ; les objections ; l'appel final ; une barre « Essayer gratuitement » et un bouton d'appel fixés en bas sur téléphone.
- **« Être rappelé »** : lien vers l'ancre `#etre-rappele`, qui ouvre le formulaire de rappel existant de l'assistant des pages Pro (ADR 0218, ticket `rappel_pro`).
- Les liens « Formules » (pied de page, pages Pro par métier, guide terrain, guide facture électronique) mènent à /pro/formules.

## Conséquences
- Écarts assumés avec la maquette : la vidéo « MENAO en 80 secondes » et les liens « MENAO pour votre métier » sont gardés (conversion et maillage) ; le bandeau garde l'ordinateur et le téléphone réels et les badges des stores.
- TODO(legal) : bande de preuves, « sans engagement », comparaison avec une commission, calculateur et sa note.
- Après fusion : appliquer la migration sur staging (db push) pour afficher la catégorie « Assistants IA ».
