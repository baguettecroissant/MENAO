# ADR 0168 — Parcours d'un chantier à plusieurs métiers

- Statut : accepté
- Date : 23 octobre 2026
- Suite de l'ADR 0167 (un lot par métier), demandée le 23 octobre 2026 : rendre le parcours fluide quand le client contacte plusieurs métiers.

## Décision
- **Ordre habituel des travaux** (`TRADE_ORDER`, `inWorkOrder`) : terrassement et gros œuvre, toiture et façade, réseaux (plomberie, chauffage, électricité), cloisons et menuiseries, carrelage, peinture, extérieurs.
  - Les métiers du chantier sont affichés dans cet ordre, avec « Ordre habituel des travaux : … ».
  - C'est indicatif : chaque artisan fixe ses dates avec le client et MENAO ne coordonne pas.
- **Après un envoi** (site et application) : la confirmation propose « Les autres métiers de votre chantier », c'est-à-dire ceux pas encore contactés, dans l'ordre des travaux, avec un lien vers les artisans de chacun.
- **Message repris** : le message écrit pour un métier préremplit le formulaire du suivant (le dernier envoyé dans le même chantier), et reste modifiable.
- **« Mes chantiers »** : la carte d'un lot indique « Un des métiers de votre chantier : <chantier> ».
- **Pas dans ce lot** :
  - **un seul envoi pour tous les métiers** : chaque métier a ses résultats et sa sélection. La suite proposée après chaque envoi et le message repris réduisent la ressaisie à un clic par métier ;
  - **une date souhaitée par lot**.

## Conséquences
- **Pas de migration** : lecture des projets du chantier par `parent_project_id` (RLS du particulier).
- **Après la fusion** : rien à déployer côté Supabase.
- **Pas de nouvelle dépendance.**
