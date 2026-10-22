# ADR 0161 — Réseau du parrain : partenaires, « Recommandé par », suivi des filleuls, QR code, propositions de parrainer, cartes de visite

- Statut : accepté
- Date : 22 octobre 2026
- Lot 6 du plan V1.1, première partie (côté artisan), d'après le « Programme de parrainage » de Mickaël (18 octobre 2026). Les récompenses V2 sont dans l'ADR 0154. L'invitation d'un artisan par un particulier fera l'objet de la seconde partie.

## Décision
- **Artisans partenaires et « Recommandé par »** (`app.artisan_profile_json`) :
  - la fiche du parrain montre ses filleuls dans « Artisans partenaires », 6 au plus, les plus anciens d'abord ;
  - la fiche du filleul affiche « Recommandé par <parrain> » ;
  - seuls comptent les artisans **visibles** des particuliers et les parrainages **non annulés**. Le nom affiché est le nom public (jamais la raison sociale en diffusion partielle, ADR 0144) ;
  - sur le site, chaque nom mène à la fiche publique de l'artisan ; dans l'application, il est affiché sans lien.
- **Suivi de chaque filleul** (`my_referrals`) : nom, date d'inscription et étape.
  - **Étapes** : inscription en cours, dossier validé (période d'essai), abonné (parrainage récompensé) ou non retenu (annulé, refusé, radié).
  - **Affichage** : dans « Mon profil », sur le site et dans l'application. L'application dit « Parrainage validé » au lieu d'« Abonné » et ne parle ni de mois offert ni d'abonnement (règle 10).
- **Score de fidélité** : le nombre de confrères devenus abonnés (`rewarded` de `my_referral`), affiché au parrain.
  - Il n'est ni public ni pris en compte dans le classement : le document ne dit pas à quoi il doit servir. **[À VALIDER]** s'il doit devenir public ou peser dans le classement.
- **QR code et message WhatsApp** (site) : la carte de parrainage montre le QR code du lien de parrainage.
  - Le QR code est calculé côté serveur avec `toqr`, déjà utilisé pour la page de l'application : pas de nouvelle dépendance.
  - Un bouton ouvre WhatsApp avec un message déjà rédigé (`whatsAppShareUrl`) : l'artisan choisit le destinataire.
- **Propositions de parrainer** (notification `parrainage_suggestion`, e-mail et push) :
  - **Moments** :
    - au premier devis signé de l'artisan ;
    - au premier paiement de son abonnement, soit au début du 3e mois après les 2 mois d'essai ;
    - à chaque avis publié à 5 étoiles (note d'au moins 90 sur 100, `reviewStars`).
  - **Limites** : au plus une proposition tous les 7 jours, pour ne pas doubler la notification d'avis reçu ; artisans validés seulement.
  - **Préférences** : c'est un rappel facultatif, désactivable dans les préférences d'e-mail (catégorie « rappels »).
  - **Textes** : l'objet et l'aperçu, repris dans l'application, ne parlent pas de l'abonnement ; l'e-mail rappelle le mois offert.
- **Cartes de visite pour les clients** (`/pro/cartes-de-visite`, site) : une planche A4 de 10 cartes de 85 × 55 mm, à imprimer depuis le navigateur.
  - **Contenu** : nom public, prénom et nom, métier, téléphone, et QR code de la fiche publique avec « Mes réalisations et mes avis vérifiés ».
  - **Disponibilité** : seulement pour un artisan visible, dont la fiche publique existe.
  - **Accès** : la page est accessible depuis « Mon profil ».
- **Pas dans ce lot** :
  - **« Invitez votre artisan de confiance »** côté particulier : seconde partie du lot ;
  - **dépôt d'avis par un client trouvé hors MENAO** : les avis restent liés à un chantier MENAO, la carte mène à la fiche ;
  - **commission réduite du commercial** quand l'artisan vient d'un parrain : montant **[À VALIDER]** ;
  - **panneau de permis de construire** : à vérifier d'abord (mentions légales, coût).

## Conséquences
- **Migrations** : `type_parrainage_suggestion` (valeur d'enum seule) et `reseau_parrainage`. Tests pgTAP : `84_reseau_parrainage`.
- **Après la fusion** :
  - pousser les migrations ;
  - redéployer `notify`, pour le nouveau modèle d'e-mail.
- **[TODO(legal)]** : affichage public du lien de parrainage entre deux entreprises (« Recommandé par », « Artisans partenaires »), à mentionner dans les CGV artisans avec les conditions du parrainage.
- **Pas de nouvelle dépendance.**
