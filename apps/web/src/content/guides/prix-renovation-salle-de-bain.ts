import type { Guide } from "./types";

/*
 * Guide « prix des travaux » (lot du 9 novembre 2026). Règle : aucune fourchette de prix sans
 * source fiable et datée. Pour la salle de bain, aucun organisme public ni fédération n'en publie
 * (recherche du 09/11/2026) : le guide n'avance donc aucun montant de travaux.
 *
 * TODO(legal): faire relire avant publication :
 * - meuble vasque et équipements à 10 % seulement s'ils sont intégrés au bâti (BOFiP § 280-300) ;
 * - ne rien affirmer sur la garantie (décennale ou biennale) de l'étanchéité sous carrelage ;
 * - revérifier l'ouverture du guichet MaPrimeAdapt', les plafonds de ressources et le forfait AMO.
 */
export const prixRenovationSalleDeBain: Guide = {
  slug: "prix-renovation-salle-de-bain",
  audience: "particuliers",
  title: "Prix d'une rénovation de salle de bain : ce qui le fait varier, et les aides",
  metaTitle: "Prix d'une rénovation de salle de bain : ce qui le fait varier",
  description:
    "Rénover une salle de bain : ce qui fait monter le devis (évacuations, étanchéité, électricité), le taux de TVA, MaPrimeAdapt' en 2026 et les questions à poser à l'artisan.",
  publishedAt: "2026-11-09",
  updatedAt: "2026-11-09",
  draft: true,
  essentials: [
    "Aucun barème officiel n'existe : le prix dépend surtout de l'état de la pièce, du déplacement des évacuations, de l'étanchéité et du nombre de métiers qui interviennent.",
    "TVA à 10 % dans un logement achevé depuis plus de 2 ans, sur les travaux et les équipements intégrés fournis et posés par l'entreprise. Un équipement que vous achetez vous-même reste à 20 %.",
    "MaPrimeAdapt' finance 50 % ou 70 % des travaux d'adaptation, dans la limite de 22 000 € HT, pour les 70 ans et plus ou les 60-69 ans en perte d'autonomie, sous conditions de ressources.",
    "Le crédit d'impôt pour l'adaptation du logement est supprimé pour les dépenses payées depuis le 1er janvier 2026.",
  ],
  body: [
    { type: "h2", id: "prix", text: "Combien coûte une rénovation de salle de bain ?" },
    {
      type: "p",
      text: "Aucun organisme public ni fédération du bâtiment ne publie de prix de référence pour une salle de bain, et les montants affichés en ligne viennent de sites commerciaux. Nous préférons ne pas donner de chiffre : à surface égale, le prix dépend surtout de ce qu'il faut refaire derrière le carrelage.",
    },
    {
      type: "p",
      text: "Le bon repère reste la comparaison de **deux ou trois devis détaillés**, établis sur le même descriptif : mêmes équipements, même type de douche, mêmes finitions. Vérifiez qu'aucun poste ne manque, comme l'étanchéité, la ventilation ou l'enlèvement des déchets.",
    },
    { type: "h2", id: "variation", text: "Ce qui fait varier le prix" },
    {
      type: "p",
      text: "L'Agence Qualité Construction recommande de faire le point sur ces éléments avant tout projet. Chacun peut ajouter des travaux au devis :",
    },
    {
      type: "list",
      items: [
        "**La position des évacuations** : il est souhaitable que les équipements restent proches des colonnes d'eaux usées et d'eaux vannes. Les déplacer demande plus de plomberie, parfois de casser le sol.",
        "**Le plancher** : il doit supporter les nouvelles charges. Un plancher en bois peut devoir être renforcé.",
        "**Les murs et cloisons** : ils doivent porter le poids des équipements suspendus, avec un matériau hydrofuge et un système d'étanchéité sous le carrelage.",
        "**L'état de la plomberie existante** : fuites, corrosion, pression d'alimentation (de 1 à 3 bars).",
        "**La ventilation** : indispensable dans une pièce humide, son système se choisit avec un professionnel.",
        "**L'électricité** : la remise aux normes de la pièce s'ajoute souvent aux travaux.",
        "**Le nombre de métiers** : plombier, carreleur, électricien, plaquiste. Un chantier qui en mobilise plusieurs demande plus de coordination.",
      ],
    },
    { type: "h2", id: "italienne", text: "Douche à l'italienne : le point sensible" },
    {
      type: "p",
      text: "Une douche de plain-pied, sans receveur, demande des précautions particulières sur trois points : l'**étanchéité** du sol et des murs, la **pente** vers l'évacuation et le **siphon**. Les joints en périphérie sont la zone la plus exposée aux infiltrations. Demandez à l'artisan quel système d'étanchéité sous carrelage il prévoit, et faites-le écrire sur le devis.",
    },
    {
      type: "callout",
      tone: "warning",
      title: "En copropriété",
      text: "Une infiltration sous une douche mal étanchée touche vite l'appartement du dessous. Un devis qui ne mentionne aucune étanchéité pour une douche à l'italienne doit être éclairci avant de signer.",
    },
    { type: "h2", id: "electricite", text: "Électricité : les volumes de sécurité" },
    {
      type: "p",
      text: "La norme NF C 15-100 découpe la salle de bain en volumes autour de la baignoire et de la douche. Elle fixe ce qu'on peut y installer :",
    },
    {
      type: "table",
      caption: "Les volumes de sécurité d'une salle de bain (norme NF C 15-100)",
      head: ["Volume", "Où"],
      rows: [
        ["Volume 0", "Intérieur de la baignoire ou du bac à douche"],
        ["Volume 1", "Au-dessus de la baignoire ou de la douche, jusqu'à 2,25 m de hauteur"],
        ["Volume 2", "Une bande de 60 cm autour du rebord"],
        ["Volume caché", "Sous la baignoire ou la douche"],
      ],
    },
    {
      type: "p",
      text: "Dans le volume 0, seuls des luminaires immergeables en très basse tension de sécurité (12 V) sont admis. Les prises de courant s'installent hors des volumes, à plus de 60 cm du bord. Tous les circuits doivent être protégés par un différentiel à haute sensibilité, les prises reliées à la terre, et les éléments métalliques (canalisations, baignoire en fonte) raccordés par une liaison équipotentielle.",
    },
    { type: "h2", id: "devis", text: "Lire le devis" },
    {
      type: "p",
      text: "Le devis doit détailler chaque poste : dépose de l'existant, plomberie, étanchéité, carrelage, électricité, ventilation, équipements (marque et référence), et le coût d'enlèvement des déchets. L'artisan doit y joindre son attestation d'assurance décennale. Le détail des mentions obligatoires est dans notre guide [devis de travaux](/guides/devis-travaux-mentions-obligatoires).",
    },
    {
      type: "table",
      caption:
        "Taux de TVA d'une rénovation de salle de bain (logement achevé depuis plus de 2 ans)",
      head: ["Taux", "Ce qui est concerné"],
      rows: [
        [
          "10 %",
          "Main-d'œuvre et matériaux fournis par l'entreprise, et équipements sanitaires intégrés au bâti (baignoire, douche, lavabo, WC) s'ils font partie d'une installation complète",
        ],
        [
          "20 %",
          "Équipements que vous achetez vous-même (leur pose reste à 10 %), éléments posés au sol ou fixés sommairement, électroménager, cabine de hammam ou de sauna prête à poser",
        ],
      ],
    },
    {
      type: "p",
      text: "Pour bénéficier du taux réduit, vous certifiez les conditions par une mention sur le devis ou la facture. Tout est expliqué dans notre guide sur la [TVA à 10 % et 5,5 %](/guides/tva-travaux-taux-reduit). Il n'existe pas de taux à 5,5 % pour les travaux d'accessibilité d'une salle de bain.",
    },
    { type: "h2", id: "aides", text: "Les aides en 2026" },
    {
      type: "p",
      text: "**MaPrimeAdapt'**, versée par l'Anah, finance l'adaptation du logement à la perte d'autonomie : remplacement d'une baignoire par une douche de plain-pied, paroi sans seuil, sol antidérapant, barres d'appui, WC surélevés, lavabo adapté. Elle s'adresse aux propriétaires occupants et aux locataires, pour leur résidence principale :",
    },
    {
      type: "list",
      items: [
        "âgés de 70 ans ou plus, sans condition de perte d'autonomie ;",
        "ou âgés de 60 à 69 ans et en perte d'autonomie (classés en GIR) ;",
        "ou ayant un taux d'incapacité d'au moins 50 %, ou éligibles à la PCH, à l'AEEH ou à l'AAH.",
      ],
    },
    {
      type: "table",
      caption:
        "Plafonds de revenu fiscal de référence 2026 pour MaPrimeAdapt' (hors Île-de-France)",
      head: [
        "Personnes dans le foyer",
        "Ménages très modestes (aide de 70 %)",
        "Ménages modestes (aide de 50 %)",
      ],
      rows: [
        ["1", "17 363 €", "22 259 €"],
        ["2", "25 393 €", "32 553 €"],
        ["3", "30 540 €", "39 148 €"],
        ["4", "35 676 €", "45 735 €"],
        ["5", "40 835 €", "52 348 €"],
        ["Par personne en plus", "+ 5 151 €", "+ 6 598 €"],
      ],
    },
    {
      type: "p",
      text: "L'aide porte sur un montant de travaux plafonné à 22 000 € HT. Un **assistant à maîtrise d'ouvrage** (AMO) est obligatoire : il fait le diagnostic à domicile, vous aide à comparer les devis et monte le dossier. Attendez l'accord de l'Anah avant de commencer les travaux. Vous restez libre de choisir un artisan labellisé ou non.",
    },
    {
      type: "list",
      items: [
        "**Prestation de compensation du handicap (PCH)** : jusqu'à 10 000 € sur 10 ans pour aménager le logement, à demander à la MDPH.",
        "**Allocation personnalisée d'autonomie (APA)** : peut financer certains travaux, auprès du conseil départemental.",
        "**Caisses de retraite** : certaines ont des aides cumulables avec MaPrimeAdapt', renseignez-vous auprès de la vôtre.",
        "**Action Logement** : prêt jusqu'à 10 000 € pour adapter le logement d'une personne handicapée, réservé aux salariés propriétaires occupants.",
      ],
    },
    {
      type: "callout",
      tone: "warning",
      title: "Crédit d'impôt supprimé",
      text: "Le crédit d'impôt pour l'adaptation du logement à la perte d'autonomie ne s'applique plus aux dépenses payées depuis le 1er janvier 2026. Certaines pages en ligne le présentent encore.",
    },
    { type: "h2", id: "copropriete", text: "En copropriété ou en location" },
    {
      type: "p",
      text: "**En copropriété**, les travaux à l'intérieur de votre appartement ne demandent en principe pas d'accord de l'assemblée générale. Il devient obligatoire dès qu'ils touchent la structure ou les parties communes, comme une colonne d'évacuation. Relisez le règlement de copropriété avant de déplacer une arrivée ou une évacuation.",
    },
    {
      type: "p",
      text: "**En location**, une transformation de la salle de bain exige l'accord écrit du propriétaire. Pour des travaux d'adaptation au handicap ou à la perte d'autonomie, le locataire envoie sa demande par lettre recommandée : sans réponse du propriétaire sous 2 mois, elle vaut accord.",
    },
    { type: "h2", id: "questions", text: "Les questions à poser à l'artisan" },
    {
      type: "list",
      ordered: true,
      items: [
        "Faut-il déplacer les évacuations, et qu'est-ce que cela change au devis ?",
        "Quel système d'étanchéité est prévu sous le carrelage, avec quelle pente et quel siphon ?",
        "La ventilation de la pièce est-elle prévue ?",
        "L'électricité sera-t-elle mise aux normes (différentiel 30 mA, volumes, liaison équipotentielle) ?",
        "Pour une douche, quelle sera la hauteur exacte de la marche ?",
        "Qui coordonne les autres métiers s'il en faut plusieurs ?",
        "L'enlèvement des déchets est-il compris ?",
        "Pouvez-vous joindre votre attestation d'assurance décennale au devis ?",
      ],
    },
    {
      type: "h2",
      id: "trouver",
      text: "Trouver un artisan vérifié dans les Alpes-Maritimes",
    },
    {
      type: "p",
      text: "Sur MENAO, décrivez votre projet de salle de bain : il est transmis aux [plombiers](/plombier) et [carreleurs](/carreleur) disponibles près de chez vous. Si plusieurs métiers sont nécessaires, chacun vous adresse son propre devis.",
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
      q: "Combien coûte une rénovation de salle de bain ?",
      a: "Aucun barème officiel n'existe. Le prix dépend de l'état de la pièce, du déplacement des évacuations, de l'étanchéité, de l'électricité et des équipements choisis. Comparez deux ou trois devis détaillés, établis sur le même descriptif.",
    },
    {
      q: "Quelle TVA pour une rénovation de salle de bain ?",
      a: "10 % dans un logement achevé depuis plus de 2 ans, pour les travaux et les équipements intégrés au bâti fournis et posés par l'entreprise. Les équipements que vous achetez vous-même restent à 20 %, leur pose étant à 10 %.",
    },
    {
      q: "Peut-on obtenir une aide pour remplacer une baignoire par une douche ?",
      a: "Oui, avec MaPrimeAdapt' si vous avez 70 ans ou plus, ou entre 60 et 69 ans en perte d'autonomie, et des ressources modestes ou très modestes. L'aide couvre 50 % ou 70 % des travaux, dans la limite de 22 000 € HT, avec un assistant à maîtrise d'ouvrage obligatoire.",
    },
    {
      q: "Faut-il un artisan RGE pour une salle de bain ?",
      a: "Non. La qualification RGE concerne la rénovation énergétique. Pour MaPrimeAdapt', vous êtes libre de choisir un artisan labellisé ou non.",
    },
    {
      q: "Faut-il l'accord de la copropriété pour refaire sa salle de bain ?",
      a: "Pas pour des travaux à l'intérieur de l'appartement, en principe. L'accord de l'assemblée générale est nécessaire si les travaux touchent la structure ou les parties communes, comme une colonne d'évacuation.",
    },
  ],
  sources: [
    {
      label: "Rénover son habitation : créer ou rénover sa salle de bains (janvier 2025)",
      publisher: "Agence Qualité Construction",
      url: "https://qualiteconstruction.com/ressource/renovation/renover-habitation-creer-renover-salle-de-bains/",
    },
    {
      label: "Maîtrisez les volumes de protection dans votre salle de bains",
      publisher: "Promotelec",
      url: "https://www.promotelec.com/particuliers/fiche/maitrisez-les-volumes-de-protection-dans-votre-salle-de-bains/",
    },
    {
      label: "Quel taux de TVA appliquer pour les travaux réalisés dans les logements ?",
      publisher: "impots.gouv.fr",
      url: "https://www.impots.gouv.fr/professionnel/questions/quel-taux-de-tva-appliquer-pour-les-travaux-realises-dans-les-logements",
    },
    {
      label: "TVA : taux réduit des travaux dans les logements (BOI-TVA-LIQ-30-20-90-20)",
      publisher: "BOFiP",
      url: "https://bofip.impots.gouv.fr/bofip/1666-PGP.html/identifiant=BOI-TVA-LIQ-30-20-90-20-20260909",
    },
    {
      label: "MaPrimeAdapt' : travaux d'adaptation du logement à la perte d'autonomie",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F37501",
    },
    {
      label: "MaPrimeAdapt' : le mode d'emploi (février 2026)",
      publisher: "Anah",
      url: "https://www.anah.gouv.fr/sites/default/files/2026-07/202602_guide-mode-emploi-MPA_WEBA.pdf",
    },
    {
      label:
        "Travaux d'adaptation du logement à la perte d'autonomie liée à l'âge ou au handicap (crédit d'impôt)",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10752",
    },
    {
      label: "Comment financer les travaux d'adaptation et d'amélioration de votre logement ?",
      publisher: "Mon parcours handicap",
      url: "https://www.monparcourshandicap.gouv.fr/logement/comment-financer-les-travaux-dadaptation-et-damelioration-de-votre-logement",
    },
    {
      label: "Aides et accès au logement en cas de perte d'autonomie ou de handicap",
      publisher: "Ministère des Solidarités",
      url: "https://solidarites.gouv.fr/aides-et-acces-au-logement-en-cas-de-perte-dautonomie-ou-de-handicap",
    },
    {
      label: "Utilisation du logement et travaux par le locataire",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1874",
    },
    {
      label: "Les règles de majorité en cas de travaux dans une copropriété",
      publisher: "ANIL",
      url: "https://www.anil.org/parole-expert-logement-copropriete-regles-majorite-travaux/",
    },
  ],
  related: [
    { href: "/guides/tva-travaux-taux-reduit", label: "TVA à 5,5 % ou 10 % sur vos travaux" },
    {
      href: "/guides/devis-travaux-mentions-obligatoires",
      label: "Devis de travaux : les mentions obligatoires",
    },
  ],
};
