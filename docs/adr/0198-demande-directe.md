# ADR 0198 — Demande directe à l'artisan choisi par le client

- Statut : accepté
- Date : 27 octobre 2026
- Remplace la partie « Résultats » de l'ADR 0173 et complète l'ADR 0040.
- Demande de l'utilisateur du 27 octobre 2026 : un artisan partage sa fiche à un client, un ami ou un proche, par lien ou par la carte de visite. Ce client ne doit pas être mis en concurrence avec ses confrères. Proposition validée avec ses deux textes.

## Décision
- **Demande directe** quand le client a choisi un artisan, c'est-à-dire :
  - quand il part de sa fiche publique (lien ou QR de la carte de visite, ADR 0173) ;
  - ou quand il clique « Redemander un devis » (ADR 0040).
  - La demande ne part qu'à cet artisan, présélectionné. Aucun autre artisan n'est présenté pour ce métier : ni classement, ni zone élargie, ni bloc « Vous ne trouvez pas votre artisan idéal ? ».
  - Le bouton dit « Envoyer ma demande à <prénom> ».
- **Conditions habituelles** (métier, zone, disponibilité). Si l'artisan ne les remplit pas, c'est la liste habituelle, avec « <prénom> n'est pas disponible pour cette demande ».
- **Refus, 72 h écoulées ou annulation** : la liste habituelle revient. L'avis existant « Trouvons un autre artisan » (ADR 0156) prévient le client, avec un lien vers cette liste.
  - L'avis parle maintenant d'un seul artisan quand un seul a été contacté.
  - Le ticket SAV « Demande sans réponse » est inchangé.
- **Partenaires et autres métiers** : les partenaires recommandés par l'artisan (ADR 0174) restent visibles. Les autres métiers d'un chantier (ADR 0170) se choisissent comme d'habitude, dans le même envoi.
- **Textes validés** :
  - fiche publique : « Décrivez vos travaux en quelques minutes : votre demande sera envoyée à <prénom> uniquement. S'il ne peut pas intervenir, nous vous proposerons d'autres artisans. » ;
  - bandeau de saisie, site et application : « Nouvelle demande pour <prénom> : décrivez vos travaux, elle lui sera envoyée directement. »
- **Critères de classement** : l'exception décrit la demande directe. Le client reste libre de lancer une recherche classique depuis l'accueil. Page datée du 27 octobre 2026, toujours en validation juridique (TODO(legal), art. L111-7 du code de la consommation).
- **Application** : « Redemander un devis » ne mettait pas l'artisan en tête (le site, si). L'écran des artisans du projet suit maintenant la même règle que le site, y compris pour un projet créé depuis une fiche publique.

## Technique
- `packages/core/src/requests.ts` : `directRequest({ matches, status })` renvoie :
  - `a_envoyer` : l'artisan convient et n'a rien reçu ;
  - `envoyee` : demande en attente, acceptée ou en vérification ;
  - `null` : liste habituelle.
  - Tests ajoutés.
- Site, `/recherche/[id]/artisans` : une seule carte, et la barre d'envoi prend `hint` et `submitLabel`.
- Application, `loadResults` : renvoie `preferredId`, `preferred` (cherché jusqu'à 25 artisans, comme sur le site) et `preferredName`.
  - `loadProjectRequests` renvoie le statut de chaque artisan sollicité.
  - L'écran coche l'artisan d'office une seule fois.
- Contrôle d'interface seulement : la base accepte toujours 3 artisans par projet. Le client garde sa liberté de choix. Il n'y a ni migration ni nouvelle dépendance.
- `packages/emails` : singulier quand `artisans = 1` dans `demande_sans_reponse`.

## Décision complémentaire (27 octobre 2026)
- Les demandes apportées par l'artisan (sa fiche, sa carte de visite, « Redemander un devis ») ne comptent pas dans la promesse des « 4 demandes par mois », ni dans la garantie de l'engagement (ADR 0200). On les reconnaît sans nouvelle colonne : `projects.preferred_artisan_id = requests.artisan_id`.
