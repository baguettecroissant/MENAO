import { COMPANY, COMPANY_LINE } from "./company";
import type { LegalDocument } from "./types";

/** Date de la version publiée des CGV artisans (même jour que `CGV_VERSION` du cœur). */
export const CGV_UPDATED_AT = "2026-11-22";

// TODO(legal) : version provisoire publiée le 22 novembre 2026 à la demande des dirigeants, avant
// la relecture de l'avocat (projet du 20 novembre, ADR 0383). Points tranchés pour pouvoir
// publier, à faire valider : majoration de 15 % et exigibilité des mensualités restantes en cas
// d'impayé (article 11) ; aucune sortie pour cessation d'activité, liquidation ou décès
// (article 9, décision « aucune sortie anticipée ») ; hausse annoncée 4 mois avant l'échéance,
// sans plafond (article 12) ; rétractation de 14 jours en présence d'un commercial et carte
// enregistrée sans prélèvement (article 14) ; plafond de responsabilité de 12 mois (article 17) ;
// clause de sous-traitance des données réduite à l'essentiel, accord complet à annexer
// (article 18) ; juridiction de droit commun, sans clause attributive (article 19) ; médiateur.
export const cgvArtisans: LegalDocument = {
  title: "Conditions générales de vente artisans",
  intro: "L'abonnement des professionnels du bâtiment à MENAO.",
  updatedAt: CGV_UPDATED_AT,
  blocks: [
    { type: "h2", id: "objet", text: "Article 1. Objet et champ d'application" },
    {
      type: "p",
      text: `Les présentes conditions générales de vente régissent l'abonnement souscrit par un professionnel du bâtiment (« l'Artisan ») auprès de ${COMPANY_LINE} (« MENAO »).`,
    },
    {
      type: "p",
      text: "L'abonnement donne accès à la plateforme MENAO : mise en relation avec des particuliers qui recherchent un artisan, et outils de devis, de signature, de paiement et de suivi de chantier décrits sur le site pour la formule choisie.",
    },
    {
      type: "p",
      text: "L'Artisan reconnaît contracter en qualité de professionnel, pour les besoins de son activité. Les présentes conditions prévalent sur tout document de l'Artisan. Elles complètent les [conditions générales d'utilisation](/cgu) et la charte qualité, que l'Artisan accepte également.",
    },

    { type: "h2", id: "inscription", text: "Article 2. Inscription et vérification" },
    {
      type: "p",
      text: "L'inscription se fait en ligne. L'Artisan fournit les informations et les documents demandés : identification de l'entreprise, pièce d'identité du dirigeant, attestation d'assurance décennale lorsque son activité y est soumise, attestation de responsabilité civile professionnelle, attestation de vigilance URSSAF. Il en garantit l'exactitude et les tient à jour.",
    },
    {
      type: "p",
      text: "MENAO vérifie le dossier. Elle peut refuser une inscription, notamment si un document manque, est périmé ou ne correspond pas à l'entreprise. Le refus est motivé. Aucune somme n'est due par un Artisan dont le dossier est refusé, et tout abonnement déjà souscrit est annulé sans frais.",
    },

    { type: "h2", id: "mise-en-ligne", text: "Article 3. Mise en ligne" },
    {
      type: "p",
      text: "La fiche de l'Artisan est mise en ligne, et l'Artisan peut recevoir des demandes, lorsque trois conditions sont réunies : son dossier est validé par MENAO, il a souscrit une formule, et son compte de paiement est actif. MENAO lui confirme la date de mise en ligne par e-mail. Cette date est le point de départ de l'essai gratuit.",
    },

    { type: "h2", id: "formules-prix", text: "Article 4. Formules et prix" },
    {
      type: "p",
      text: "MENAO propose trois formules, Base, Premium et Ultimate, dont le contenu et les limites sont décrits sur la [page des formules](/pro/formules) à la date de la souscription. L'Artisan choisit sa formule à l'inscription.",
    },
    {
      type: "p",
      text: "Les prix sont ceux affichés sur cette page au jour de la souscription : 150 euros, 350 euros et 950 euros par mois, hors taxes. La taxe sur la valeur ajoutée s'ajoute au taux en vigueur. Le prix est payable d'avance, chaque mois, ou en une fois pour douze mois, avec deux mois offerts.",
    },
    {
      type: "p",
      text: "MENAO ne prélève aucune commission sur les chantiers de l'Artisan. L'abonnement est la seule somme due à MENAO.",
    },
    {
      type: "p",
      text: "L'Artisan peut passer à une formule supérieure à tout moment ; le nouveau prix s'applique aussitôt, au prorata de la période en cours, et la durée d'engagement en cours n'est pas modifiée. Le passage à une formule inférieure prend effet à l'échéance de la période d'engagement en cours.",
    },

    { type: "h2", id: "essai", text: "Article 5. Essai gratuit" },
    {
      type: "p",
      text: "L'Artisan bénéficie d'un essai gratuit de deux mois à compter de la date de mise en ligne de sa fiche. Aucune somme n'est prélevée pendant l'essai.",
    },
    {
      type: "p",
      text: "Pendant l'essai, l'Artisan peut mettre fin à son abonnement à tout moment depuis son espace en ligne, sans frais et sans motif. Dans ce cas, aucune somme n'est due et la période d'engagement ne commence pas.",
    },
    {
      type: "p",
      text: "MENAO rappelle à l'Artisan la fin de son essai par e-mail, sept jours puis un jour avant son terme. Ce rappel indique la formule, le prix, la date du premier prélèvement, la durée de l'engagement et la manière d'y renoncer.",
    },
    {
      type: "p",
      text: "Si la fiche de l'Artisan n'est jamais mise en ligne, l'essai ne commence pas et aucune somme n'est due.",
    },

    { type: "h2", id: "duree", text: "Article 6. Durée et engagement" },
    {
      type: "p",
      text: "À la fin de l'essai gratuit, l'abonnement est conclu pour une durée ferme de douze mois à compter du premier paiement, qui a lieu le lendemain du dernier jour de l'essai. La date de fin de cette période, appelée « l'échéance », est affichée en permanence dans l'espace en ligne de l'Artisan.",
    },
    {
      type: "p",
      text: "L'Artisan accepte cet engagement à l'inscription, en cochant une case distincte de l'acceptation des présentes conditions, ainsi rédigée : « Je m'engage pour douze mois à compter de mon premier paiement, à la fin de mon essai gratuit de deux mois. Je peux renoncer sans frais à tout moment pendant l'essai. » Sans cette case cochée, l'abonnement ne peut pas être souscrit.",
    },
    {
      type: "p",
      text: "MENAO conserve la preuve de cette acceptation : date, heure, texte de la case et version des conditions acceptées.",
    },

    { type: "h2", id: "reconduction", text: "Article 7. Reconduction" },
    {
      type: "p",
      text: "À l'échéance, l'abonnement est reconduit tacitement pour une nouvelle période ferme de douze mois, aux mêmes conditions, sauf si l'une des parties s'y oppose dans les formes de l'article 8. Il en va de même à chaque échéance suivante.",
    },
    {
      type: "p",
      text: "MENAO prévient l'Artisan par e-mail au moins trente jours avant la date limite pour s'opposer à la reconduction, soit environ quatre mois avant l'échéance. Ce message rappelle la date de l'échéance, la date limite pour s'opposer à la reconduction, le prix de la période suivante et le lien direct vers la page de résiliation.",
    },
    {
      type: "p",
      text: "Si MENAO n'a pas envoyé ce rappel, l'Artisan peut mettre fin à l'abonnement reconduit à tout moment, sans frais, avec effet à la fin du mois en cours.",
    },

    { type: "h2", id: "resiliation", text: "Article 8. Résiliation à l'échéance" },
    {
      type: "p",
      text: "L'Artisan peut s'opposer à la reconduction au plus tard trois mois avant l'échéance :",
    },
    {
      type: "list",
      items: [
        "depuis son espace en ligne, rubrique « Ma formule », en quelques clics et sans avoir à donner de motif ;",
        "ou par lettre recommandée avec accusé de réception adressée au siège de MENAO.",
      ],
    },
    {
      type: "p",
      text: "MENAO confirme la résiliation par e-mail le jour même, avec la date de fin de l'abonnement. L'abonnement reste actif et dû jusqu'à l'échéance ; la fiche de l'Artisan reste en ligne jusqu'à cette date.",
    },
    {
      type: "p",
      text: "Une résiliation demandée moins de trois mois avant l'échéance prend effet à l'échéance de la période suivante.",
    },

    { type: "h2", id: "sortie", text: "Article 9. Aucune sortie avant l'échéance" },
    {
      type: "p",
      text: "L'Artisan ne peut pas mettre fin à son abonnement avant l'échéance. Les mensualités restent dues jusqu'à cette date, même si l'Artisan cesse d'utiliser le service ou demande la suspension de sa fiche.",
    },
    {
      type: "p",
      text: "Par exception, l'abonnement prend fin avant l'échéance, sans que les mensualités restantes soient dues, dans les cas suivants :",
    },
    {
      type: "list",
      items: [
        "refus par l'Artisan d'une modification des conditions, dans les formes de l'article 12 ;",
        "manquement grave de MENAO à ses obligations, non réparé trente jours après une mise en demeure.",
      ],
    },
    {
      type: "p",
      text: "Pour l'abonnement payé en une fois pour douze mois, la somme payée reste acquise à MENAO ; aucune indemnité supplémentaire n'est due.",
    },

    {
      type: "h2",
      id: "mise-en-relation",
      text: "Article 10. Mise en relation, sans garantie de résultat",
    },
    {
      type: "p",
      text: "MENAO met l'Artisan en relation avec des particuliers qui ont un projet de travaux dans ses métiers et dans sa zone. MENAO ne garantit ni un nombre de demandes, ni la signature d'un devis, ni un chiffre d'affaires. Le nombre de demandes indiqué pour chaque formule est un plafond mensuel, pas une garantie.",
    },
    {
      type: "p",
      text: "Le nombre de demandes reçues est affiché dans l'espace en ligne de l'Artisan.",
    },

    { type: "h2", id: "paiement", text: "Article 11. Paiement et retard" },
    {
      type: "p",
      text: "L'abonnement est payé par prélèvement sur la carte bancaire ou par prélèvement SEPA sur le compte que l'Artisan enregistre à l'inscription. Le paiement est traité par le prestataire Stripe ; MENAO ne conserve pas les données de la carte ni du compte.",
    },
    {
      type: "p",
      text: "Le premier prélèvement a lieu le lendemain du dernier jour de l'essai gratuit, puis à la même date chaque mois. Une facture est mise à disposition dans l'espace en ligne à chaque prélèvement.",
    },
    {
      type: "p",
      text: "En cas d'échec d'un prélèvement, MENAO prévient l'Artisan par e-mail et représente le paiement dans les jours qui suivent. Toute somme non payée à sa date porte, de plein droit et sans rappel, des pénalités de retard au taux de refinancement de la Banque centrale européenne majoré de dix points, ainsi que l'indemnité forfaitaire pour frais de recouvrement de 40 euros prévue par le code de commerce. Elle est en outre majorée de 15 %, à titre de clause pénale.",
    },
    {
      type: "p",
      text: "Si la somme reste impayée quinze jours après une mise en demeure envoyée par e-mail, MENAO peut suspendre la fiche de l'Artisan et l'envoi des demandes jusqu'au paiement complet. Si elle reste impayée trente jours après cette mise en demeure, MENAO peut résilier l'abonnement ; les mensualités restant à courir jusqu'à l'échéance deviennent alors immédiatement exigibles.",
    },
    {
      type: "p",
      text: "La suspension pour impayé ne reporte pas l'échéance et ne dispense pas l'Artisan des mensualités de la période suspendue.",
    },

    {
      type: "h2",
      id: "modifications",
      text: "Article 12. Modification des conditions et des prix",
    },
    {
      type: "p",
      text: "MENAO peut modifier les présentes conditions. L'Artisan en est prévenu par e-mail au moins trente jours avant l'entrée en vigueur, avec le texte des changements. Ce délai ne s'applique pas aux modifications imposées par la loi ou nécessaires pour parer à un danger immédiat (fraude, sécurité).",
    },
    {
      type: "p",
      text: "L'Artisan qui refuse une modification peut mettre fin à son abonnement avant son entrée en vigueur, depuis son espace en ligne, sans indemnité. L'abonnement prend fin à la date d'entrée en vigueur de la modification.",
    },
    {
      type: "p",
      text: "Le prix de l'abonnement ne change pas pendant une période d'engagement en cours. MENAO peut le modifier pour la période suivante, en l'annonçant au moins quatre mois avant l'échéance, dans le rappel prévu à l'article 7, de sorte que l'Artisan puisse encore s'opposer à la reconduction dans le délai de l'article 8. L'Artisan qui refuse le nouveau prix s'oppose à la reconduction dans les formes de l'article 8.",
    },
    {
      type: "p",
      text: "MENAO peut faire évoluer le contenu des formules, à condition de ne pas retirer une fonction essentielle de la formule souscrite pendant la période d'engagement en cours.",
    },

    { type: "h2", id: "suspension", text: "Article 13. Suspension et résiliation par MENAO" },
    {
      type: "p",
      text: "MENAO peut suspendre la fiche de l'Artisan, en tout ou partie, dans les cas suivants :",
    },
    {
      type: "list",
      items: [
        "document obligatoire expiré, manquant ou refusé (assurance décennale, responsabilité civile professionnelle, attestation de vigilance, extrait d'immatriculation) ;",
        "manquement à la charte qualité acceptée à l'inscription ;",
        "information fausse ou trompeuse sur la fiche ;",
        "impayé, dans les conditions de l'article 11 ;",
        "comportement signalé par des particuliers et vérifié par MENAO (abandon de chantier, pratique commerciale déloyale, propos injurieux).",
      ],
    },
    {
      type: "p",
      text: "MENAO informe l'Artisan par e-mail, au plus tard au moment où la suspension prend effet, en lui en donnant les motifs précis et le moyen de les contester. La suspension est levée dès que sa cause disparaît.",
    },
    {
      type: "p",
      text: "MENAO peut résilier l'abonnement si le manquement n'est pas réparé trente jours après une mise en demeure motivée. Ce délai ne s'applique pas en cas de fraude, de manquement répété ou d'obligation légale de retirer la fiche.",
    },
    {
      type: "p",
      text: "Lorsque la suspension ou la résiliation tient à un document expiré que l'Artisan renouvelle dans les trente jours, aucune somme supplémentaire n'est due. Lorsqu'elle tient à une faute de l'Artisan, les mensualités de la période suspendue restent dues et, en cas de résiliation, les mensualités restant à courir jusqu'à l'échéance deviennent exigibles.",
    },

    { type: "h2", id: "commercial", text: "Article 14. Souscription auprès d'un commercial" },
    {
      type: "p",
      text: "Cet article s'applique lorsque l'Artisan souscrit l'abonnement en présence d'un commercial de MENAO, en dehors des locaux de MENAO (chantier, atelier, domicile ou locaux de l'Artisan). Le commercial ne fait rien signer sur papier et ne saisit jamais les moyens de paiement de l'Artisan : la souscription se fait en ligne, par l'Artisan lui-même, à partir du lien que le commercial lui transmet.",
    },
    {
      type: "p",
      text: "L'Artisan dispose alors d'un droit de rétractation de quatorze jours à compter de la souscription, sans motif ni frais, quel que soit le nombre de ses salariés. Dans ce cas :",
    },
    {
      type: "list",
      items: [
        "MENAO remet à l'Artisan, sur support durable, un exemplaire du contrat, les informations précontractuelles et un formulaire de rétractation ;",
        `l'Artisan exerce sa rétractation depuis son espace en ligne, par e-mail à ${COMPANY.email} ou en renvoyant le formulaire ;`,
        "aucun paiement n'est demandé avant l'expiration d'un délai de sept jours à compter de la souscription.",
      ],
    },
    {
      type: "p",
      text: "L'essai gratuit de deux mois s'ajoute à ce droit et ne le remplace pas.",
    },
    {
      type: "p",
      text: "Le commercial n'a pas le pouvoir de modifier les présentes conditions ni de prendre un engagement qui n'y figure pas. Toute remise ou tout avantage particulier est confirmé par écrit par MENAO.",
    },

    { type: "h2", id: "obligations", text: "Article 15. Obligations de l'Artisan" },
    { type: "p", text: "L'Artisan s'engage, pendant toute la durée de l'abonnement, à :" },
    {
      type: "list",
      items: [
        "exercer légalement son activité et rester immatriculé ;",
        "détenir les assurances obligatoires pour ses métiers et en déposer les attestations à jour dans son espace en ligne ;",
        "fournir des informations exactes sur sa fiche (métiers, zone, qualifications, photos de ses propres réalisations) et les tenir à jour ;",
        "respecter la charte qualité acceptée à l'inscription ;",
        "répondre aux demandes reçues dans le délai affiché et prévenir le particulier s'il renonce à un projet ;",
        "établir ses devis et ses factures sous sa seule responsabilité, dans le respect des règles qui s'appliquent à son activité ;",
        "ne pas utiliser les coordonnées des particuliers pour autre chose que le projet pour lequel elles lui ont été transmises ;",
        "garder ses identifiants confidentiels et ne pas céder son compte.",
      ],
    },

    { type: "h2", id: "paiement-chantiers", text: "Article 16. Paiement des chantiers" },
    {
      type: "p",
      text: "Les sommes payées par les particuliers pour les chantiers sont versées directement sur le compte de paiement de l'Artisan, ouvert auprès du prestataire Stripe. MENAO n'encaisse aucune de ces sommes, ne les détient à aucun moment et ne prélève aucune commission.",
    },
    {
      type: "p",
      text: "L'ouverture de ce compte suppose que l'Artisan accepte les conditions de Stripe et lui fournisse les informations que la réglementation exige. Les frais de transaction de Stripe sont à la charge de l'Artisan, selon la grille tarifaire publique de Stripe.",
    },
    {
      type: "p",
      text: "Les litiges de paiement, les remboursements et les contestations bancaires se règlent entre l'Artisan, son client et Stripe.",
    },

    { type: "h2", id: "responsabilite", text: "Article 17. Responsabilité" },
    {
      type: "p",
      text: "MENAO est un intermédiaire et un éditeur de logiciel. MENAO n'est pas partie aux devis, contrats et chantiers conclus entre l'Artisan et ses clients, et ne répond ni de leur exécution ni de leur paiement.",
    },
    {
      type: "p",
      text: "MENAO s'engage à fournir le service avec soin et à le maintenir accessible, sauf maintenance annoncée, panne d'un prestataire ou cas de force majeure. Il s'agit d'une obligation de moyens.",
    },
    {
      type: "p",
      text: "Les outils d'aide proposés par MENAO (modèles, calculs, suggestions et lectures automatiques de documents) sont une assistance. L'Artisan vérifie ce qu'il envoie à ses clients et en reste responsable.",
    },
    {
      type: "p",
      text: "La responsabilité de MENAO est limitée aux dommages directs et prévisibles, dans la limite des sommes payées par l'Artisan au titre de l'abonnement pendant les douze mois qui précèdent le fait à l'origine du dommage. Cette limite ne s'applique ni en cas de faute lourde ou intentionnelle, ni en cas de dommage corporel.",
    },

    { type: "h2", id: "donnees", text: "Article 18. Données" },
    {
      type: "p",
      text: "MENAO traite les données personnelles de l'Artisan pour gérer son compte, vérifier son dossier, lui transmettre des demandes et facturer l'abonnement, selon sa [politique de confidentialité](/confidentialite).",
    },
    {
      type: "p",
      text: "Pour les données de ses propres clients que l'Artisan enregistre dans les outils de MENAO (devis, factures, suivi de chantier), l'Artisan est responsable du traitement et MENAO agit pour son compte. MENAO ne traite ces données que pour fournir le service et sur instruction de l'Artisan, en garantit la confidentialité et la sécurité, et les restitue ou les supprime à la fin de l'abonnement dans les conditions ci-dessous.",
    },
    {
      type: "p",
      text: "L'Artisan reste propriétaire de ses contenus : devis, factures, photos, bibliothèque d'ouvrages. Il autorise MENAO à afficher sa fiche, son logo et ses photos sur la plateforme pendant la durée de l'abonnement.",
    },
    {
      type: "p",
      text: "À la fin de l'abonnement, l'Artisan peut télécharger ses devis, factures et données dans un format courant pendant quatre-vingt-dix jours. Passé ce délai, MENAO supprime ces données, sauf celles que la loi lui impose de conserver. Les avis publiés par les particuliers restent régis par les règles sur les avis en ligne.",
    },

    { type: "h2", id: "litiges", text: "Article 19. Réclamations, droit applicable et litiges" },
    {
      type: "p",
      text: `Toute réclamation est adressée à MENAO depuis l'espace en ligne ou à l'adresse ${COMPANY.email}. MENAO en accuse réception et y répond dans un délai de quinze jours ouvrés.`,
    },
    { type: "p", text: "Les parties cherchent d'abord une solution amiable." },
    {
      type: "p",
      text: "Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, le litige est porté devant le tribunal compétent.",
    },
    {
      type: "p",
      text: "Si une clause est jugée nulle, les autres continuent de s'appliquer.",
    },
  ],
};
