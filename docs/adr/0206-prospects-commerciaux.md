# ADR 0206 — Espace commercial, lot 2 : suivi des prospects

- Statut : accepté
- Date : 29 octobre 2026
- Complète l'ADR 0205 (espace commercial, lot 1).

## Contexte
- **Demande de l'utilisateur** (29 octobre 2026, « oui lance le lot 2 ») : l'outil de travail quotidien des commerciaux, avant les tournées de janvier 2027 : prospects de la zone, avancement, relances, carte, journée.
- **Source des entreprises** : l'API publique « Recherche d'entreprises » de l'État (registre Sirene), déjà utilisée à l'inscription des artisans (ADR 0110). Sans clé, coordonnées GPS des établissements fournies. Limites : environ 7 appels par seconde, 10 000 résultats par recherche (plus de 10 000 entreprises du bâtiment actives dans le 06), d'où un import par code d'activité.
- **Données personnelles** : le nom d'un entrepreneur individuel est une donnée personnelle. La prospection entre professionnels repose sur l'intérêt légitime : information au premier contact, droit d'opposition, conservation limitée (CNIL : 3 ans).

## Décision
- **Base de prospects** (`prospects`) : un établissement par ligne (SIRET), seulement s'il est ouvert, diffusible et d'une activité du bâtiment (codes NAF 41.20, 42, 43 et 81.30Z ; sans la promotion immobilière). Champs limités au nécessaire : nom, enseigne, activité, forme juridique, création, effectif, adresse, coordonnées, RGE, siège. Aucun dirigeant, aucun téléphone importé.
- **Import par un admin** depuis le back-office (« Commerciaux ») : le navigateur interroge l'API code par code et page par page (environ 4 appels par seconde, nouvel essai après un refus 429), puis envoie des lots de 500 lignes au plus à `admin_import_prospects` (session aal2, journal d'audit). Une ligne invalide est ignorée sans faire échouer le lot. Pas d'Edge Function : aucune clé, et la page montre la progression.
- **Suivi** (`prospect_follows`) : un prospect est suivi par un seul commercial. Étapes saisies par le commercial : à contacter, rendez-vous pris, démo faite, pas intéressé ; prochaine action (rendez-vous ou relance), téléphone et notes (2 000 caractères). Les étapes inscrit, validé et abonné sont lues dans MENAO par le SIREN (`app.prospect_stage`), sans saisie.
- **Ce que voit le commercial** : la base entière (données publiques), ses suivis, et « suivi par un collègue » pour les autres, sans plus de détails. Toutes les écritures passent par des fonctions qui exigent un commercial actif.
- **« Ne plus contacter »** : ouvert à tout commercial, immédiat et définitif. Le prospect et son suivi sont supprimés ; seul le SIRET est gardé (`prospect_opt_outs`), pour qu'il ne soit plus jamais importé.
- **Conservation** : tâche quotidienne `app.purge_prospects` : suivis non modifiés depuis 3 ans supprimés, prospects absents des imports depuis 13 mois (entreprises fermées) supprimés s'ils ne sont pas suivis.
- **Écrans** : « Ma journée » (rendez-vous du jour, relances en retard, créneaux téléphone dans la plage d'appel du guide), « Prospects » (recherche, filtres Tous, Mes prospects, À relancer, Libres, liste et carte sur le Plan IGN avec les briques de la carte du marché, ADR 0181), fiche du prospect (itinéraire, rappel du premier contact, suivi).

## Conséquences
- L'import d'un département prend quelques minutes, page ouverte ; à relancer de temps en temps pour mettre la base à jour (les fermetures sortent au bout de 13 mois).
- Les zones par commercial, la réattribution et les résultats restent pour le lot 3, comme les primes (montants réglés dans le back-office, jamais dans le code).
- TODO(legal) : information au premier contact, durée de conservation et prospection téléphonique des micro-entrepreneurs (questions n°2 et n°3 pour l'avocat).
