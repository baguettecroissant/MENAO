# ADR 0155 — Score MENAO sur 100, visible du client et utilisé pour le classement

- Statut : accepté
- Date : 22 octobre 2026
- Décision des associés du 22 octobre 2026 (« Score MENAO : YES », puis validation du barème proposé dans le plan V1.1), d'après « Mettre en avant les nouveaux artisans » (Mickaël, 18 octobre 2026). Modifie l'ADR 0105 (score de la charte) et l'ADR 0151 (classement).

## Contexte
- **Deux notions portaient le même nom** :
  - sur la fiche publique, le « Score MENAO » était la moyenne des avis des clients ;
  - pour le classement, le score de la charte V5 restait privé (notes 40, devis sous 72 h 20, réactivité 15, planning 10, chantiers menés à terme 10, ancienneté 5).
- **Le problème du nouvel artisan** : sans avis, son profil paraît vide face à des artisans déjà notés.
- **Le document de Mickaël** demande un score sur 100, visible du client, calculé sur des critères remplis dès le premier jour. Un nouvel artisan sérieux doit démarrer vers 70 à 75.

## Décision
- **Barème** (`menaoScore`, @menao/core ; `app.artisan_menao_score`, en base, avec les mêmes exemples dans les tests) :

| Critère | Points | Règle |
|---|---|---|
| Assuré et vérifié | 20 | Badge de l'ADR 0119 |
| Expérience | 10 | Moins de 2 ans : 3 · 2 à 4 ans : 6 · 5 à 9 ans : 8 · 10 ans et plus : 10. On retient la plus grande valeur entre les années déclarées et l'âge de l'entreprise (date de création Sirene) |
| Diplômes et qualifications | 10 | Diplôme du métier déclaré : 5 · qualification vérifiée (certification validée par l'équipe ou domaine RGE de l'annuaire) : 5 |
| Profil complet | 10 | Jauge « Fiche complète » (`profileStrength`), ramenée sur 10 |
| Réactivité | 10 | Moitié temps de réponse moyen (moins de 2 h : 10 · moins de 12 h : 8 · moins de 24 h : 6 · moins de 72 h : 3 · moins de 3 réponses : 7), moitié devis envoyés sous 72 h (règle de la charte, taux lissé, 70 % sans historique) |
| Avis des clients | 40 | Note sur 5 ramenée sur 40. La note Google vérifiée sert de base, sinon 3 sur 5 (24 points). La moyenne des avis MENAO s'y mêle avec un poids n / (n + 5) : la moitié à 5 avis, 80 % à 20 avis |

- **Exemples de référence** (plan V1.1) :
  - nouvel artisan sérieux : 74 ;
  - le même avec une fiche Google à 4,7 sur 5 : 88 ;
  - nouvel artisan au profil peu rempli : 62 ;
  - artisan installé et apprécié : 98 ;
  - artisan décevant : 62.
- **Classement** : dans `match_artisans`, le Score MENAO remplace le score de la charte V5 dans l'ordre au mérite. Le reste ne change pas : « disponibles d'abord » et 3e place réservée aux nouveaux (ADR 0151), puis date de disponibilité, distance et tirage. Les résultats renvoient le score aux cartes.
- **Données nouvelles** (migration `score_menao`) :
  - **diplôme du métier**, déclaré par l'artisan (`set_artisan_diploma`), dans l'écran « Métiers » du site et de l'application ;
  - **date de création de l'entreprise**, lue par `sirene-check` et effacée si le SIRET change ;
  - **avis Google** : lien de la fiche, note et nombre d'avis, relevés et saisis par un admin sur la fiche de l'artisan (`admin_set_google_reviews`, journalisé). Ils s'affichent avec un lien vers leur source. Pas d'API Google pour l'instant : pas de coût, et ses conditions d'utilisation sont à faire valider avant tout import automatique.
- **Affichage** :
  - fiche publique (site et application) : bloc « Score MENAO » sur 100, avec ses six critères et un lien vers les critères de classement ; bloc « Avis des clients » (l'ancien détail, « Note globale ») avec la note Google ; diplôme déclaré parmi les garanties ;
  - cartes de résultats : « Score MENAO 74/100 » ;
  - espace de l'artisan : « Votre score MENAO », critère par critère, avec les points qu'il gagnerait tout de suite (vérification, diplôme, qualification, fiche) ; « Mes avis » parle désormais de « La note de vos clients » ;
  - le planning à confirmer reste dans « Mes disponibilités » ;
  - back-office : score et formulaire des avis Google sur la fiche de l'artisan.
- **Textes publics** : la page des critères de classement, la page Garanties et le cahier des charges décrivent le nouveau barème.

## Conséquences
- **Charte V6 à rédiger** : la charte V5 signée par les artisans décrit encore l'ancien score de classement. Le texte de la V6 est à faire valider par le CEO avant l'ouverture, puis à faire signer.
- **Mise en service** : pousser la migration, puis redéployer `sirene-check`, qui lit maintenant la date de création. Les artisans déjà vérifiés n'ont pas de date tant que leur SIRET n'est pas revérifié : seules leurs années déclarées comptent.
- **Le score de la charte V5** (`app.artisan_charter_score`) reste en base, mais il ne sert plus au classement ni à l'affichage.
- **[TODO(legal)]** :
  - score affiché aux consommateurs et utilisé pour le classement : explication sur la page des critères de classement (Code de la consommation, règlement P2B) ;
  - affichage de la note Google ;
  - diplôme déclaré sans justificatif.
  À faire relire par l'avocat.
- **Pas de nouvelle dépendance.** Tests : `menao-score.test.ts`, `sirene.test.ts` (core), `menao-score.test.ts` (validation), pgTAP `79_score_menao`.
