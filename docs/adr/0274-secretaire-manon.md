# ADR 0274 — La secrétaire vocale s'appelle Manon (F-122)

- Statut : accepté
- Date : 10 novembre 2026
- Suite des ADR 0225 (secrétaire vocale), 0228 (une seule assistante pour les deux publics), 0232 (secrétaire dédiée) et 0234 (devis en conversation). Les ADR antérieurs gardent le prénom d'origine : ils décrivent l'état du moment.

## Contexte
La secrétaire vocale s'appelait Camille, un prénom noté « provisoire » dès le départ. Depuis le lot 25 (ADR 0271), la cliente fictive des photos, des écrans de démonstration et du film de vente s'appelle aussi Camille : sur une même page, « Camille répond au téléphone » côtoyait la salle de bain « de Camille ».

## Décision
- **La secrétaire s'appelle Manon** partout où quelqu'un lit ou entend son prénom : site, espace artisan, application, e-mails, guide de l'assistant écrit, comparatif des formules, objet des demandes de rappel, consignes et noms des assistantes dans Vapi.
- **La cliente fictive reste Camille** (photos `camille-*`, écrans de démonstration, jeux d'essai des tests).
- **Les noms internes ne changent pas** : table `camille_recaps`, type de notification `equipe_recap_camille`, page `/appli/devis-camille`, clés de textes `day.camille`, noms de fichiers des migrations et des tests. Les renommer ferait courir un risque sans rien changer pour personne.
- **En base** : migration `20261110190000_secretaire_manon.sql`. Deux libellés du comparatif, et l'objet des demandes de rappel, écrit par une fonction et relu par le récapitulatif du matin : les deux fonctions sont redéfinies depuis leur définition en vigueur, les demandes déjà enregistrées reçoivent le nouvel objet.
- **Dans Vapi** : le passage de relais désigne les assistantes par leur nom (`VOICE_ASSISTANT_NAMES`). « Manon MENAO » et « Manon particuliers » doivent donc être renommées dans Vapi au moment du déploiement, avec leurs consignes et leurs premiers messages.

## Conséquences
- Entre le déploiement du code et le renommage dans Vapi, le passage de relais entre les deux assistantes ne trouve plus sa cible : les deux se font dans la même séance.
- Les enregistrements et récapitulatifs antérieurs au changement citent encore Camille.
