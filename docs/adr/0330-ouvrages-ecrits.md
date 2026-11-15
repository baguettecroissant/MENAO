# ADR 0330 — Ouvrages écrits sur les plans, rangés par lot (F-159, lot 6, PR A)

- Statut : accepté (15/11/2026)
- Fonctionnalité : F-159, lot 6 ; maquette du lot 54 validée le 15/11/2026

## Constat

Après les totaux partiels (ADR 0329), il restait dans le DPGF d'un essai réel 15 postes « à
compléter », dont les lots sans rien de mesuré (plâtrerie, démolition, menuiseries). Or les plans
d'un architecte portent des notes : « cloison BA13 de 10 cm avec laine de bois », « faux plafond
suspendu, plénum 10 cm », « baignoire à déposer », et des menuiseries à repère avec leurs
dimensions. La lecture des plans ne relevait que des pièces et des ouvrages mesurés.

Essai avant de coder (`eval/prescriptions.ts`, quatre plans réels, deux passes) : menuiseries
31 sur 31 avec leurs dimensions exactes, sols rattachés à la bonne pièce 14 sur 14, ouvrages 54 sur
56, lecture stable d'une passe à l'autre ; 20 à 50 s et environ 0,07 $ par plan.

## Décision

1. **Une lecture de plus par image** (`tender-sheet/notes.ts`) : photo d'un plan ou page de PDF
   rendue en image, six images au plus. Le modèle recopie les notes par métier, avec la pièce et
   l'action (créer, déposer, conserver), et les menuiseries à repère. Il ne compte ni ne mesure.
   Ces lectures partent en même temps que la lecture des pièces, pour tenir dans les 150 s d'une
   Edge Function ; une lecture en échec ne retire que ses notes. Même modèle que les plans
   (`planModel()`), consigne et schéma de l'essai, inchangés.
2. **`packages/core/src/plan-notes.ts` décide des quantités**, sans rien deviner :
   - un ouvrage qui couvre le sol ou le plafond (faux plafond, dalle, ragréage, chape) prend la
     surface de sa pièce quand le relevé la connaît, origine « calcul », détail « Surface de la
     pièce : … » ; si la surface est estimée, l'ouvrage est « à vérifier » ;
   - une cloison, un doublage, un caisson, une plinthe restent **à mesurer** : leur longueur ne se
     lit pas dans une note (tracé à la main, ADR 0327) ;
   - un équipement ou une menuiserie compte une unité, nouvelle origine « unite » ;
   - une quantité écrite dans la note est reprise telle quelle ;
   - un ouvrage « conservé » n'est pas repris ; une note répétée sur plusieurs plans (même métier,
     même désignation, même pièce) ou un repère de menuiserie déjà vu ne compte qu'une fois.
3. **Base** : `tender_works` gagne `room` (pièce écrite) et `removal` (dépose). Les ouvrages écrits
   s'ajoutent après ceux du relevé (`artisan_import_plan_notes`, 200 ouvrages au plus en tout).
4. **Lots proposés d'après les plans** : les métiers des ouvrages écrits rejoignent
   `tenders.plan_trades`, et les déposes y ajoutent le code `demolition`, qui n'est pas un métier
   de la table mais le lot « Démolition, dépose ». L'artisan décoche un lot
   (`artisan_set_plan_trades`) ; un ouvrage garde son métier même si son lot est décoché.
5. **DPGF** (`planTakeoff`) : le lot Démolition vient en tête et reçoit les déposes, quel que soit
   leur métier ; la désignation d'un ouvrage écrit porte sa pièce ; dès qu'un lot a des ouvrages
   écrits, les postes d'attente de sa règle (« cloisons : longueur à mesurer ») sont retirés ; un
   lot sans rien sur les plans (couvreur sans plan de toiture) n'est plus créé, sauf s'il ne
   resterait aucun lot.
6. **Écran** (maquette du lot 54) : un onglet par lot avec son nombre d'ouvrages, colonnes « Ce
   que le plan écrit », « Pièce », quantité, « D'où vient la quantité » (Surface de la pièce,
   Écrit sur le plan, À mesurer, À l'unité) et plan d'origine ; à droite les lots à cocher et les
   menuiseries à repère. Un relevé sans ouvrage écrit (plan de terrain) garde l'écran du lot 52.

## Conséquences

- Coût : une lecture par image en plus de la lecture des pièces et du tracé, soit environ 0,07 $
  par plan. Ces lectures étant lancées en parallèle, elles sont payées même si la lecture des
  pièces refuse ensuite les fichiers (« ce n'est pas un plan »).
- Les revêtements écrits par pièce sont déjà dans la réponse du modèle (`pieces`) mais ne sont pas
  encore gardés : PR B (étape Revêtements pré-remplie, sols existants conservés).
- Limites connues : une note sans pièce claire n'a pas de surface ; les mots qui décident de la
  mesure (surface de la pièce, tracé, unité) sont une liste courte, à étendre avec les essais ;
  les plans « existant » et « projet » ne sont pas encore distingués.
- TODO(legal) inchangé : les quantités restent à vérifier par l'artisan avant l'export (« J'ai
  vérifié les quantités »).
