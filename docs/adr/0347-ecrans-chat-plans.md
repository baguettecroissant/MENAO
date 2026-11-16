# ADR 0347 — Écrans du chat « Demander à MENAO » (F-160, lot D, partie 1)

- Statut : accepté (16/11/2026)
- Fonctionnalité : F-160 ; maquette du lot 59 validée le 16/11/2026 ; moteur : ADR 0346

## Décision

- **Bouton « Demander à MENAO »** dans l'en-tête de chaque appel d'offres créé depuis les plans,
  à toutes les étapes, à côté de la pastille des points à vérifier.
- **Page `/pro/demandes/appels-offres/[id]/demander`**, en trois colonnes sur grand écran (une
  seule colonne sur téléphone) :
  - la conversation, avec des questions proposées au départ, l'envoi par Entrée, « MENAO lit le
    relevé et calcule… » pendant le calcul, les étapes de calcul repliées sous chaque réponse, les
    questions de précision avec leurs réponses en un toucher, et le compteur de questions du mois ;
  - le plan avec le repérage : les pièces citées par le métré sélectionné sont surlignées sur les
    contours tracés, la pièce de la ligne choisie plus fortement ;
  - le métré de la réponse sélectionnée (la dernière qui en a un) : lignes par pièce, fournitures
    chiffrées, total HT recalculé par MENAO, et « Excel » (CSV au séparateur « ; », fait dans le
    navigateur, rien n'est envoyé).
- Action serveur `askPlanChat` (jeton de l'utilisateur vers `plan-chat`) ; durée maximale de la
  page : 150 s. Conversation relue par RLS (`getPlanChat`).
- `planFileLinks` (liens signés des plans) sort de la page de l'appel d'offres pour être partagé.

## Conséquences

- Partie 2 du lot D : « Ajouter au DPGF » et la carte « J'ai une question sur un plan » à la
  création.
- Le faux serveur d'IA de la CI joue le chat (outil « cloison » puis réponse, ou précision) :
  le test de bout en bout passe par la vraie fonction et les vrais calculs.
