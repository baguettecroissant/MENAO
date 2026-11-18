# ADR 0375 — Date de naissance lue sur la pièce d'identité

- Statut : accepté (« go pour A », 18/11/2026)
- Fonctionnalité : F-178 (suite des ADR 0176 et 0215)

## Contexte

À l'étape « Paiements », l'artisan saisit sa date de naissance, que Stripe exige. Or il vient de
déposer sa pièce d'identité, que MENAO lit déjà (ADR 0176) pour en relever la date d'expiration.
Cette date de naissance part directement chez Stripe sans être enregistrée par MENAO (ADR 0215) :
c'est écrit sur l'écran et prévu ainsi pour les conditions des artisans.

Trois façons de la reprendre ont été comparées : la garder sur l'appareil, relire la pièce à
l'étape « Paiements » (un appel au modèle de plus à chaque ouverture), ou l'enregistrer en base
(une donnée personnelle de plus chez MENAO, conditions à modifier).

## Décision

**La date lue reste sur l'appareil de l'artisan.**

1. `read-document` relève `date_naissance` sur une pièce d'identité. `normalizeDocumentReading`
   ne la renvoie (`birthDate`) que pour une pièce lisible, du bon type, et si la date est plausible
   (`plausibleBirthDate` : au calendrier, depuis 1900, 16 ans au moins).
2. La fonction la renvoie à l'artisan dans sa réponse. Elle n'est **ni enregistrée ni
   journalisée** : aucune colonne, rien dans `ai_runs`, rien dans les logs.
3. Le site la range dans le `localStorage` du navigateur, l'application dans le trousseau chiffré
   du téléphone (`kv`), sous une clé propre au compte.
4. À l'étape « Paiements », le champ arrive rempli avec la mention « Lue sur votre pièce
   d'identité. Vérifiez-la, corrigez-la si besoin. » ; il reste modifiable.
5. Une fois le compte Stripe créé, la valeur est effacée de l'appareil.

## Conséquences

- La phrase « sans être enregistrées par MENAO » reste vraie ; le `TODO(legal)` de l'ADR 0215 ne
  change pas.
- Pièce déposée sur un appareil et paiements faits sur un autre : le champ reste à saisir, comme
  avant. Si les essais montrent que le cas est fréquent, relire la pièce à l'étape « Paiements »
  pourra s'ajouter.
- La consigne du modèle change (un champ de plus) : lecture réelle à essayer sur une pièce fictive
  après le déploiement de `read-document`.
- Aucune migration. Fonction `read-document` à redéployer.
