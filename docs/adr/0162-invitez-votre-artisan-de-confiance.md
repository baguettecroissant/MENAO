# ADR 0162 — « Invitez votre artisan de confiance »

- Statut : accepté
- Date : 22 octobre 2026
- Lot 6 du plan V1.1, seconde partie (côté particulier), d'après le « Programme de parrainage » de Mickaël (18 octobre 2026), partie 4. La première partie (réseau du parrain) est l'ADR 0161.

## Décision
- **Invitation** (`invite_artisan`, page `/mon-espace/inviter-un-artisan` et écran « Inviter un artisan » de l'application) : un particulier connecté invite un artisan qui n'est pas encore sur MENAO.
  - **Champs** : nom de l'artisan ou de son entreprise, téléphone (normalisé en +33…) ou e-mail (l'un des deux au moins), personne à contacter, métier (sur le site), ville, et ce que le client a apprécié.
  - **Accès** : une carte « Invitez votre artisan de confiance » en bas de « Mes chantiers », sur le site comme dans l'application.
- **Suivi par l'équipe** :
  - un ticket « Invitation d'un artisan » (échéance 3 jours) reprend ce que le client a saisi ;
  - une note interne invite à rappeler l'artisan : « Un de vos clients vous recommande » ;
  - le client voit l'échange dans « Mes échanges », où l'équipe peut lui répondre (réponse type « Artisan contacté »).
- **Artisan inscrit** :
  - **correspondance** : quand un artisan est validé et que son téléphone ou son e-mail correspond à une invitation encore ouverte, elle passe à « inscrit » ;
  - **équipe** : une note sur le ticket prévient l'équipe que le cadeau de remerciement du client est à prévoir ;
  - **client** : il voit le statut dans la liste de ses invitations.
- **Limites** :
  - 5 invitations au plus par particulier sur 30 jours ;
  - pas de doublon (même téléphone ou même e-mail encore en attente).
- **Données de l'artisan invité** :
  - **usage** : contacter l'artisan, rien d'autre ; le formulaire le dit ;
  - **lecture** : par le client qui les a saisies et par l'équipe seulement ;
  - **effacement** : 12 mois après l'invitation s'il n'a pas rejoint MENAO, dans l'invitation comme dans le ticket (tâche quotidienne `menao-purge-invitations`).
- **Pas dans ce lot** :
  - **cadeau de remerciement du particulier** : sa nature reste **[À VALIDER]** (bon d'achat, objet MENAO…). Rien n'est promis au client tant qu'il n'est pas défini ;
  - **commission réduite du commercial** quand l'artisan vient d'une recommandation : montant **[À VALIDER]** ;
  - **panneau de permis de construire** : à vérifier d'abord (mentions légales, coût).

## Conséquences
- **Migrations** : `type_invitation_artisan` (valeur d'enum seule) et `invitation_artisan`. Tests pgTAP : `85_invitation_artisan`.
- **Après la fusion** : pousser les migrations (pas de fonction à redéployer).
- **[TODO(legal)]** : information de l'artisan invité lors du premier contact (origine de ses coordonnées, droit d'opposition, RGPD article 14), base légale (intérêt légitime, prospection entre professionnels) et durée de conservation de 12 mois, à faire valider et à mentionner dans la politique de confidentialité.
- **Pas de nouvelle dépendance.**
