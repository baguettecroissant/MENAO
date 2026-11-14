# ADR 0329 — Totaux partiels et postes forfaitaires du DPGF créé depuis les plans (F-159, lot 5)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 5 ; premier des lots décidés après l'essai réel du 15/11/2026

## Constat

Essai de l'utilisateur sur quatre plans : relevé bon (8 pièces sur 9 mesurées, 0,9 % d'écart au
contrôle), mais 27 postes sur 39 « à compléter » dans le DPGF. Lecture des 39 postes :

- 8 postes vides parce qu'une seule pièce (un dégagement) n'avait pas de surface : le total des
  huit autres pièces était refusé ;
- 5 postes qui ne sont pas des mesures (« tableau à dimensionner », « appareil à choisir ») ;
- 6 éléments visibles sur le plan mais non comptés, 8 postes de lots sans rien de mesuré : traités
  par les lots suivants (lecture des ouvrages écrits, comptage avec repères, lots proposés d'après
  les plans).

Deux défauts d'affichage : un nombre déduit d'une règle par pièce (points lumineux, prises) était
marqué « Estimé » ou « Photo » selon l'origine des pièces, alors qu'il ne dépend pas de leurs
mesures.

## Décision

- **Total partiel** : un poste additionne les pièces dont la mesure est connue. S'il en manque,
  il prend l'origine `partiel` (« Partiel ») et son détail nomme la pièce et la mesure qui
  manquent (« … = 63,13 m² · sans Dgt : la surface à compléter. »). Sans aucune pièce mesurée, le
  poste reste à compléter. Vaut pour les surfaces, les plinthes, la faïence et les murs peints.
- **Postes forfaitaires** : tableau électrique, production d'eau chaude, générateur de chaleur,
  groupe extérieur, alimentations et évacuations valent une unité ou un ensemble, avec un détail
  qui dit ce qui reste à choisir ou à chiffrer.
- **Règle par pièce** : origine « Calculé », quelle que soit l'origine des pièces.
- **Écran** : pastille « Partiel », et le bandeau comme la carte d'export distinguent les postes à
  compléter des totaux partiels. L'export reste soumis à « J'ai vérifié les quantités ».
- **Base** : `tender_lines.quantity_source` accepte `partiel` (pgTAP 154).

## Effet mesuré

L'essai rejoué avec le nouveau calcul passe de 27 à 15 postes vides : 7 totaux partiels
renseignés, 5 postes forfaitaires renseignés.

## Limite

Un total partiel est par construction inférieur au vrai total : il est signalé partout, mais un
artisan qui coche la vérification sans compléter la pièce manquante sous-chiffre son offre.
