# ADR 0254 — Inscription et dossier de l'artisan repensés (refonte « Nette », lot 9)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0253. Lot 9 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Inscription** : thème « Nette » (Inter, Inter Tight) sur l'inscription et le dossier, comme dans les espaces connectés ; en-tête avec le logo et « Espace Pro ».
  - Accueil sur deux colonnes : le grand titre, les trois étapes numérotées et la confiance à gauche ; la carte « Créer mon profil professionnel » à droite. Le panneau bleu de gauche disparaît.
  - Étapes : barre segmentée, grands titres, métiers en pastilles (choisies en bleu nuit), entreprise trouvée bordée de bleu nuit, réponses choisies en bleu nuit. En grand écran, la confiance et les étapes cochées sont à droite.
- **Votre profil est créé** : l'aperçu de la fiche à gauche, la carte « Dernière étape » à droite (liste et bouton).
- **Faire vérifier mon entreprise** : trois groupes (« Votre entreprise », « Vos documents », « Votre fiche »), chacun avec son avancement « N sur M » (`dossierGroups`, @menao/core) et ses lignes à pastille. À droite : l'avancement et l'envoi, la demande de la zone, l'espace d'exemples, « Après la vérification » et la confidentialité. Sur téléphone, l'envoi reste collé en bas.
- **Un document** : la pièce à gauche, « Ce que l'équipe vérifie » à droite, avec la confidentialité et le retour au dossier.
- **Photo et présentation** : le formulaire à gauche et l'aperçu « Ce que verront les clients » à droite (la présentation enregistrée).
- **Paiements** : la configuration Stripe à gauche, « Comment vous êtes payé » à droite (sans commission MENAO).
- **Formule** (site seulement) : cartes de formule, la recommandée bordée de bleu nuit, avantages cochés, notes avec icônes.
- **Entreprise, métiers, zone, charte** : même en-tête, contenu limité à une colonne lisible.
- **Application** : même modèle sur l'inscription, le dossier et les documents, sans formule ni achat (règle 10).

## Conséquences
- `dossierGroups` découpe les éléments de `dossierItemsLeft` par groupe ; le total reste le même.
- Écarts assumés :
  - pas de bouton « Continuer avec Google » sur l'accueil (Google reste proposé à l'étape du compte) ;
  - l'aperçu de la fiche montre la présentation enregistrée, pas celle en cours de saisie ;
  - « Rédiger avec l'IA » reste « Proposer un texte », qui existait déjà ;
  - la bascule mensuel ou annuel de la formule reste dans le bouton de chaque formule.
