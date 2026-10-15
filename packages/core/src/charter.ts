/**
 * Charte qualité de l'artisan partenaire (version V5, fournie par l'équipe MENAO), signée pendant
 * l'inscription pro (étape « charte », F-14). Contenu repris tel quel, tutoiement compris.
 * Chaque règle a un numéro (R1.1…) repris dans les rappels et les sanctions du back-office.
 * TODO(legal): faire valider la charte par l'avocat (sanctions au regard du règlement P2B UE 2019/1150,
 * clause de non-contournement sans limite de durée, rôle de médiateur, challenge avec lots) et
 * l'annexer aux CGV artisans.
 */

/** Version signée : une nouvelle version demandera une nouvelle signature (artisan_charter_acceptances). */
export const CHARTER_VERSION = "V5";

export type CharterIcon = "clock" | "heart" | "tool" | "shield" | "star" | "flag";

export type CharterSection = {
  id: string;
  title: string;
  why: string;
  icon: CharterIcon;
  /** Bandeau « 72 h », bloc du score et du challenge, paliers des sanctions. */
  key?: boolean;
  score?: boolean;
  ladder?: boolean;
  rules: readonly { title: string; text: string; tag?: string }[];
};

export const CHARTER_SECTIONS: readonly CharterSection[] = [
  {
    id: "reactivite",
    title: "Réactivité : la règle des 72 h",
    why: "C'est ce qui distingue Menao de tous les autres sites. Le client reçoit son devis vite, il ne va pas voir ailleurs.",
    icon: "clock",
    key: true,
    rules: [
      {
        title: "J’envoie mon devis dans les 72 h",
        text: "Dès qu’une demande de travaux t’est envoyée par Menao. Les outils Menao (devis rapide, photos, messagerie) sont là pour t’y aider.",
      },
      {
        title: "Je mets à jour mon planning au moins une fois par semaine",
        text: "Tes disponibilités doivent toujours être à jour dans Menao. Quand une demande arrive, Menao sait tout de suite si tu es libre pour la période des travaux et te l’envoie en priorité. Un planning à jour, c’est plus de chantiers pour toi et aucun client déçu.",
        tag: "Règle clé",
      },
      {
        title: "Même si une visite sur place est nécessaire, mon devis part dans les 72 h",
        text: "Les 72 h comptent à partir du moment où tu reçois la demande. Si tu dois voir le chantier avant de chiffrer, tu prends rendez-vous, tu fais la visite et tu envoies ton devis, le tout dans ces 72 h.",
        tag: "Visite",
      },
      {
        title: "Je reste joignable par Menao et je réponds à chaque demande sous 24 h",
        text: "Active les notifications. Quand Menao t’écrit ou t’appelle, c’est souvent pour t’envoyer un chantier ou débloquer une situation. Si tu ne peux pas prendre un chantier, tu le refuses dans l’appli sous 24 h : il est alors proposé à un autre artisan et le client n’attend pas pour rien.",
      },
      {
        title: "Je réponds aux clients dans la journée",
        text: "Messages et appels : 24 h ouvrées au maximum, par l’appli ou par téléphone.",
      },
    ],
  },
  {
    id: "relation",
    title: "Relation client",
    why: "Un client bien accompagné recommande Menao et te recommande. Le relationnel compte autant que la technique.",
    icon: "heart",
    rules: [
      {
        title: "Je suis ponctuel",
        text: "À l’heure aux rendez-vous et sur le chantier. Si un retard est prévisible, tu préviens le client avant.",
      },
      {
        title: "Je suis aimable et respectueux",
        text: "Avec le client, ses proches, ses voisins et son logement.",
      },
      {
        title: "J’explique tout le déroulé des travaux",
        text: "Avant de commencer : étapes, durée, contraintes. Pendant : tu informes le client à chaque étape importante.",
      },
      {
        title: "Je tiens le suivi du chantier à jour dans Menao",
        text: "Photos, avancement et messages : le client sait toujours où en sont ses travaux.",
      },
      {
        title: "Je reste disponible pour le client",
        text: "Tu réponds à ses questions et tu le rassures si besoin, du devis jusqu’à la réception.",
      },
    ],
  },
  {
    id: "qualite",
    title: "Qualité du travail",
    why: "Chaque chantier réalisé via Menao porte notre nom et le tien.",
    icon: "tool",
    rules: [
      {
        title: "Je réalise un travail soigné",
        text: "Conforme au devis signé et aux règles de l’art de ton métier.",
      },
      {
        title: "Je laisse un chantier propre",
        text: "Tu protèges les sols et le mobilier, tu ranges chaque jour et tu évacues tes déchets tous les jours si possible. À la fin des travaux, tu laisses le chantier super propre : le client sera très content.",
      },
      {
        title: "Je respecte les délais annoncés",
        text: "Si un imprévu les modifie, tu en expliques la raison au client et tu proposes une nouvelle date.",
      },
      {
        title: "Je fais la réception des travaux avec le client",
        text: "Vous signez ensemble le PV de réception dans l’appli, et tu lèves les éventuelles réserves rapidement.",
      },
    ],
  },
  {
    id: "transparence",
    title: "Transparence et plateforme",
    why: "La confiance est la base de Menao. Elle se gagne lentement et se perd en un chantier.",
    icon: "shield",
    rules: [
      {
        title: "Mon devis est clair et détaillé",
        text: "Pas de supplément sans devis complémentaire accepté par écrit par le client.",
      },
      {
        title: "Je passe toujours par Menao pour échanger avec le client",
        text: "Devis, messages, photos, paiement : tout reste sur la plateforme. En cas de litige, Menao peut jouer le rôle de médiateur et t’aider à trouver une solution grâce à cet historique. Sans trace, on ne peut pas te défendre.",
      },
      {
        title: "Je ne traite jamais en direct avec un client trouvé via Menao",
        text: "Pas de devis, de paiement ou de chantier « à côté » de la plateforme, ni pendant ni après le chantier. Tu n’as aucun intérêt à le faire : tu perdrais la protection de Menao (médiation, paiement sécurisé), les avis et les points qui font monter ton score, et tu risquerais la radiation.",
      },
      {
        title: "Si j’ai un client en dehors de Menao, je lui propose de passer par Menao",
        text: "Ce n’est pas une obligation, c’est un conseil : en passant par Menao, tout est plus simple pour toi. Devis, signature, suivi du chantier, paiement et avis sont centralisés au même endroit, et chaque chantier fait monter ton score.",
        tag: "Conseil",
      },
      {
        title: "Mes documents sont valides et à jour",
        text: "Assurance décennale et RC Pro, Kbis ou SIRET, qualifications (RGE…). Tu préviens Menao de tout changement.",
      },
      {
        title: "Je ne sous-traite qu’avec un contrat écrit et l’accord du client",
        text: "C’est la loi (loi du 31 décembre 1975 sur la sous-traitance). Menao peut t’aider à rédiger ce contrat. Les personnes sur le chantier sont qualifiées et déclarées.",
      },
    ],
  },
  {
    id: "notes",
    title: "Avis, score et challenge",
    why: "Tes notes décident de ta place dans les résultats. Bien travailler, c’est recevoir plus de chantiers.",
    icon: "star",
    score: true,
    rules: [
      {
        title:
          "Je laisse Menao m’accompagner jusqu’à la fin et j’accepte d’être noté par le client",
        text: "Du devis à la réception, Menao suit chaque étape avec toi. À la fin du chantier, le client te note sur la qualité, le respect des délais, la communication, la propreté et le rapport qualité-prix. Ces avis sont visibles par la communauté et te font gagner des points.",
      },
      {
        title: "Je note aussi le client à la fin du chantier",
        text: "Accueil et accès, clarté du besoin, délai de paiement. Ton avis protège les autres artisans du réseau.",
      },
      {
        title: "Je ne fais aucune pression sur les avis",
        text: "Pas de faux avis, pas de demande de modification, pas de contrepartie contre une bonne note.",
      },
    ],
  },
  {
    id: "sanctions",
    title: "Si les règles ne sont pas respectées",
    why: "Le client doit avoir la garantie de choisir parmi les meilleures entreprises. Les manquements sont donc suivis, avec une procédure claire et progressive.",
    icon: "flag",
    ladder: true,
    rules: [
      {
        title: "J’ai compris la procédure progressive",
        text: "Rappel, puis avertissement, puis suspension des demandes, puis radiation. Chaque message cite le numéro de la règle concernée, et tu peux toujours t’expliquer.",
      },
      {
        title: "J’ai compris qu’une faute grave entraîne une radiation immédiate",
        text: "Fraude, faux documents, travail dangereux, comportement violent ou insultant, contournement de la plateforme.",
      },
    ],
  },
];

