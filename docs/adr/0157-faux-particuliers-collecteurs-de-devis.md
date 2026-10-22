# ADR 0157 — Faux particuliers et collecteurs de devis

- Statut : accepté
- Date : 22 octobre 2026
- Lot 2 du plan V1.1, d'après le « Plan anti-problèmes V2 » de Mickaël (18 octobre 2026) : focus « faux particulier » et point A3 « collecteur de devis ».

## Contexte
- **Faux particulier** : un artisan, inscrit ou non, se fait passer pour un particulier pour recevoir les devis de ses concurrents et connaître leurs prix.
- **Collecteur de devis** : un particulier demande des devis pour négocier ailleurs.
- **Le plan** combine détection, dissuasion et sanction :
  - recoupement automatique ;
  - signalement par les artisans ;
  - mention « Confidentiel » sur les devis ;
  - 2 demandes en cours tant qu'aucun chantier n'est concrétisé ;
  - clause des conditions d'utilisation.

## Décision
- **Limite des projets en cours** (`send_project_requests`) : un particulier qui n'a concrétisé aucun chantier (devis signé ou étape suivante) ne peut avoir que **2 projets en cours** à la fois. Un projet est en cours s'il a une demande en attente ou en vérification, ou un chantier avant la signature du devis. La limite de 3 artisans par projet ne change pas. Le texte d'erreur explique comment libérer une place.
- **Recoupement automatique à l'envoi** (`app.request_suspicion`). On compare le particulier aux artisans inscrits :
  - **téléphone** : celui de la demande, avec le téléphone du compte de l'artisan ;
  - **nom et prénom** : comparés sans accents ni ponctuation ;
  - **adresse du chantier** : à 30 m ou moins de l'adresse de base de la zone d'un artisan, qui est souvent son siège ou son domicile.
  En cas de correspondance :
  - les demandes sont créées au statut **« à vérifier »** (`a_verifier`), invisibles des artisans : politique de lecture, boîte de réception et détail. Aucune notification n'est envoyée ;
  - un ticket `particulier_a_verifier` est ouvert (échéance d'un jour). Son texte est neutre, car le particulier peut le lire. Le détail (motifs, artisans concernés) va dans une **note interne** ;
  - **l'équipe décide** depuis le ticket (`staff_review_held_requests`, journalisé) :
    - **transmettre** : les demandes passent à « envoyée », avec un délai de 72 h compté à partir de la transmission (relances et temps de réponse aussi), et les artisans sont prévenus ;
    - **bloquer** (motif interne obligatoire) : les demandes sont annulées.
  - le particulier voit « En cours de vérification » et peut annuler sa demande, sans avis envoyé à l'artisan.
- **Signalement par l'artisan** (`artisan_report_fake_client`) : lien discret « Je pense que ce n'est pas un vrai particulier » sur chaque demande, sur le site et dans l'application, avec un commentaire facultatif.
  - Il crée un ticket `faux_particulier` (échéance de 2 jours), avec un fil de réponse dans « Mes échanges ».
  - Un seul signalement par demande.
- **Devis confidentiel** : chaque devis envoyé porte, sur chaque page, « Confidentiel – établi pour [nom du client], usage personnel » en pied de page et en filigrane léger. L'aperçu d'un brouillon garde son filigrane « APERÇU ».
- **Pas encore** :
  - **vérification par SMS** (un numéro = un compte) : décision des associés en attente ;
  - **même appareil ou même connexion** qu'un compte artisan : aucune donnée d'appareil n'est collectée ;
  - **liste noire** : lot 3.

## Clause proposée pour les conditions d'utilisation (à faire valider par l'avocat, non publiée)
> « Le service de demande de devis est réservé aux particuliers et aux personnes qui font réaliser des travaux pour leur propre compte. Il est interdit à un professionnel du bâtiment, ou à toute personne agissant pour son compte, de se faire passer pour un particulier, notamment pour obtenir les devis ou les prix d'autres professionnels. MENAO peut retenir, vérifier et bloquer une demande, et suspendre ou fermer le compte concerné. Un artisan inscrit qui enfreint cette règle peut être radié, sans préjudice des actions que les professionnels lésés pourraient engager pour concurrence déloyale. Les devis reçus sont personnels et confidentiels : ils ne peuvent être diffusés ni utilisés à d'autres fins que l'appréciation du projet du particulier. »

## Conséquences
- **Migrations** `types_faux_particuliers` (valeurs d'enum seules) et `faux_particuliers`. Tests pgTAP `81_faux_particuliers`. Le test 12 a été adapté : son adresse de chantier tombait sur le point de base d'un artisan du jeu de démonstration.
- **Après la fusion** : pousser les migrations, puis redéployer `generate-pdf` (mention confidentielle des devis).
- **[TODO(legal)]** : la clause ci-dessus, les recoupements de données personnelles (information des utilisateurs, politique de confidentialité) et la radiation pour ce motif.
- **Pas de nouvelle dépendance.**
