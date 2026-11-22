# ADR 0385 — La formule à 1 500 € s'appelle « Ultimate » ; montant pour les artisans venus de nos publicités

- Statut : accepté (décisions de l'utilisateur du 22/11/2026, « On la modifie en Ultimate dorenavant »,
  « cest 50€ + primes de 30 a 200e », « VALIDé », puis « Oui, lance le lot 1 »)
- Fonctionnalité : F-186. Complète l'ADR 0200 (offres et formules) et l'ADR 0366 (primes par formule).

## Contexte

La plaquette « Commercial MENAO, votre rémunération » mise à jour par l'utilisateur nomme la formule
à 1 500 € HT par mois « Ultimate » et ajoute un bonus de 50 € pour chaque artisan venu de nos
publicités, confié à un commercial qui finalise son inscription. Partout ailleurs (site, application,
messages des fonctions, assistant, CGV, guide des commerciaux), la formule s'appelait « Entreprise »,
un mot qui se confond avec « l'entreprise de l'artisan ».

## Décision

- **Nom affiché « Ultimate »** : `plans.nom`, textes du site et de l'application, assistant de
  l'espace artisan, guide et formulaires des commerciaux, CGV artisans, messages d'erreur des
  fonctions SQL (« … inclus dans la formule Ultimate. »). Ces messages sont réécrits par la
  migration à partir de la définition en place (`pg_get_functiondef` puis `replace`), sans recopier
  chaque fonction. **Le code interne `entreprise` ne change pas** (abonnements, limites, clé du prix
  Stripe, colonnes `prime_abonnement_entreprise_centimes`) : aucune donnée à migrer.
- **Montant pour un artisan venu de nos publicités** : colonne
  `commercial_bonus_settings.prime_validation_pub_centimes` (vide = non réglé, mêmes bornes que les
  autres montants), septième paramètre facultatif de `admin_save_commercial_bonus_settings`, champ
  dans Back-office › Réglages › Primes des commerciaux. Il remplace la prime par artisan validé
  (110 €) pour ces artisans ; les primes d'abonnement (30, 100 ou 200 €) restent les mêmes.
- **Versement à la validation du dossier** : les 110 € (et les 50 € des artisans venus de nos
  publicités) sont dus quand MENAO valide le dossier, pas quand les documents et la carte sont
  enregistrés. La plaquette dit « dès que son dossier est validé par MENAO ».

## Conséquences

- Le versement des 50 € arrive avec le lot 2 (artisans issus des publicités confiés à un commercial,
  liste dans l'espace commercial), sur maquette d'abord. D'ici là, le montant est seulement réglable.
- Le produit Stripe porte encore le nom « Entreprise » (affiché sur les factures Stripe) : à renommer
  dans le tableau de bord Stripe, staging puis production.
- Les CGV artisans (version provisoire) disent désormais « Ultimate » : à signaler à l'avocat.
