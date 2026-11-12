# ADR 0291 — DPGF depuis les plans, lot 1 : lire le plan (F-140)

- Statut : accepté
- Date : 12 novembre 2026
- Maquettes validées le 12 novembre 2026 (lot 35 du canevas). S'appuie sur les ADR 0287 (appels d'offres), 0288 (DPGF en PDF lu par l'IA) et 0231 (droits des formules).

## Contexte
Souvent, l'architecte n'envoie pas de DPGF, seulement ses plans. L'entreprise doit alors faire son métré à la main avant de pouvoir chiffrer.

L'utilisateur a demandé que MENAO crée le DPGF à partir des plans déposés : postes et quantités lus sur le plan, vérifiés par l'artisan, puis chiffrés, exportés et passés en devis comme un DPGF reçu.

Choix de l'utilisateur :
- tous les métiers du bâtiment ;
- plans en PDF et en photo ;
- une case « J'ai vérifié les quantités » obligatoire avant l'export ;
- maquette d'abord.

On livre en trois PR :
- **A** (celle-ci) : lire le plan, relevé modifiable ;
- **B** : revêtements par pièce et création du DPGF (règles de calcul par métier, case de vérification) ;
- **C** : évaluation de la lecture sur des plans fictifs et réels, avec une estimation du coût avant tout appel payant.

## Décision
- **Principe** : l'IA relève, MENAO calcule, l'artisan vérifie.
  - Le modèle ne fait que relever ce qui est écrit : pièces, niveau, surface, cotes, périmètre, hauteur sous plafond, échelle, et les éléments comptés avec les symboles du plan (portes, fenêtres, WC, lavabos, douches, baignoires, éviers, escaliers).
  - Une surface absente n'est calculée qu'avec deux cotes lues (pièce rectangulaire). Sinon elle reste vide, « à compléter ».
  - Ce calcul est fait dans `packages/core/src/plan-reading.ts` (sans import, lu aussi par Deno), jamais par le modèle.
- **Origine de chaque mesure** (`tender_rooms.source`) :
  - `plan` : lue sur le plan ;
  - `cotes` : calculée avec les cotes ;
  - `photo` : lue sur une photo, donc à vérifier ;
  - `saisi` : pièce corrigée ou ajoutée par l'artisan.

  `uncertain` signale une lecture incertaine. Le fichier et la page de lecture sont gardés : le badge « Lu p. 2 » ouvre le PDF à cette page (lien signé d'une heure, `#page=`).
- **Données** :
  - `tenders.source_kind` accepte une nouvelle valeur, `plan`.
  - Nouvelles colonnes sur `tenders` : `plan_files` (chemin, nom, type), `plan_trades` (métiers des lots à préparer), `plan_counts`, `plan_scale`.
  - Nouvelle table `tender_rooms`, avec les mesures en entiers : cm² pour la surface, mm pour le périmètre et la hauteur.
  - RLS : lecture par l'entreprise et les admins, comme `tender_lines`. Aucune écriture directe.
  - Fonctions :
    - `artisan_create_plan_tender` : formule Entreprise, 1 à 10 plans dans le dossier de l'entreprise, métiers existants ;
    - `artisan_import_plan_reading` : appelée par l'Edge Function avec le jeton de l'utilisateur ;
    - `artisan_save_plan_rooms` : une pièce modifiée ou ajoutée passe en `saisi` ;
    - `artisan_delete_tender` rend désormais tous les chemins de fichiers (`text[]`).
- **Fichiers** :
  - Le bucket privé `tender-files` accepte aussi le JPEG et le PNG.
  - Les photos sont réduites (2 400 px) et réencodées en JPEG par le navigateur avant l'envoi, sous la limite de 5 Mo d'une image pour le modèle.
  - L'Edge Function vérifie la signature de chaque fichier et plafonne le total à 20 Mo.
- **Lecture** : action `plan` de l'Edge Function `tender-sheet` (`plan.ts`).
  - Les PDF partent en bloc « document », les photos en bloc « image », numérotés dans l'ordre.
  - Réponse en sortie structurée (`planReadingJsonSchema`).
  - Modèle réglable par `AI_PLAN_MODEL`, sinon celui des devis.
  - Métriques dans `ai_runs` (`read-plan`), jamais le document.
  - Les lectures comptent dans la même limite horaire que les DPGF en PDF.
- **Écran** : dans Appels d'offres, le nouveau choix « J'ai seulement les plans ».
  - Les métiers de l'entreprise sont cochés, les autres sont proposés sous « Un autre métier ».
  - Après la lecture, la page de l'appel d'offres montre un résumé (échelle, surfaces lues, calculées, à vérifier, à compléter), les plans déposés, puis le relevé modifiable : pièces et éléments comptés.
  - La mention « vous restez responsable de vos quantités » est affichée.
  - « Relire les plans » est proposé tant qu'aucune pièce n'a été relevée.
- **Coût** : une lecture par dépôt, à l'initiative de l'artisan. Le coût réel par plan sera mesuré en PR C.

## Hors de ce lot
- Revêtements par pièce, règles de calcul par métier, création des lots et postes du DPGF, case « J'ai vérifié les quantités » avant l'export : PR B.
- Plan affiché dans MENAO avec les pièces surlignées (visionneuse PDF) : plus tard. En attendant, le PDF s'ouvre à la page lue.
- Fichiers DWG ou DXF, lus sans IA : lot suivant.
- TODO(legal) : la mention forfaitaire, comme pour l'ADR 0287.
