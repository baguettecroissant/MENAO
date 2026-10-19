# ADR 0151 — Classement : disponibilité d'abord et place réservée aux nouveaux artisans

- Statut : accepté
- Date : 19 octobre 2026
- Modifie l'ordre du classement de l'ADR 0105. Le score de la charte ne change pas.

## Contexte
- **Pour chaque demande**, le particulier voit les 5 premiers artisans du métier et de la zone, et en sollicite 3 au plus.
- **Avant cet ADR**, l'ordre était le score de la charte, puis la disponibilité, la distance et un tirage. Un nouvel artisan part d'une valeur neutre (70 %) sur chaque critère, soit un score d'environ 70. Un ancien bien noté est vers 90.
- **Question de l'utilisateur** : un nouvel artisan, dans une zone où plusieurs anciens bien notés exercent déjà le même métier, ne sortirait jamais dans les 5 premiers.
  - Sans demande, il n'a ni chantier ni avis pour progresser.
  - Ses 3 mois d'essai passent sans demande, et il ne s'abonne pas.
- **Deux aggravants** :
  - un ancien complet pour plusieurs semaines passait devant un nouveau disponible, la disponibilité ne servant qu'à départager ;
  - rien ne limite le nombre de demandes reçues par les mieux classés.
- **Décision de l'utilisateur** : la disponibilité avant le score, et une place réservée aux nouveaux. Le plafond de charge et une éventuelle « garantie de démarrage » commerciale sont écartés pour l'instant.

## Décision
- **Nouvel ordre au mérite** :
  1. disponibles tout de suite d'abord ;
  2. puis le score de la charte (ADR 0105) ;
  3. puis la date de disponibilité ;
  4. puis la distance ;
  5. puis un tirage propre au projet.
- **Nouvel artisan** (`app.artisan_is_newcomer`) :
  - moins de 90 jours depuis la validation de son dossier ;
  - **ou** moins de 3 chantiers menés à terme (réceptionnés ou clôturés).
  - Le « ou » continue d'aider un artisan qui, faute de visibilité, n'a pas eu ses 3 premiers chantiers en 90 jours.
- **Place réservée** :
  - seulement si aucun nouveau ne figure déjà parmi les 5 premiers ;
  - un nouveau prend alors la **3e place**, et les autres descendent d'un rang ;
  - il est choisi parmi les disponibles tout de suite d'abord, puis par le tirage du projet. Les nouveaux tournent donc d'un projet à l'autre ;
  - les 2 premières places restent au mérite, et le particulier garde le choix.
- **Où sont les règles** :
  - en base, dans `public.match_artisans` : mêmes colonnes, mêmes filtres, ordre stable pour un même projet ;
  - dans `packages/core/src/matching.ts` (`NEWCOMER`, `isNewcomer`, `rankCandidates`), testé ;
  - la liste longue (20 artisans, pour l'envoi des demandes) suit le même ordre.
- **Transparence** :
  - la page « Critères de classement » décrit le nouvel ordre et la place réservée (date du 19 octobre 2026) ;
  - le résumé de la page Garanties aussi ;
  - la place ne dépend d'aucun paiement ;
  - aucune mention n'est ajoutée sur la carte de l'artisan. Un libellé du type « Nouveau sur MENAO » reste à proposer à l'utilisateur.

## Conséquences
- **Un nouvel artisan est vu dès ses débuts**, même face à des anciens bien notés. Il reçoit ses premières demandes pendant son essai.
- **Les artisans complets cèdent la place** aux artisans disponibles : réponse plus rapide pour le client, demandes mieux réparties.
- **Au lancement**, presque tous les artisans sont nouveaux : la place réservée ne change rien tant que des anciens n'occupent pas les 5 premières places.
- **`TODO(legal)`** : la description du classement reste à faire valider (art. L111-7 du Code de la consommation, règlement P2B), comme le prévoyait l'ADR 0105.
- **Tests** :
  - packages/core : ordre, place réservée, rotation ;
  - pgTAP 77 : nouvel artisan, 3e place, disponibilité avant le score, nouveau déjà dans les 5 premiers ;
  - le test 11 est adapté à la disponibilité d'abord.
