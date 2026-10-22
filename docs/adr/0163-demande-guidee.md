# ADR 0163 — Demande guidée : budget approximatif, demande reformulée pour l'artisan, photos conseillées

- Statut : accepté
- Date : 22 octobre 2026
- Lot 7 du plan V1.1, d'après le « Plan anti-problèmes V2 » de Mickaël (18 octobre 2026), point A2 : demande vague (« refaire ma salle de bains », sans budget ni délai).

## Décision
- **Déjà en place** : type de travaux, pièces, surface et délai sont déjà proposés par l'IA et vérifiés par le particulier (F-06, F-07). Ce lot ajoute ce qui manquait.
- **Budget approximatif** (`projects.budget`, `BUDGET_TRANCHES`) :
  - cinq tranches en euros TTC : moins de 1 000, 1 000 à 5 000, 5 000 à 15 000, 15 000 à 50 000, plus de 50 000 ;
  - **facultatif** (« Je ne sais pas encore ») : le rendre obligatoire freinerait les demandes ;
  - choisi dans la carte « Informations sur le chantier » de l'étape des critères, sur le site comme dans l'application ;
  - repris par l'IA de la description quand le particulier donne lui-même un budget ou un montant maximal. L'IA ne l'estime jamais ;
  - une description modifiée ne remplace pas un budget déjà choisi ;
  - montré à l'artisan dans le détail de la demande.
- **Demande reformulée pour l'artisan** (`projects.artisan_brief`, 800 caractères au plus) :
  - **rédaction** : `analyze-need` demande à l'IA 2 à 4 phrases neutres (travaux, lieu et pièces, dimensions, contraintes, points à préciser lors de la visite), sans rien inventer ni reprendre de coordonnées ;
  - **mise à jour** : refaite quand la description change ; retirée si la nouvelle analyse échoue, pour ne jamais décrire un ancien texte ;
  - **affichage** : bloc « La demande en bref » du détail de la demande (site et application), signalé comme rédigé par l'IA, avec l'invitation à vérifier les détails auprès du client. Les coordonnées éventuelles sont masquées (`app.scrub_contacts`).
- **Photos conseillées** (`photosAdvised`) :
  - **quand** : tant qu'il n'y a aucune photo et que la description reste vague (moins de 12 mots, travaux non identifiés ou analyse peu sûre) ;
  - **comment** : la carte des photos invite à en ajouter, sur le site comme dans l'application ;
  - **obligation** : c'est un conseil. Rendre les photos obligatoires fait partie des points du document encore à trancher **[À VALIDER]**.
- **Pas dans ce lot** : le **budget minimum dans les filtres de l'artisan** (le plan anti-problèmes, point B, et l'ADR 0158). Il s'appuie sur ce budget et fera l'objet d'une évolution de la recherche d'artisans (une demande sans budget restera proposée à tous).

## Conséquences
- **Migration** : `demande_guidee`. `save_project_criteria` prend le budget en dernier paramètre, facultatif. Tests pgTAP : `86_demande_guidee`.
- **Après la fusion** :
  - pousser la migration ;
  - redéployer `analyze-need` (consigne et sortie de l'IA).
- **IA** : la consigne ne reçoit toujours que la description nettoyée (sans e-mail, téléphone ni nom du compte, CLAUDE.md règle 11). Les simulations des tests bout en bout renvoient les nouveaux champs.
- **Pas de nouvelle dépendance.**