export type CharterRule = {
  code: string;
  sectionId: string;
  title: string;
  text: string;
  tag?: string;
};

/** Règles à plat, numérotées R<section>.<rang>. */
export const CHARTER_RULES: readonly CharterRule[] = CHARTER_SECTIONS.flatMap((section, si) =>
  section.rules.map((rule, ri) => ({
    code: `R${si + 1}.${ri + 1}`,
    sectionId: section.id,
    ...rule,
  })),
);

export const CHARTER_RULE_COUNT = CHARTER_RULES.length;

export function charterRule(code: string): CharterRule | undefined {
  return CHARTER_RULES.find((r) => r.code === code);
}

/** Toutes les règles cochées (et seulement des règles de la charte) : la signature est possible. */
export function charterChecklistComplete(codes: readonly string[]): boolean {
  const checked = new Set(codes);
  return (
    CHARTER_RULES.every((r) => checked.has(r.code)) && [...checked].every((c) => charterRule(c))
  );
}

/** Critères du score MENAO annoncés par la charte (section 5), en pourcentage. */
export const CHARTER_SCORE_WEIGHTS = [
  { key: "notes", label: "Notes des clients en fin de chantier", weight: 40 },
  { key: "delai72h", label: "Respect de la règle des 72 h", weight: 20 },
  { key: "reactivite", label: "Réactivité aux messages et appels", weight: 15 },
  { key: "planning", label: "Planning tenu à jour chaque semaine", weight: 10 },
  { key: "chantiersTermines", label: "Chantiers menés à terme, sans annulation", weight: 10 },
  { key: "anciennete", label: "Ancienneté et badges obtenus", weight: 5 },
] as const;

