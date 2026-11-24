# ADR 0389 — Alerte de l'équipe à chaque nouvelle candidature de commercial

- Statut : accepté (remarque de l'utilisateur du 24/11/2026 : « aucune notification ou alerte comme
  quoi un nouveau candidat a postulé »)
- Fonctionnalité : F-188. Complète l'ADR 0380 (recrutement des commerciaux) et l'ADR 0050 (alertes
  de l'équipe).

## Contexte

Une candidature envoyée depuis « Devenir commercial MENAO » n'apparaissait que dans la liste
Apporteurs › Candidats : aucun e-mail, rien dans la cloche, aucune pastille dans le menu.

## Décision

- **E-mail et cloche** : type `equipe_nouvelle_candidature`, envoyé par le déclencheur
  `commercial_candidates_notify_team` (après insertion) à chaque **administrateur**, seul rôle qui
  lit les candidatures (RLS). Contenu : prénom, nom, secteur, avec ou sans CV, lien vers la fiche
  `/admin/candidats/<id>`. Même circuit que les autres alertes (`app.notify`, préférences de chacun).
- **Pastille** sur la rubrique « Apporteurs » : nombre de candidatures « À traiter » (nouveau, à
  appeler, entretien), comme l'onglet du même nom.
- Le suivi d'une candidature (changement d'étape) ne relance pas l'alerte.

## Conséquences

- Nouveau type de notification : la fonction `notify` (et celles qui importent `packages/emails` :
  `voice-assistant`, `accountant-export`) est à redéployer avec la migration.
