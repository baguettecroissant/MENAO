import type { Guide } from "./types";

/*
 * Guide « prix des travaux » (lot du 9 novembre 2026). Règle : aucune fourchette de prix sans
 * source fiable et datée. Seul repère officiel trouvé : le coût moyen ADEME d'une PAC air/air de
 * 10-12 kW (guide « Comment choisir sa pompe à chaleur ? », éd. décembre 2025, d'après Observ'ER).
 *
 * TODO(legal): faire relire avant publication :
 * - TVA à 5,5 % des PAC air/air (arrêté du 13 juillet 2026) : seuil de 12 kW par unité ou pour tout
 *   un multi-split, PAC au sol de plus de 12 kW, mention à porter sur le devis, BOFiP pas encore à jour ;
 * - seuils du contrôle d'étanchéité (règlement UE 2024/573) et date de l'exemption « < 3 kg » ;
 * - catégories d'attestation de capacité (révision annoncée par le ministère).
 */
export const prixClimatisationReversible: Guide = {
  slug: "prix-climatisation-reversible",
  audience: "particuliers",
  title: "Prix d'une climatisation réversible posée : coût, TVA à 5,5 % et aides",
  metaTitle: "Prix d'une climatisation réversible posée : coût, TVA et aides",
  description:
    "Climatisation réversible (pompe à chaleur air/air) : le coût moyen relevé par l'ADEME, ce qui fait varier le devis, la TVA à 5,5 % depuis juillet 2026, la prime CEE et les obligations.",
  publishedAt: "2026-11-09",
  updatedAt: "2026-11-09",
  draft: true,
  essentials: [
    "Repère de l'ADEME pour une pompe à chaleur air/air de 10 à 12 kW, de quoi chauffer une maison : en moyenne 10 900 € HT de matériel et 2 640 € HT de pose. Ce repère ne vaut pas pour un appareil d'une seule pièce.",
    "TVA à 5,5 % sur la fourniture et la pose depuis le 18 juillet 2026, si l'appareil remplit des critères de performance. Sinon, 20 % sur le matériel et 10 % sur la pose.",
    "Pas de MaPrimeRénov' ni d'éco-prêt à taux zéro pour une climatisation réversible. Une prime CEE reste possible, avec un installateur RGE.",
    "L'installateur doit détenir une attestation de capacité pour manipuler les fluides frigorigènes, et l'entretien est obligatoire tous les 2 ans à partir de 4 kW.",
  ],
  body: [
    { type: "h2", id: "prix", text: "Combien coûte une climatisation réversible posée ?" },
    {
      type: "p",
      text: "Une climatisation réversible est une **pompe à chaleur air/air** : elle chauffe l'hiver et rafraîchit l'été. France Rénov' la décrit comme plutôt destinée aux régions méditerranéennes, comme les Alpes-Maritimes.",
    },
    {
      type: "table",
      caption:
        "Coût moyen d'installation d'une pompe à chaleur air/air de 10 à 12 kW (ADEME, d'après Observ'ER, marché 2024)",
      head: ["Poste", "Coût moyen HT"],
      rows: [
        ["Matériel", "10 900 €"],
        ["Pose", "2 640 €"],
      ],
    },
    {
      type: "p",
      text: "Ce sont des moyennes nationales pour un appareil qui chauffe tout un logement. L'ADEME précise que le coût varie dans une large fourchette selon le matériel installé et la configuration retenue. Aucun organisme public ne publie de prix par type d'installation (une pièce, plusieurs pièces, gainable) : seuls des devis comparables vous donneront le vrai prix de votre projet.",
    },
    { type: "h2", id: "variation", text: "Ce qui fait varier le prix" },
    {
      type: "list",
      items: [
        "**La puissance** : elle se calcule par un bilan thermique de vos besoins de chauffage et de rafraîchissement. Une pompe à chaleur trop puissante consomme plus, et un logement bien isolé permet de choisir un appareil moins puissant.",
        "**Le nombre d'unités intérieures** : elles se répartissent dans les pièces à chauffer. Un seul groupe extérieur peut en alimenter plusieurs (multi-split), ou un réseau de gaines les remplace (gainable).",
        "**L'emplacement du groupe extérieur** : loin des logements voisins et des fenêtres des chambres, à l'abri du vent et de l'humidité. Selon le lieu, un dispositif anti-bruit peut être nécessaire.",
        "**Les éléments à fournir** : supports muraux ou au sol, unités intérieures et extérieure, raccordements, pompes de relevage pour l'eau de condensation, réseau de gaines pour un gainable.",
        "**Les travaux autour** : percements, électricité, finitions et peinture.",
        "**La performance de l'appareil** : si vous comptez surtout vous chauffer, privilégiez la meilleure efficacité en mode chauffage. Elle conditionne aussi la TVA à 5,5 % et la prime CEE.",
      ],
    },
    { type: "h2", id: "tva", text: "TVA : 5,5 % sous conditions depuis juillet 2026" },
    {
      type: "p",
      text: "Depuis le 18 juillet 2026, la fourniture et la pose d'une pompe à chaleur air/air peuvent bénéficier du taux de 5,5 %, dans un logement achevé depuis plus de 2 ans. L'installateur n'a pas besoin d'être RGE pour l'appliquer.",
    },
    {
      type: "table",
      caption: "TVA d'une climatisation réversible dans un logement achevé depuis plus de 2 ans",
      head: ["Taux", "Quand"],
      rows: [
        [
          "5,5 % sur tout",
          "Appareil fixe installé de façon permanente. Jusqu'à 12 kW : classe énergétique A++ au moins en mono-split, A+ au moins en multi-split. Au-delà de 12 kW : seulement certaines installations en toiture, très performantes. Le fluide frigorigène doit respecter la réglementation européenne en vigueur à la signature du devis.",
        ],
        [
          "20 % et 10 %",
          "Appareil qui ne remplit pas ces critères : 20 % sur le matériel, 10 % sur la pose",
        ],
        ["20 % sur tout", "Climatiseur mobile, ou logement achevé depuis moins de 2 ans"],
      ],
    },
    {
      type: "p",
      text: "Comme pour tout taux réduit, vous certifiez les conditions par une mention sur le devis ou la facture. Les acomptes versés avant le 18 juillet 2026 restent à l'ancien taux. Le détail des conditions est dans notre guide sur la [TVA des travaux](/guides/tva-travaux-taux-reduit).",
    },
    { type: "h2", id: "aides", text: "Les aides" },
    {
      type: "list",
      items: [
        "**MaPrimeRénov' et éco-prêt à taux zéro** : les pompes à chaleur air/air n'y sont pas éligibles.",
        "**Prime CEE** (certificats d'économies d'énergie) : possible pour un appareil de 12 kW au plus avec un coefficient de performance saisonnier (SCOP) d'au moins 3,9, dans un logement de plus de 2 ans, posé par un professionnel RGE. Le montant dépend du fournisseur d'énergie qui verse la prime : demandez-le avant de signer le devis.",
        "**Coup de pouce chauffage** : il ne concerne pas les pompes à chaleur air/air.",
      ],
    },
    {
      type: "callout",
      tone: "warning",
      title: "Démarchage interdit",
      text: "Le démarchage par téléphone, SMS, e-mail ou réseaux sociaux est interdit pour les travaux de rénovation énergétique. Une offre « avec les aides » reçue de cette façon doit vous alerter. Si vous signez chez vous, vous avez 14 jours pour vous rétracter.",
    },
    { type: "h2", id: "obligations", text: "Les obligations à connaître" },
    {
      type: "list",
      items: [
        "**Fluides frigorigènes** : l'entreprise doit détenir une attestation de capacité, délivrée pour 5 ans par un organisme agréé, et ses techniciens une attestation d'aptitude. Demandez-la.",
        "**Mairie** : une déclaration préalable est nécessaire si le groupe extérieur modifie l'aspect de la façade, ou s'il est visible depuis la rue ou un immeuble voisin. Le plan local d'urbanisme peut ajouter des règles.",
        "**Copropriété** : installer un groupe extérieur sur la façade ou un balcon demande un vote de l'assemblée générale à la majorité absolue. Il ne remplace pas la déclaration en mairie.",
        "**Bruit** : une pompe à chaleur trop bruyante peut constituer un trouble anormal de voisinage, puni d'une amende jusqu'à 450 €. D'où l'importance de l'emplacement.",
        "**Entretien** : obligatoire tous les 2 ans pour un appareil de 4 à 70 kW, le premier au plus tard 2 ans après l'installation. Le professionnel vous remet une attestation, à garder au moins 2 ans.",
        "**Contrôle d'étanchéité** : obligatoire au-delà d'une certaine quantité de fluide, selon le fluide utilisé. Demandez à l'installateur si votre appareil est concerné.",
      ],
    },
    { type: "h2", id: "questions", text: "Les questions à poser à l'installateur" },
    {
      type: "list",
      ordered: true,
      items: [
        "Avez-vous fait un bilan thermique, et quelle puissance en ressort ?",
        "Quelle est la classe énergétique de l'appareil, et remplit-il les critères de la TVA à 5,5 % ?",
        "Quel est son coefficient de performance saisonnier (SCOP), et ouvre-t-il droit à une prime CEE ?",
        "Quel niveau sonore pour les unités intérieures et le groupe extérieur, et où placerez-vous ce dernier ?",
        "Pouvez-vous me montrer votre attestation de capacité pour les fluides frigorigènes ?",
        "Êtes-vous RGE, avec quelle qualification ?",
        "Faut-il une déclaration préalable en mairie, et qui s'en charge ?",
        "Qui assurera l'entretien obligatoire tous les 2 ans, et à quel prix ?",
      ],
    },
    {
      type: "h2",
      id: "trouver",
      text: "Trouver un climaticien vérifié dans les Alpes-Maritimes",
    },
    {
      type: "p",
      text: "Sur MENAO, décrivez votre projet : nombre de pièces, surface, emplacement possible du groupe extérieur. Il est transmis aux [climaticiens](/climaticien) disponibles près de chez vous, qui vous envoient leur devis.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "Avant de rendre un artisan visible, l'équipe MENAO vérifie son entreprise et ses documents, dont l'attestation d'assurance décennale. Ses devis, messages et le procès-verbal de réception restent dans votre espace.",
    },
  ],
  faq: [
    {
      q: "Combien coûte une climatisation réversible posée ?",
      a: "Pour une pompe à chaleur air/air de 10 à 12 kW, de quoi chauffer une maison, l'ADEME relève un coût moyen de 10 900 € HT de matériel et 2 640 € HT de pose (marché 2024). Le prix varie fortement selon le matériel et la configuration : comparez des devis établis sur le même projet.",
    },
    {
      q: "Quelle TVA pour une climatisation réversible ?",
      a: "Depuis le 18 juillet 2026, 5,5 % sur la fourniture et la pose si l'appareil est fixe et suffisamment performant (classe A++ en mono-split, A+ en multi-split jusqu'à 12 kW), dans un logement de plus de 2 ans. Sinon, 20 % sur le matériel et 10 % sur la pose.",
    },
    {
      q: "La climatisation réversible est-elle éligible à MaPrimeRénov' ?",
      a: "Non. Les pompes à chaleur air/air ne sont éligibles ni à MaPrimeRénov' ni à l'éco-prêt à taux zéro. Une prime CEE est possible si l'appareil a un SCOP d'au moins 3,9 et qu'il est posé par un professionnel RGE.",
    },
    {
      q: "Faut-il une autorisation pour installer une climatisation ?",
      a: "Une déclaration préalable en mairie est nécessaire si le groupe extérieur modifie l'aspect de la façade ou s'il est visible depuis la rue ou un immeuble voisin. En copropriété, il faut en plus un vote de l'assemblée générale.",
    },
    {
      q: "L'entretien d'une climatisation réversible est-il obligatoire ?",
      a: "Oui, tous les 2 ans pour un appareil de 4 à 70 kW. Le professionnel remet une attestation d'entretien, à conserver au moins 2 ans.",
    },
  ],
  sources: [
    {
      label: "Comment choisir sa pompe à chaleur ? (édition décembre 2025)",
      publisher: "ADEME",
      url: "https://librairie.ademe.fr/batiment/7749-comment-choisir-sa-pompe-a-chaleur--9791029725517.html",
    },
    {
      label: "Se chauffer avec une pompe à chaleur",
      publisher: "ADEME",
      url: "https://agirpourlatransition.ademe.fr/particuliers/amenager-maison/chauffer/pompe-chaleur",
    },
    {
      label: "La pompe à chaleur",
      publisher: "France Rénov'",
      url: "https://france-renov.gouv.fr/renovation/chauffage/pompe-chaleur-maison",
    },
    {
      label: "Le taux de TVA est réduit à 5,5 % pour les pompes à chaleur air/air",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/actualites/A19002",
    },
    {
      label: "TVA : taux réduit des travaux dans les logements (BOI-TVA-LIQ-30-20-90-20)",
      publisher: "BOFiP",
      url: "https://bofip.impots.gouv.fr/bofip/1666-PGP.html",
    },
    {
      label: "Le guide des aides financières 2026",
      publisher: "Anah",
      url: "https://www.anah.gouv.fr/anatheque/le-guide-des-aides-financieres-2026",
    },
    {
      label: "Les aides des fournisseurs d'énergie (CEE)",
      publisher: "France Rénov'",
      url: "https://france-renov.gouv.fr/aides/cee",
    },
    {
      label: "Substances à impact climatique : fluides frigorigènes",
      publisher: "Ministère de la Transition écologique",
      url: "https://www.ecologie.gouv.fr/politiques-publiques/substances-impact-climatique-fluides-frigorigenes",
    },
    {
      label: "L'entretien des pompes à chaleur et des climatiseurs",
      publisher: "ADEME",
      url: "https://librairie.ademe.fr/batiment/6645-8309-l-entretien-des-pompes-a-chaleur-et-des-climatiseurs-9791029722424.html",
    },
    {
      label:
        "Quelle autorisation d'urbanisme pour installer un boîtier extérieur de climatisation ou de pompe à chaleur ?",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F36778",
    },
    {
      label: "Troubles de voisinage : bruits créés par des comportements anormaux",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F612",
    },
    {
      label: "Rénovation énergétique : nos conseils pour éviter les arnaques",
      publisher: "DGCCRF",
      url: "https://www.economie.gouv.fr/particuliers/faire-des-economies-denergie/renovation-energetique-nos-conseils-pour-eviter-les-arnaques",
    },
  ],
  related: [
    { href: "/guides/tva-travaux-taux-reduit", label: "TVA à 5,5 % ou 10 % sur vos travaux" },
    { href: "/guides/choisir-un-artisan", label: "Choisir un artisan : 8 vérifications" },
  ],
};
