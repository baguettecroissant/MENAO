# ADR 0174 — Recommander un partenaire

- Statut : accepté
- Date : 23 octobre 2026
- D'après les deux « pistes à valider » du « Programme de parrainage » de Mickaël (18 octobre 2026) : « Je transmets à mon partenaire » et « Devis à plusieurs métiers avec ses partenaires ». Choix de l'utilisateur du 23 octobre 2026 : les deux cas, le réseau de parrainage seulement, un devis par artisan.

## Décision
- **Une seule fonction, « Recommander un partenaire »**, sur la fiche d'une demande côté artisan.
  - Elle propose les partenaires MENAO de l'artisan : son parrain et ses filleuls (ADR 0161), parrainages non annulés.
  - Le partenaire doit être proposable au client : visible, du métier voulu, dans sa zone (pas en zone élargie) et pas encore contacté.
  - Cas 1, « à votre place » : un partenaire du même métier, par exemple quand l'artisan refuse la demande (le tiroir de refus le rappelle).
  - Cas 2, « pour un autre métier du chantier » : un partenaire pour un autre lot du chantier (ADR 0167).
  - Au plus 3 recommandations par demande, une seule par partenaire et par projet.
- **Le client décide**.
  - Il est prévenu (notification `recommandation_partenaire`, catégorie « activité », désactivable), au plus une fois par quart d'heure pour une même demande.
  - Dans ses résultats, les partenaires recommandés sont présentés à part, avec le nom de l'artisan qui recommande : section « Recommandés par vos artisans », ou en tête de la section du métier. Ils sont retirés de la liste classée.
  - Il les ajoute à son envoi comme les autres artisans, 3 au plus par métier. Une fois contacté, le partenaire n'est plus proposé et la recommandation est suivie (`envoyee`).
  - Le partenaire ne voit rien de la demande tant que le client ne l'a pas contacté.
- **Un devis par artisan**, chacun pour son métier. Pas de devis commun à plusieurs entreprises : ce serait un groupement d'entreprises, et MENAO ne coordonne pas les travaux.
- **Écarté** : transmettre directement la demande au partenaire, car les coordonnées du client iraient à une entreprise qu'il n'a pas choisie (RGPD).
- **Critères de classement** : un paragraphe décrit les recommandations entre artisans. Elles sont présentées à part, hors du classement, et ne sont jamais rémunérées.
- **[TODO(legal)]** : le parrain gagne un mois offert quand son filleul s'abonne. Il faut faire valider la présentation de la recommandation (« Recommandé par …, son partenaire »), son caractère non rémunéré et sa mention dans les CGV artisans et les CGU.

## Technique
- **`app.match_artisans_core`** : le calcul de `match_artisans`, sans contrôle d'accès, réservé aux fonctions de la base. Un artisan ne voit jamais la liste des autres artisans d'un projet ; `public.match_artisans` garde son contrôle et appelle ce calcul.
- **Table `partner_recommendations`**, avec ses règles d'accès : lecture par le client du projet, l'artisan qui recommande et l'équipe ; rien pour le partenaire ; écriture par les fonctions seulement.
- **Fonctions et déclencheur** : `partner_recommendation_options`, `recommend_partner`, et un déclencheur sur `requests` qui suit la recommandation.

## Conséquences
- **Migrations** : `type_recommandation_partenaire` (valeur d'énumération seule) et `recommander_partenaire`. Test pgTAP `93_recommander_partenaire`.
- **Seed** : Inès a parrainé Lina, pour le test de bout en bout.
- **Après la fusion** : `db push` sur staging, puis redéployer `notify`.
- **Application** : même fonction que sur le site.
  - Côté artisan : la carte « Recommander un partenaire » sur l'opportunité ; l'écran de refus le rappelle.
  - Côté client : section « Recommandés par vos artisans », et les partenaires en tête du carrousel de leur métier, avec la mention « Recommandé par …, son partenaire ».
- **Pas de nouvelle dépendance.**