export type CharterScoreKey = (typeof CHARTER_SCORE_WEIGHTS)[number]["key"];

/** Procédure progressive (section 6). */
export const CHARTER_LADDER = [
  {
    title: "1. Rappel",
    text: "Message de prévention dans l’appli, avec le numéro de la règle.",
    tone: "info",
  },
  {
    title: "2. Avertissement",
    text: "Avertissement écrit, avec le manquement constaté.",
    tone: "warning",
  },
  {
    title: "3. Suspension",
    text: "Plus aucune nouvelle demande pendant 30 jours.",
    tone: "orange",
  },
  { title: "4. Radiation", text: "Retrait définitif du réseau Menao.", tone: "danger" },
] as const;

/** Textes de la charte autour des règles (version V5, tels quels). */
export const CHARTER_TEXT = {
  eyebrow: "Charte qualité de l’artisan partenaire",
  title: "Rejoindre Menao, c’est rejoindre ",
  titleAccent: "les meilleurs artisans du BTP",
  lead: "Notre objectif : devenir la plateforme n°1 et offrir à chaque client la garantie de choisir une entreprise de confiance. Cette charte fixe les règles à respecter absolument pour faire partie du réseau.",
  journey: [
    {
      emoji: "🤝",
      title: "Tu respectes la charte",
      text: "Réactivité, qualité, relation client, transparence.",
    },
    {
      emoji: "⭐",
      title: "Ton score Menao grimpe",
      text: "Les clients te notent à chaque fin de chantier.",
    },
    {
      emoji: "🚀",
      title: "Tu reçois plus de chantiers",
      text: "Du travail régulier, et la sérénité qui va avec.",
    },
  ],
  codeHintStrong: "Chaque règle a un numéro",
  codeHintBefore: " (par exemple ",
  codeHintAfter: "). Si une règle n’est pas respectée, Menao te le rappellera avec ce numéro.",
  howTo: (total: number) =>
    `Lis chaque règle et coche-la pour confirmer que tu en as bien pris connaissance. Tu pourras signer une fois les ${total} règles validées.`,
  principleTitle: "Le principe",
  principle:
    "Tu respectes la charte, Menao t’envoie des chantiers. Plus ton score est haut, plus tu es mis en avant.",
  keyBig: "72 h",
  keyText:
    "C’est le délai maximum pour envoyer ton devis après une demande Menao. C’est notre promesse au client, et elle repose sur toi.",
  scoreTitle: "Comment est calculé ton score Menao",
  scoreNote:
    "Plus ton score est élevé, plus ton profil apparaît en tête quand un client cherche un artisan. Les meilleurs scores débloquent des badges et le statut ",
  scoreElite: "Élite Menao",
  challengeTitle: "Le Challenge Menao du trimestre",
  challengeText:
    "Tous les trois mois, on récompense les meilleurs artisans de chaque région. Respecte les règles, fais ton maximum et termine dans les premiers.",
  challengeChips: ["🚀 Ta note Menao boostée", "🏅 Un nouveau badge", "🎁 Un super cadeau"],
  promisesTitle: "Ce que Menao fait pour toi",
  promisesWhy:
    "Une charte, c’est un engagement des deux côtés. Pour t’aider, on met le client dans les meilleures conditions pour travailler avec toi.",
  promises: [
    {
      emoji: "🎯",
      title: "Des demandes qualifiées",
      text: "Des clients avec un besoin précis, près de chez toi, dans ton métier.",
    },
    {
      emoji: "🧭",
      title: "Un accompagnement du début à la fin",
      text: "Du devis à la réception, Menao suit le chantier avec toi pour que le client te note et que tu gagnes des points.",
    },
    {
      emoji: "✍️",
      title: "Des devis signés plus vite",
      text: "Le client signe ton devis électroniquement, en quelques clics, et on l’aide à se décider.",
    },
    {
      emoji: "💳",
      title: "Des solutions de paiement pour le client",
      text: "On l’oriente vers les aides et solutions de paiement adaptées à ses travaux.",
    },
    {
      emoji: "⚡",
      title: "Tu es payé le plus vite possible",
      text: "On fait tout pour que le client te règle rapidement. Et ça, c’est fort pour ta trésorerie.",
    },
    {
      emoji: "🛠️",
      title: "Les outils pour tenir les 72 h",
      text: "Devis rapide, messagerie, photos, planning et suivi de chantier. Un rappel chaque semaine pour mettre ton planning à jour.",
    },
    {
      emoji: "⚖️",
      title: "Une médiation en cas de litige",
      text: "Grâce à l’historique des échanges sur Menao, on t’aide à trouver une solution avec le client.",
    },
    {
      emoji: "📄",
      title: "Une aide pour tes contrats de sous-traitance",
      text: "On t’aide à rédiger un contrat conforme à la loi.",
    },
    {
      emoji: "📊",
      title: "Une mise en avant juste",
      text: "Un classement basé sur des critères connus et identiques pour tous.",
    },
    {
      emoji: "🤲",
      title: "Une procédure équitable",
      text: "Tu es toujours prévenu et entendu avant toute sanction.",
    },
  ],
  cheerTitle: "On est fiers de te compter parmi nous 💙",
  cheer: [
    "À partir de maintenant, ta vie d’entrepreneur change. Menao te trouve des clients, les accompagne, fait signer tes devis et t’aide à être payé vite. Toi, tu te concentres sur l’essentiel : tes chantiers. Du beau travail, avec bonne humeur et plaisir.",
    "Nous sommes partenaires : ta réussite, c’est la nôtre. Respecte la charte et tout sera simple pour toi : plus de demandes, un agenda bien rempli, et la tranquillité d’esprit.",
  ],
  cheerTrio: [
    { emoji: "📈", text: "On booste ton entreprise" },
    { emoji: "😌", text: "Tu gagnes en confort" },
    { emoji: "🤝", text: "Un vrai partenaire à tes côtés" },
  ],
  cheerSign: "Ensemble, faisons de Menao la référence n°1 du BTP. Bienvenue dans l’équipe !",
  signatureTitle: "Signature de la charte",
  signatureWhy: "Ta signature confirme ton engagement à respecter toutes les règles ci-dessus.",
  agreeTitle: "J’ai lu et j’accepte la Charte qualité Menao",
  agreeText:
    "Je comprends que le non-respect de ces règles peut entraîner la suspension puis la radiation de mon compte, selon la procédure décrite.",
  doneEyebrow: "Bienvenue dans le réseau",
  doneTitle: (firstName: string | null) =>
    `Félicitations${firstName ? ` ${firstName}` : ""} ! Tu fais partie de Menao 🎉`,
  doneLead:
    "Tu as signé la Charte qualité. Respecte-la à chaque chantier : ton score montera, Menao t’enverra de plus en plus de demandes, et tu pourras viser le podium du Challenge du trimestre 🏆",
  startLevel: "Niveau 1 · Artisan Menao",
} as const;
