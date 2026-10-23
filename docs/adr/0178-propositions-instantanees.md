# ADR 0178 — Propositions instantanées pendant la saisie

- Statut : accepté
- Date : 23 octobre 2026
- Retour de l'utilisateur du 23 octobre 2026 sur les suggestions de l'IA (ADR 0177) : « je ne trouve pas ça ouf ». Elles arrivent environ 3 s après la pause de frappe et la suite grisée reste discrète. Choix parmi les pistes proposées : propositions instantanées, compréhension en direct, photo → description. Celle-ci est la première.

## Décision
- **Dès les premiers mots**, une liste façon moteur de recherche s'ouvre sous le champ avec 5 demandes types au plus, par exemple :
  - « salle de b » → « Rénover entièrement ma salle de bain », « Refaire la faïence de la salle de bain »… ;
  - « fuite » → « Réparer une fuite sous l'évier de la cuisine »….
- **Instantané, gratuit, sans limite** : aucun appel à l'IA ni au serveur. Les demandes types sont dans `packages/core`, rédigées comme un particulier les écrit, environ 130 réparties sur les 15 métiers, sans chiffre ni lieu.
- **Choix** :
  - site : un clic, ou les flèches puis Entrée ; Échap ferme la liste ;
  - application : un toucher ;
  - le texte devient la demande choisie, suivie d'une espace. Le particulier continue d'écrire, et les suggestions de l'IA (ADR 0177) prennent le relais.
- **Priorité** : tant que la liste est ouverte, la suite grisée de l'IA est masquée, pour ne pas montrer deux propositions à la fois. Au-delà de 8 mots, plus de liste.

## Technique
- **`matchNeedPhrases`** :
  - chaque mot important tapé doit se retrouver dans la demande ou ses synonymes (« placo », « cumulus », « WC »…) ;
  - le dernier mot, en cours de frappe, est comparé au début des mots ;
  - accents, majuscules, pluriel et féminin sont ignorés (racine grossière) ;
  - les mots courants (« je », « voudrais », « un »…) ne comptent pas ; les verbes d'action (« refaire », « remplacer »…) départagent sans exclure ;
  - classement : mots entiers avant débuts de mots, demande avant synonymes, puis ordre de la liste.
- **Accessibilité** : liste `listbox` avec ses options ; le champ indique `aria-autocomplete="list"`, `aria-controls` et `aria-activedescendant`.

## Conséquences
- Tests de la recherche (`need-phrases.test.ts`) ; test de bout en bout du choix au clavier ; le test des suggestions de l'IA ferme d'abord la liste avec Échap.
- Pour enrichir la liste, il suffit de compléter `NEED_PHRASES` : un test vérifie qu'il n'y a ni doublon ni chiffre.
- Le métier de chaque demande type (`trade`) servira à la compréhension en direct, prochaine étape.
- Pas de migration, pas de nouvelle dépendance.
