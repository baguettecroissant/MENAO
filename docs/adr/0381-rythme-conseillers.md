# ADR 0381 — Rythme des conseillers : objectif par semaine, objectif commun, suivi

- Statut : accepté (maquette du lot 78 validée par l'utilisateur le 20/11/2026, « Validé, code-le » ;
  rythme de 7 par semaine choisi le 19/11/2026)
- Fonctionnalité : F-184. Complète les ADR 0207 (résultats des commerciaux), 0209 (chiffres du
  lancement), 0367 (objectif par métier) et 0380 (recrutement des conseillers).

## Contexte

L'équipe vise 500 artisans validés au 31 mars 2027 avec des conseillers indépendants recrutés pour
janvier. Sans objectif chiffré ni suivi semaine par semaine, un retard ne se voit qu'en mars, trop
tard pour recruter ou accompagner. L'objectif mensuel par métier en place (66 par mois, « au rythme
de 3 artisans par jour », ADR 0367) était irréaliste pour des débutants et aurait mis presque tous
les conseillers « en retard » dès février.

## Décision

- **Objectif par conseiller en artisans validés par semaine** : 7 par défaut, 3 pendant les 2
  premières semaines (comptées depuis la création de sa fiche, heure de Paris), réglables. Objectif
  propre possible (temps partiel…) avec sa raison ; pendant le démarrage, le plus bas des deux.
  Règle écrite une fois en base (`app.pace_objective`) et une fois dans `@menao/core`
  (`paceObjective`), testées des deux côtés.
- **Objectif par métier ramené à 30 par mois** (`COMMERCIAL_TRADE_TARGETS`), au rythme de 7 par
  semaine, en gardant la répartition entre les métiers.
- **Objectif commun** : nombre d'artisans validés (vide par défaut : le dépôt est public, l'équipe
  le saisit), entre le début et la fin du recrutement déjà utilisés par l'onglet Chiffres. Plan de
  l'équipe : montée douce pendant le démarrage puis régulière (`pacePlan`), position attendue au
  jour près (`pacePlanToday`), rythme nécessaire (`paceNeededPerWeek`), projection au rythme des
  3 dernières semaines terminées (`paceProjection`).
- **Un artisan validé** : première validation, tous canaux pour l'équipe, rattachement au
  conseiller pour lui (même règle que les chiffres : `app.launch_artisans`).
- **« Mes résultats » du conseiller** (`commercial_pace`) : sa semaine en tête (anneau, ce qu'il
  manque d'ici dimanche, dossiers en vérification, repère de visites par jour), ses 8 dernières
  semaines face à l'objectif, l'objectif commun et le classement (moyenne sur 4 semaines terminées,
  prénom et initiale préparés en base, masquable par l'équipe). Le reste de la page ne change pas.
- **Back-office, onglet Lancement › Rythme** (`admin_commercial_pace` + `admin_launch_figures`) :
  retard ou avance, rythme récent contre rythme nécessaire, projection, courbe (réel, plan,
  projection), canaux des validés, et chaque conseiller avec son état : en avance (moyenne ≥ 110 %
  de l'objectif), dans le rythme (≥ 80 %), en retard, démarrage (moins de 2 semaines terminées),
  **point à prévoir** (deux semaines terminées de suite sous 50 %). Réglages sur
  `/admin/lancement/rythme/reglages` (`admin_save_pace_settings`, `admin_set_commercial_pace`),
  admins en double authentification, journalisés.
- **Alerte « À traiter »** : les conseillers en point à prévoir (élément `conseillers`, important,
  pôle croissance), si l'alerte est active.
- **E-mail du lundi** (`conseiller_semaine`, tâche `menao-semaine-conseillers`, chaque heure le
  lundi) : à partir de 8 h, heure de Paris, une seule fois par semaine (`email_lundi_envoye`), à
  chaque conseiller actif arrivé avant la semaine : sa semaine passée, l'objectif de la nouvelle,
  le total de l'équipe. C'est un rappel : il se coupe dans les préférences d'e-mail.

## Conséquences

- Les conseillers sont **indépendants** : les objectifs portent sur des résultats (artisans
  validés), jamais sur des horaires ni un nombre de visites ; le repère de visites est affiché comme
  un repère. TODO(legal) : la clause d'objectifs du contrat est à faire valider par l'avocat avant
  les premières signatures (risque de requalification en salariat si elle impose une organisation).
- L'objectif mensuel réglable des primes (`objectif_valides_mois`) reste à part ; il peut être
  laissé vide.
- Après la fusion : migrations et tâche planifiée à pousser sur staging, puis saisir l'objectif
  commun et ses dates dans l'onglet Rythme.
