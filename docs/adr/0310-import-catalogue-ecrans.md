# ADR 0310 — Importer son catalogue, PR 2 : écrans du site

- Statut : accepté (13/11/2026)
- Fonctionnalité : F-148 (maquette lot 42 validée) ; suite de l'ADR 0309

## Décision

- **Page `/pro/bibliotheque/importer`** (patron et chef d'équipe), trois étapes comme la maquette :
  1. ouvrages ou fournitures, fichier Excel (.xlsx) ou CSV déposé par le navigateur dans l'espace
     privé de l'entreprise (5 Mo) ; un ancien .xls est refusé avec un message clair ;
  2. colonnes reconnues, modifiables une à une (un rôle n'est porté que par une colonne), aperçu
     des 6 premières lignes ; « Continuer » exige la désignation et le prix ;
  3. chiffres, choix pour les articles déjà présents (mettre à jour, par défaut, ou laisser),
     lignes écartées avec leur raison, aperçu de ce qui sera importé ; rien n'est écrit avant
     « Importer ».
- **Après l'import** : premier passage marqué fait, prix des ouvrages recalculés, retour à la
  bibliothèque avec le bilan (« 198 ouvrages importés, 13 prix mis à jour. »). « Changer de
  fichier » retire le fichier déposé.
- **Accès** : bouton « Importer » dans la bibliothèque (ouvrages et fournitures), et choix
  « Importer mon catalogue » du premier passage, désormais actif (il mène à cette page). Dans
  l'application, l'option renvoie vers l'ordinateur, sans « Bientôt ».
- Test de bout en bout : un CSV aux titres libres, deux lignes écartées, deux ouvrages importés.
