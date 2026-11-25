# 0391 — « Pour vous démarquer » : une carte ouverte avec les points du Score MENAO

- Statut : acceptée
- Date : 2026-11-25
- Fonctionnalité : F-191 (maquette lot 81, validée le 25/11/2026)

## Contexte

Retour du premier artisan réel (24/11/2026) : « Il faut améliorer l'espace pour vous démarquer ».
Sur « Mon inscription », le bloc facultatif n'était qu'une ligne repliée en bas de page (ADR 0354),
et rien ne disait ce que chaque ajout apporte.

## Décision

- Le bloc devient une carte ouverte : quatre atouts (votre image ; diplôme, expérience et
  spécialités ; certifications ; photos de chantiers), chacun avec les points qu'il rapporte au
  Score MENAO, une jauge des points encore à gagner, et l'aperçu « Ce que verront les clients »
  qui montre en pointillés ce qui manque.
- Les points sont calculés dans `packages/core` (`standOut`) à partir du barème existant
  (`MENAO_SCORE_POINTS`, `experiencePoints`, `PROFILE_STRENGTH_WEIGHTS`) : image +2, réalisations
  jusqu'à +2 (au prorata de 3 photos), diplôme +5, spécialités +1, expérience de 3 à 10,
  qualification +5 et certification +1. Les années retenues sont la plus grande valeur entre les
  années déclarées et l'âge de l'entreprise (`experienceYearsOf`), comme `app.artisan_menao_score`.
  Une certification ajoutée compte comme gagnée ici (elle est ensuite vérifiée par l'équipe).
- Le budget minimum n'aide pas à se démarquer : il descend en simple ligne de réglage.
- Site : la page « Mon inscription » passe à 64 rem de large (au lieu de 48) pour l'aperçu à droite,
  comme la maquette. Application : la même carte dans l'écran du dossier, l'aperçu au-dessus des
  atouts.

## Conséquences

- Toute modification du barème du Score MENAO se répercute d'elle-même sur les points affichés.
- Aucune migration ; une requête de plus (qualification RGE, spécialités, certifications, photos)
  au chargement de la page et de l'écran du dossier.
