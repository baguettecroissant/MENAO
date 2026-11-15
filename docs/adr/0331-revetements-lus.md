# ADR 0331 — Revêtements lus sur le plan (F-159, lot 6, PR B)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 6 ; maquette du lot 54 (« Revêtements lus ») validée le 15/11/2026

## Constat

L'étape « Revêtements » proposait pour chaque pièce un choix selon son nom (carrelage par défaut),
sans dire que ce choix venait de MENAO. Or les plans d'un architecte écrivent souvent le
revêtement pièce par pièce : « ragréage, revêtement de sol souple », « tomette existante à
nettoyer », « parquet existant à poncer et huiler », « faïence ht 220 cm ». À l'essai, le sol écrit
était rattaché à la bonne pièce 14 fois sur 14. Le DPGF chiffrait donc du carrelage là où le plan
demandait un nettoyage de tomette.

## Décision

1. **Aucune lecture de plus** : la lecture des notes (ADR 0330) rend déjà, pour chaque pièce, ce
   que le plan écrit pour son sol, ses murs et son plafond. Ces notes sont gardées avec la pièce
   (`tender_rooms.floor_note`, `walls_note`, `ceiling_note`) ; sur plusieurs plans, la première
   note non vide compte.
2. **`packages/core` reconnaît le revêtement dans la note** (`finishesFromNotes`), par mots :
   sol souple, parquet, carrelage, faïence et sa hauteur écrite, peinture, faux plafond. Une note
   qui ne le dit pas ne décide de rien (une crédence seule ne dit pas le revêtement des murs).
3. **Deux sols « existant conservé »** : `existant_nettoyer` et `parquet_poncer`. Ils ne reçoivent
   ni revêtement neuf ni chape, mais un poste de remise en état : « Nettoyage et remise en état du
   sol existant » (lot du carreleur), « Ponçage et finition du parquet existant » (lot du
   menuisier).
4. **L'étape dit d'où vient chaque choix** : « Lu sur le plan » avec la note citée, « Proposé par
   MENAO » quand rien n'est écrit pour la pièce, « Sol à choisir » quand le plan parle de la pièce
   sans rien écrire pour son sol (aucun sol n'est alors proposé d'office). Un relevé sans aucune
   note garde l'écran d'avant.
5. **Pas de double compte** : quand les faux plafonds sont écrits pièce par pièce (ouvrages de
   l'ADR 0330), le total « Faux plafond en plaques de plâtre » de la règle du plaquiste est retiré.

## Conséquences

- Aucun coût de lecture en plus.
- Limites connues : la liste des mots reconnus est courte, à étendre avec les essais ; une crédence
  n'est pas chiffrée ; le ragréage sous un sol souple n'a pas encore son poste ; le lot où va une
  remise en état est fixé par la règle et se corrige dans le DPGF.
- La correction du relevé (`artisan_save_plan_rooms`) garde les notes et les revêtements.
