# ADR 0228 — Une seule Camille : passage de relais entre les deux assistantes

- Statut : accepté
- Date : 6 novembre 2026
- F-78, demandé le 6 novembre 2026 (« relie les deux Camille »). Suite des ADR 0225 (Camille côté artisans) et 0227 (Camille côté particuliers). Prépare la future ligne téléphonique : un seul numéro pour tout le monde, la secrétaire de MENAO aux heures de bureau, Camille le reste du temps.

## Décision
- **Pour l'appelant, une seule Camille.** À chaque appel, les deux assistantes Vapi forment un groupe (« squad »), décrit dans le code (`voiceSquad`, `@menao/core`) : rien à créer de plus dans Vapi.
  - Celle de la page répond la première : artisans sur les pages Pro, particuliers dans l'assistant des particuliers.
  - Si l'appelant est de l'autre côté, elle passe la main par l'outil de transfert du groupe, sans rien dire : même voix, même prénom.
  - La consigne est remplacée et l'historique est gardé (`swap-system-message-in-history`) : la nouvelle Camille sait ce qui a été dit et enchaîne sans se présenter à nouveau (premier message généré).
- **Deux consignes, pas une.** Les règles se contredisent : côté artisans, Camille donne les prix des formules ; côté particuliers, jamais de prix ni d'estimation. Deux consignes courtes, c'est aussi une Camille plus rapide, moins chère (la consigne est relue à chaque échange) et testée côté par côté.
- **Une seule assistante configurée** (l'autre identifiant absent) : le bouton l'appelle seule, comme avant.
- Le transfert désigne l'autre assistante par son nom dans Vapi (`VOICE_ASSISTANT_NAMES`) : « Camille MENAO » et « Camille particuliers ». Les renommer dans Vapi impose de changer ces noms dans le code.

## Conséquences
- Aucun coût de plus : le passage de relais est gratuit, seules les minutes comptent.
- Chaque consigne dit quand passer la main ; la Camille des particuliers ne renvoie plus les artisans vers les pages Pro.
- Plus tard, la ligne téléphonique ouvrira ce même groupe.
