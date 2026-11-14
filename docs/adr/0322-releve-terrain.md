# ADR 0322 — Relevé d'un plan de terrain : ouvrages mesurés (F-158, PR 1)

- Statut : accepté (14/11/2026)
- Fonctionnalité : F-158 ; maquette du lot 52, validée le 14/11/2026

## Constat

La lecture des plans (F-140, ADR 0291) ne relevait que des pièces. Un plan de masse, une coupe de
terrain ou un plan de réseaux n'en portent aucune : ils étaient refusés (« Ces fichiers ne
ressemblent pas à des plans de bâtiment »), et les lots du terrassier et du paysagiste se
réduisaient à un poste d'attente. MENAO doit servir tous les corps de métier.

## Décision

- **Deux relevés dans une seule lecture.** Le modèle reconnaît le type de chaque page (niveau,
  coupe, façade, toiture, plan de masse, coupe du terrain, réseaux, autre), relève les altitudes
  écrites, et, en plus des pièces, des **ouvrages mesurés** : surface, linéaire, volume ou nombre.
  Un plan sans pièce est accepté dès qu'il porte au moins un ouvrage.
- **Le modèle relève, `packages/core` calcule.** Le modèle ne mesure rien à l'échelle et ne calcule
  rien. Pour un volume qui n'est pas écrit, il donne seulement les valeurs lues (surface, et soit
  une épaisseur, soit deux altitudes) ; `normalizePlanWorks` fait le produit en entiers et garde
  le calcul (« 186,00 m² × 0,30 m »), affiché à l'artisan. Sans ces valeurs, la quantité reste
  vide : « à compléter ». Une surface ou un linéaire ne sont jamais déduits.
- **Origine de chaque quantité** : Plan (écrite), Calculé, Compté (symboles), À vérifier (photo ou
  lecture incertaine), Saisi (corrigée par l'artisan), À compléter.
- **Lot** : le modèle propose le métier parmi ceux de l'appel d'offres (donnés dans la requête) ;
  un métier hors liste est ignoré par le cœur puis par la base. Un ouvrage sans lot est un repère
  (surface du terrain, emprise du bâtiment) et ne va dans aucun lot. L'artisan change le lot.
- **Base** : table `tender_works` (RLS, lecture par l'entreprise ou un admin, écritures par
  fonctions), `tenders.plan_pages` et `plan_levels`. `artisan_import_plan_reading` reçoit aussi les
  ouvrages, les pages et les altitudes ; `artisan_save_plan_works` enregistre les corrections (une
  mesure ou une quantité changée passe en « saisi », le nom et le lot se changent librement).
- **DPGF** : `planTakeoff` range chaque ouvrage dans le lot de son métier, avec son origine et son
  calcul. Pour les métiers chiffrés sur des ouvrages mesurés (terrassier, paysagiste, et les
  métiers de la PR 2), ces ouvrages remplacent le poste d'attente. Une quantité saisie dans le
  relevé garde l'origine « saisi » dans le DPGF.
- **Écran** (lot 52) : le plan et le type de page reconnu, « MENAO a lu vos plans », « Lots
  préparés », le tableau Ouvrage / Mesure / Quantité / U. / Origine / Lot, puis « Préparer le
  DPGF ». Sans pièces, l'étape « Revêtements » n'est pas affichée. Si les plans portent des pièces
  et des ouvrages, le tableau des ouvrages s'ajoute sous le relevé des pièces.

## Limites connues

- Le volume des déblais est un calcul simple (surface × différence d'altitudes) : il ignore la
  pente du terrain. Le calcul est affiché et l'artisan reste responsable de ses quantités
  (forfait), comme pour tout le relevé.
- La visionneuse ouvre la page où l'ouvrage a été lu ; elle ne le surligne pas sur le plan.
- L'application mobile ne propose pas les appels d'offres depuis les plans (site seulement).

## Suite

- PR 2 : façades et toiture (couvreur, charpentier, façadier, serrurier), sur le même tableau.
- PR 3 : jeu d'évaluation étendu aux plans de terrain, de façades et de toiture, et comparaison de
  deux modèles ; l'estimation du coût est présentée avant tout appel payant.
