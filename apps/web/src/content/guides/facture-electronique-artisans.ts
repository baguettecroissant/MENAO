import type { Guide } from "./types";

// TODO(legal): faire relire par l'expert-comptable avant publication (calendrier, e-reporting).
export const factureElectroniqueArtisans: Guide = {
  slug: "facture-electronique-artisans",
  audience: "artisans",
  title: "Facture électronique : ce qui change pour les artisans du bâtiment",
  metaTitle: "Facture électronique : ce qui change pour les artisans du bâtiment",
  description:
    "Réception depuis le 1er septembre 2026, émission et e-reporting au 1er septembre 2027 : le calendrier de la facturation électronique pour les artisans, micro-entrepreneurs compris.",
  publishedAt: "2026-10-19",
  updatedAt: "2026-10-19",
  draft: false,
  cover: {
    alt: "Un artisan consulte ses factures dans l'espace pro MENAO, sur son ordinateur.",
    position: "50% 5%",
  },
  essentials: [
    "Depuis le 1er septembre 2026, toute entreprise, micro-entrepreneurs compris, doit pouvoir recevoir des factures électroniques.",
    "Au 1er septembre 2027, les PME, TPE et micro-entreprises devront émettre des factures électroniques pour leurs clients professionnels.",
    "Les factures passent par une plateforme agréée par l'administration : un PDF envoyé par e-mail ne suffira plus entre professionnels.",
    "Pour vos clients particuliers, pas de facture électronique, mais les données de vos ventes seront transmises à l'administration (e-reporting).",
  ],
  body: [
    { type: "h2", id: "calendrier", text: "Le calendrier pour un artisan" },
    {
      type: "table",
      caption: "Calendrier de la facturation électronique pour les PME, TPE et micro-entreprises",
      head: ["Date", "Ce qui change"],
      rows: [
        [
          "1er septembre 2026",
          "Vous devez pouvoir recevoir les factures électroniques de vos fournisseurs. Les grandes entreprises et les entreprises de taille intermédiaire émettent déjà les leurs.",
        ],
        [
          "1er septembre 2027",
          "Vous devez émettre des factures électroniques pour vos clients professionnels, et transmettre à l'administration les données de vos autres ventes (e-reporting).",
        ],
      ],
    },
    {
      type: "p",
      text: "Les micro-entrepreneurs en franchise de TVA sont aussi concernés. Leurs factures continueront de porter la mention « TVA non applicable, article 293 B du CGI ».",
    },
    { type: "h2", id: "definition", text: "Une facture électronique n'est pas un PDF" },
    {
      type: "p",
      text: "Une facture électronique respecte un format électronique normé, comporte certaines mentions sous une forme structurée, et transite par une **plateforme agréée** par l'administration fiscale. Une facture papier scannée, ou un PDF envoyé par e-mail, ne sera plus conforme entre professionnels.",
    },
    {
      type: "h2",
      id: "fournisseurs",
      text: "Dès maintenant : recevoir les factures de vos fournisseurs",
    },
    {
      type: "p",
      text: "Négoce de matériaux, location de matériel, énergie, téléphone : vos fournisseurs vont progressivement vous envoyer leurs factures par le circuit électronique. Pour les recevoir, choisissez une plateforme agréée. La liste est publiée sur impots.gouv.fr. Si vous utilisez déjà un logiciel de facturation ou de comptabilité, demandez à son éditeur comment il s'est relié à une plateforme agréée.",
    },
    {
      type: "p",
      text: "Pendant la phase de démarrage, une facture reçue par e-mail, en PDF ou sur papier ne doit pas être écartée pour ce seul motif si elle correspond à une opération réelle : vous pouvez la traiter, la payer et déduire la TVA.",
    },
    { type: "h2", id: "clients-pros", text: "En 2027 : vos factures aux clients professionnels" },
    {
      type: "p",
      text: "À partir du 1er septembre 2027, quand votre client est une entreprise assujettie à la TVA qui agit pour son activité, vous ne pourrez plus lui adresser directement votre facture : elle devra passer par votre plateforme agréée, qui la transmettra à celle de votre client.",
    },
    { type: "h2", id: "particuliers", text: "Et vos clients particuliers ?" },
    {
      type: "p",
      text: "Les travaux réalisés pour des particuliers ne donnent pas lieu à une facture électronique : vous leur remettez une facture comme aujourd'hui. Mais à partir du 1er septembre 2027, les données de ces ventes devront être transmises à l'administration par votre plateforme agréée : c'est l'**e-reporting**. Il porte sur des données de transaction et, dans certains cas, sur des données de paiement.",
    },
    { type: "h2", id: "preparer", text: "Comment se préparer" },
    {
      type: "list",
      ordered: true,
      items: [
        "Choisissez une plateforme agréée pour recevoir vos factures, si ce n'est pas déjà fait.",
        "Vérifiez avec votre éditeur de logiciel ou votre expert-comptable comment vos factures seront émises en 2027.",
        "Tenez à jour les informations de vos clients professionnels, en particulier leur numéro SIREN.",
        "Préférez des factures créées et conservées dans un outil à des documents refaits à la main : leurs données seront plus simples à transmettre.",
      ],
    },
    {
      type: "p",
      text: "Pendant la phase de démarrage, l'administration n'applique pas de sanction aux entreprises qui rencontrent des difficultés mais sont engagées dans une démarche sérieuse de mise en conformité. Ce n'est ni un report, ni une suspension de l'obligation.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Avec MENAO",
      text: "Vos devis et vos factures sont créés dans l'application, numérotés et conservés dans votre espace pro. MENAO suit la réforme pour préparer le passage de 2027.",
    },
  ],
  faq: [
    {
      q: "Je suis micro-entrepreneur en franchise de TVA : suis-je concerné ?",
      a: "Oui. Vous devez pouvoir recevoir des factures électroniques depuis le 1er septembre 2026, et émettre les vôtres pour vos clients professionnels au plus tard le 1er septembre 2027. Vos factures continueront de porter la mention « TVA non applicable, article 293 B du CGI ».",
    },
    {
      q: "Je ne travaille que pour des particuliers : que dois-je faire ?",
      a: "Vous devez quand même pouvoir recevoir les factures électroniques de vos fournisseurs. Pour vos clients particuliers, pas de facture électronique, mais les données de vos ventes seront transmises à l'administration à partir du 1er septembre 2027 (e-reporting).",
    },
    {
      q: "Où trouver la liste des plateformes agréées ?",
      a: "Sur impots.gouv.fr, à la page « Je consulte la liste des plateformes agréées ». Elle est régulièrement mise à jour.",
    },
    {
      q: "Une facture fournisseur reçue en PDF est-elle encore valable ?",
      a: "Pendant la phase de démarrage, oui : une facture reçue par e-mail, en PDF ou sur papier ne doit pas être écartée pour ce seul motif, si elle correspond à une opération réelle et comporte les informations nécessaires.",
    },
  ],
  sources: [
    {
      label: "Je passe à la facturation électronique",
      publisher: "impots.gouv.fr",
      url: "https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique",
    },
    {
      label: "Fiche 1 : que va-t-il se passer pour mon entreprise en matière de facturation ?",
      publisher: "DGFiP",
      url: "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/fiche-1_que-va-t-il-se-passer-pour-mon-entreprise.pdf",
    },
    {
      label: "Facturation électronique : guide pratique de démarrage au 1er septembre 2026",
      publisher: "DGFiP",
      url: "https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf",
    },
    {
      label: "Liste des plateformes agréées",
      publisher: "impots.gouv.fr",
      url: "https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees",
    },
  ],
  related: [
    { href: "/pro", label: "L'Espace Pro MENAO" },
    { href: "/pro#formules", label: "Les formules" },
  ],
};
