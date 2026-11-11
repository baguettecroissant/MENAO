# ADR 0279 — L'urgence dans le parcours de demande, écrans d'analyse et de critères repensés (F-128)

- Statut : accepté
- Date : 11 novembre 2026
- Complète les ADR 0044 (description modifiable), 0177 à 0179 (aide pendant la saisie) et 0257 (refonte « Nette »).

## Contexte
`projects.urgence` existait depuis la recherche IA : l'analyse la remplissait et l'artisan voyait une étiquette « Urgent ». Le particulier, lui, ne la voyait nulle part et ne pouvait ni la demander ni la retirer. L'écran « Analyse de votre projet en cours » ne montrait rien de la demande, et l'écran des critères empilait sept cartes de même poids, avec « Autres métiers du chantier » au milieu.

## Décision
- **Bouton « Urgent » à la saisie**, dans la barre du champ. Trois états : repos, activé à la main, allumé tout seul quand la description décrit une urgence.
- **Repérage par mots, sans appel réseau** (`detectUrgency`, `packages/core/src/urgency.ts`) : fuite ou dégât des eaux, panne de chauffage ou d'eau chaude, panne ou danger électrique, porte ou serrure bloquée, vitre brisée, canalisation bouchée, toiture, ou urgence dite (« urgent », « au plus vite »…). Les tournures de prévention (« éviter une fuite ») sont écartées. Il allume le bouton, dit pourquoi, et sert de filet côté serveur.
- **Trois sources, un ordre** : le choix du particulier d'abord, sinon l'analyse IA, sinon les mots de la description (si le modèle ne l'a pas relevée ou n'a pas répondu). La règle du modèle est précisée (situations qui ne peuvent pas attendre, même sans le mot « urgent » ; faux pour un projet planifié).
- **Choix gardé à part** : `projects.urgence_manuelle` (null : jamais réglée). Une nouvelle analyse de la description ne l'écrase pas. `analyze-need` reçoit `urgency` (« oui » / « non ») à la création.
- **`set_project_urgency(projet, urgent)`** : réservé au propriétaire, tant que la demande n'est pas envoyée (mêmes contrôles que `save_project_criteria`). Urgent : début « dès que possible », date effacée. Retirée : le délai reste tel quel. Tests pgTAP `133_urgence_particulier`.
- **Écran d'analyse** : la description avec les mots repérés, « Ce que nous avons compris » (métier, lieu, délai tirés de la compréhension en direct, ADR 0179), les étapes en ligne, un bandeau si la demande est urgente.
- **Écran des critères** : bandeau « Demande urgente » avec « Ce n'est pas urgent » ; groupe « L'essentiel » (métier, ville, délai en quatre choix dont « Urgent » en premier) ; groupe « Votre chantier » en lignes (description, travaux, lieu et pièces, surface et budget, photos), chacune s'ouvrant sur place ; « Autres métiers du chantier » en bas, replié quand rien n'est proposé ; résumé avec le délai ; sur téléphone, bouton de recherche collé en bas.
- Le résumé des étapes suivantes affiche « Urgent » à la place du début souhaité.
- Au passage : la suite grisée de la saisie est réalignée sur le texte du champ (décalée depuis le lot 12).

## Non décidé
- **Délai de réponse des artisans** : inchangé (72 heures), y compris pour une demande urgente. Un délai plus court demande une décision produit.
- **Classement** : inchangé. Les artisans disponibles passent déjà en premier (ADR 0151) ; l'urgence n'ajoute pas de critère.
- **Application mobile** : le bouton et les écrans repensés viendront dans un lot à part ; l'application profite déjà du repérage côté serveur.

## Conséquences
- TODO(legal) : la ligne « Danger immédiat ? Appelez le 18 ou le 112. Odeur de gaz : 0 800 47 33 33 » (numéros et formulation) est à faire relire avant l'ouverture au public.
- La règle du modèle a changé : l'évaluation de l'analyse (`supabase/functions/analyze-need/eval`) est à relancer, après accord sur son coût.
- Déploiement : migration `20261111160000_urgence_particulier`, puis fonction `analyze-need`.
