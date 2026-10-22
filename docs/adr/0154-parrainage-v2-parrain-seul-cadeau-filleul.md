# ADR 0154 — Parrainage V2 : un mois au parrain seul, un cadeau pour le filleul

- Statut : accepté
- Date : 22 octobre 2026
- Décision des associés du 22 octobre 2026, d'après le « Programme de parrainage » de Mickaël (18 octobre 2026). Modifie l'ADR 0137 (récompense) et l'ADR 0143 (back-office).

## Contexte
- **Avant** : au premier paiement réel du filleul, un mois offert au filleul et un au parrain, sans plafond (ADR 0137).
- **Le programme de parrainage** :
  - le parrain gagne 1 mois par filleul, dès que le filleul paie son premier mois, avec un plafond de 12 mois offerts par an (« soit 1 an gratuit ») ;
  - le filleul a déjà ses 2 mois d'essai (ADR 0153) : on ne lui ajoute pas de mois. Il reçoit un cadeau de bienvenue (t-shirt ou casquette MENAO) à la validation de son dossier ;
  - le filleul doit avoir un dossier vérifié et un SIRET différent de celui de son parrain.

## Décision
- **Récompense du parrain** (`record_subscription_payment`) :
  - au premier paiement réel du filleul, le parrainage passe à « récompensé » et seul le parrain reçoit un crédit « mois offert », posé sur Stripe comme avant (coupon à 100 % sur une facture) ;
  - **plafond** : 12 mois offerts par **année civile, heure de Paris** (`REFERRAL_MONTHS_PER_YEAR`, `app.referrer_months_this_year`). Au-delà, le parrainage est quand même récompensé, mais sans mois offert. Les « cadeaux au-delà de 12 filleuls » du programme restent à définir ;
  - deux filleuls qui paient au même instant sont comptés l'un après l'autre (verrou consultatif par parrain).
- **Même entreprise** : le programme demande un SIRET différent ; le SIRET est déjà unique en base. On compare donc le **SIREN** (même entreprise, autre établissement). S'il est identique, le parrainage en attente est annulé, avec le motif « Même entreprise que le parrain (SIREN identique). », inscrit au journal (`parrainage.annule`). Le contrôle se fait :
  - à la validation du dossier du filleul ;
  - au premier paiement, pour un dossier jamais validé.
- **Cadeau de bienvenue** (`artisan_welcome_gifts`, une ligne par filleul) :
  - créé à la validation du dossier du filleul (déclencheur sur `artisans.status`), une seule fois, même après une suspension ;
  - le filleul choisit dans « Mon profil » (site et application) : t-shirt, avec sa taille (tailles des récompenses des grades), ou casquette. L'adresse de livraison est pré-remplie avec celle de l'entreprise et reste modifiable ;
  - un seul choix (`choose_welcome_gift`), transmis à l'équipe comme les récompenses des grades : un ticket « recompense » dans le SAV. L'équipe envoie le cadeau, puis résout le ticket ; le filleul voit alors « Envoyé le … » ;
  - rappel « Votre cadeau de bienvenue » en dernier dans « À faire maintenant » (`artisanTodo`) tant qu'il n'est pas choisi ;
  - les filleuls déjà validés dont le parrainage attendait encore reçoivent aussi un cadeau (rattrapage de la migration).
- **Application** : la carte du cadeau et l'écran « Votre cadeau » ne parlent ni d'abonnement ni d'achat (règle 10). La carte de parrainage de l'application reste inchangée.
- **Site** : la carte de parrainage annonce le mois offert, le plafond de 12 par an et le cadeau du confrère ; elle affiche les mois gagnés dans l'année, puis le plafond atteint.
- **Back-office** :
  - « Parrainages » : chiffre clé « Cadeaux à envoyer » (avec le nombre à choisir) à la place de « Annulés », qui reste dans les filtres ; colonne « Récompenses » (mois du parrain ou plafond atteint, mois du filleul pour les parrainages d'avant, cadeau du filleul) ;
  - fiche de l'artisan : mois de l'année et cadeau de bienvenue, avec le lien vers sa demande ;
  - l'annulation d'un abus retire aussi le cadeau pas encore choisi.
- **Droits** : le filleul lit son cadeau, l'équipe (staff) tous les cadeaux. Les écritures passent par les fonctions.
- **Ce qui ne change pas** : les mois déjà offerts aux filleuls (V1) restent dus et sont posés comme avant ; le code, le lien `/p/<code>/pro` et l'inscription.

## Conséquences
- **Migration `parrainage_v2`** : une table (RLS et politique), un type, un déclencheur et des fonctions. Tests pgTAP `78_parrainage_v2`, test `69_parrainage` adapté. Pas de nouvelle dépendance.
- **Plus tard, dans le programme** : rubrique « Mes artisans partenaires » et mention « Recommandé par », score de fidélité du parrain, QR code et message WhatsApp, notifications (premier chantier signé, 3e mois, avis 5 étoiles), invitation d'un artisan par un particulier, panneau de permis de construire, commission réduite du commercial.
- **[TODO(legal)]** : les conditions du parrainage (plafond, cadeau, exclusion d'une même entreprise) sont à inscrire dans les CGV artisans.
