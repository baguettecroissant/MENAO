# ADR 0255 — Écrans d'action de l'artisan repensés (refonte « Nette », lot 10)

- Statut : accepté
- Date : 8 novembre 2026
- Suite des ADR 0245 à 0254. Lot 10 maquetté (ordinateur, téléphone, application) et validé le 8 novembre.

## Décision
- **Tiroir commun** (`Drawer`) : fenêtre centrée plus large sur ordinateur, feuille du bas avec poignée sur téléphone ; grand titre en Inter Tight ; fermeture par un bouton rond (croix), dont le nom accessible reste « Retour » ou « Fermer ».
- **Proposer des créneaux** : un créneau par carte à cocher (case et bordure bleu nuit), l'heure en grand, compteur vert quand 2 ou 3 sont choisis.
- **Fixer ou modifier un rendez-vous** : la date et l'heure côte à côte, créneaux libres choisis en bleu nuit.
- **Choix en boutons radio** (`RadioGroup`, dans les espaces « Nette ») : la carte choisie est bordée de bleu nuit (refus, annulation…).
- **Annuler le chantier** : avertissement rouge en tête, mention avec cadenas pour le motif.
- **Déclarer le chantier terminé** : rappel des photos en orange, puis les trois étapes qui suivent.
- **Confirmer le démarrage** : titre plus grand, date prévue au devis dans une carte beige.
- **Signaler un problème** (commun au client et à l'artisan) : le formulaire à gauche, le chantier et « Ce qui se passe ensuite » à droite ; la nature du problème en pastilles.
- **Envoi du devis** : l'échéancier et les dates en cartes à gauche ; le total TTC, le rappel du chantier et l'envoi à droite (l'envoi reste collé en bas sur téléphone).
- **Application** : même modèle sur les écrans d'action et sur les actions rapides (+).

## Conséquences
- Aucune règle ni donnée nouvelle : présentation seulement.
- Écarts assumés :
  - pas de liste « Ce jour-là dans votre agenda » dans la fenêtre du rendez-vous (les avertissements d'agenda restent) ;
  - pas de phrase nouvelle sur ce que voit le client lors d'un refus ;
  - l'ajout de photos de fin reste le lien existant, sans vignettes dans la fenêtre.
