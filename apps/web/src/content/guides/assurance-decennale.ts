import type { Guide } from "./types";

export const assuranceDecennale: Guide = {
  slug: "assurance-decennale",
  audience: "particuliers",
  title: "Assurance décennale : ce qu'elle couvre et comment la vérifier",
  metaTitle: "Assurance décennale : ce qu'elle couvre et comment la vérifier",
  description:
    "Garantie décennale, attestation d'assurance, dommages-ouvrage : ce que couvrent les 10 ans qui suivent la réception des travaux, et comment contrôler l'attestation d'un artisan.",
  publishedAt: "2026-10-18",
  updatedAt: "2026-10-18",
  draft: true,
  essentials: [
    "Pendant 10 ans après la réception des travaux, l'artisan doit réparer les dommages qui compromettent la solidité de l'ouvrage ou le rendent impropre à son usage.",
    "Il doit être assuré avant d'ouvrir le chantier et joindre son attestation d'assurance à ses devis et à ses factures.",
    "Sur l'attestation, vérifiez les activités couvertes, la période de validité et la zone géographique.",
    "Pour une construction ou une rénovation importante, vous devez aussi souscrire une assurance dommages-ouvrage avant le début du chantier.",
  ],
  body: [
    { type: "h2", id: "couverture", text: "Ce que couvre la garantie décennale" },
    {
      type: "p",
      text: "Pendant 10 ans à partir de la réception des travaux, le constructeur doit réparer à ses frais les dommages qui n'étaient pas visibles à la réception et qui :",
    },
    {
      type: "list",
      items: [
        "compromettent la solidité de l'ouvrage ou de ses éléments indissociables ;",
        "ou rendent le bâtiment inhabitable, ou impropre à sa destination.",
      ],
    },
    {
      type: "p",
      text: "Service Public cite par exemple les fondations, l'ossature, les canalisations, le chauffage central, l'installation électrique encastrée ou le plancher. Les sous-traitants n'y sont pas tenus envers vous : c'est l'entreprise avec qui vous avez signé qui en répond.",
    },
    { type: "h2", id: "trois-garanties", text: "Les trois garanties après la réception" },
    {
      type: "table",
      caption: "Les garanties après la réception des travaux",
      head: ["Garantie", "Durée", "Ce qu'elle couvre"],
      rows: [
        [
          "Parfait achèvement",
          "1 an",
          "Les désordres signalés à la réception (réserves) ou apparus pendant l'année",
        ],
        [
          "Bon fonctionnement (biennale)",
          "2 ans au moins",
          "Les équipements dissociables, qui se retirent sans abîmer le bâti (ballon d'eau chaude…)",
        ],
        [
          "Décennale",
          "10 ans",
          "Les dommages qui compromettent la solidité ou rendent le bâtiment impropre à son usage",
        ],
      ],
    },
    {
      type: "p",
      text: "Toutes partent de la **réception des travaux**, le moment où vous acceptez l'ouvrage, avec ou sans réserves. D'où l'importance de la faire par écrit, avec un procès-verbal daté.",
    },
    { type: "h2", id: "obligation", text: "Une assurance obligatoire pour l'artisan" },
    {
      type: "p",
      text: "Tout artisan dont la responsabilité décennale peut être engagée doit souscrire une assurance avant de commencer les travaux, quelle que soit la forme de son entreprise. Sans elle, il risque jusqu'à 75 000 € d'amende et 6 mois d'emprisonnement.",
    },
    {
      type: "p",
      text: "Il doit joindre l'attestation d'assurance à ses devis et à ses factures, et indiquer sur ses devis les coordonnées de son assureur et la zone géographique couverte.",
    },
    // TODO(legal): faire valider la formulation sur les travaux non soumis à la garantie décennale.
    {
      type: "p",
      text: "Tous les travaux ne relèvent pas de la garantie décennale : de petits travaux de finition ou d'entretien peuvent en être exclus. En cas de doute, demandez à l'artisan si vos travaux sont couverts, et par quel contrat.",
    },
    { type: "h2", id: "verifier", text: "Comment vérifier une attestation" },
    {
      type: "p",
      text: "L'attestation suit un modèle fixé par arrêté. Contrôlez au minimum :",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "**L'identité** : le nom et le numéro SIRET de l'entreprise sont ceux du devis.",
        "**L'assureur** : son nom et le numéro du contrat.",
        "**La période de validité** : elle couvre la date d'ouverture de votre chantier.",
        "**Les activités couvertes** : elles correspondent exactement à vos travaux. Une attestation qui ne mentionne que la plomberie ne couvre pas une extension en maçonnerie.",
        "**La zone géographique** : votre commune est couverte.",
      ],
    },
    {
      type: "p",
      text: "En cas de doute, contactez l'assureur indiqué sur l'attestation pour confirmer que le contrat est bien en cours.",
    },
    {
      type: "callout",
      tone: "menao",
      title: "Sur MENAO",
      text: "L'équipe MENAO contrôle l'attestation d'assurance décennale de chaque artisan dont le métier y est soumis, ainsi que sa RC Pro, avant de le rendre visible. L'artisan est prévenu avant l'échéance de ses assurances, puis suspendu automatiquement si l'une d'elles expire sans renouvellement.",
    },
    { type: "h2", id: "dommages-ouvrage", text: "Et l'assurance dommages-ouvrage ?" },
    {
      type: "p",
      text: "L'assurance dommages-ouvrage est souscrite par vous, le maître d'ouvrage, **avant l'ouverture du chantier**, pour une construction, une extension ou une rénovation importante : gros œuvre, structure, fondations, terrassement, ravalement destiné à assurer l'étanchéité… Elle finance les réparations des dommages qui relèvent de la garantie décennale. Elle prend effet à la fin de la garantie de parfait achèvement et court jusqu'aux 10 ans après la réception.",
    },
    {
      type: "p",
      text: "Ne pas la souscrire est un délit. Un particulier qui construit un logement pour l'occuper lui-même, ou pour le faire occuper par sa famille, n'encourt toutefois pas ces sanctions.",
    },
    { type: "h2", id: "dommage", text: "Que faire en cas de dommage ?" },
    {
      type: "list",
      ordered: true,
      items: [
        "Écrivez à l'artisan par lettre recommandée avec avis de réception, en décrivant les désordres et en fixant un délai de réparation.",
        "Si vous avez une assurance dommages-ouvrage, déclarez-lui le sinistre.",
        "Sans solution, tentez une médiation, puis saisissez le tribunal judiciaire.",
      ],
    },
  ],
  faq: [
    {
      q: "La garantie décennale démarre-t-elle à la fin du chantier ?",
      a: "Elle démarre à la réception des travaux, quand vous acceptez l'ouvrage, avec ou sans réserves. Une réception écrite, avec un procès-verbal daté, fixe ce point de départ sans discussion possible.",
    },
    {
      q: "Un artisan peut-il refuser de me montrer son attestation ?",
      a: "Non. Quand il est soumis à l'assurance décennale, il doit joindre l'attestation à ses devis et à ses factures.",
    },
    {
      q: "Que faire si l'artisan a fermé son entreprise ?",
      a: "Vous pouvez écrire directement à son assureur décennal, par lettre recommandée avec avis de réception, en joignant le devis, l'attestation d'assurance et les preuves des désordres. Service Public propose un modèle de lettre. D'où l'importance de conserver l'attestation avec votre devis.",
    },
    {
      q: "L'assurance dommages-ouvrage est-elle obligatoire pour une rénovation de salle de bains ?",
      a: "Elle est obligatoire pour une construction, une extension ou une rénovation importante qui touche au gros œuvre ou à la structure. Pour des travaux plus légers, renseignez-vous auprès d'un assureur.",
    },
  ],
  sources: [
    {
      label: "Garanties après la réception des travaux",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2958",
    },
    {
      label: "Assurance dommages-ouvrage (DO)",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2032",
    },
    {
      label: "Faire jouer la garantie décennale quand le constructeur n'existe plus",
      publisher: "Service Public",
      url: "https://www.service-public.gouv.fr/particuliers/vosdroits/R33764",
    },
    {
      label: "Maçon : conditions d'accès et d'exercice en France (assurance décennale)",
      publisher: "Service Public Entreprendre",
      url: "https://entreprendre.service-public.gouv.fr/vosdroits/F39037",
    },
    {
      label: "Arrêté du 5 janvier 2016 fixant un modèle d'attestation d'assurance",
      publisher: "Légifrance",
      url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000031824672",
    },
  ],
  related: [
    { href: "/garanties", label: "Comment MENAO vérifie les artisans" },
    { href: "/guides/choisir-un-artisan", label: "Choisir un artisan : 8 vérifications" },
  ],
};
