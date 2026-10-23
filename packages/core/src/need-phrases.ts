/**
 * Propositions instantanées pendant la saisie du besoin (F-05, ADR 0178) : demandes types écrites
 * comme un particulier les formule, par métier, avec les mots qu'il emploie souvent (`mots`).
 * Elles s'affichent dès les premiers mots, sans appel à l'IA. Liste relue, sans chiffre ni lieu.
 */

export type NeedPhrase = { text: string; trade: string; mots?: string };

export const NEED_PHRASES: readonly NeedPhrase[] = [
  // Plombier
  { text: "Rénover entièrement ma salle de bain", trade: "plombier", mots: "refaire sdb" },
  {
    text: "Remplacer ma baignoire par une douche à l'italienne",
    trade: "plombier",
    mots: "changer bac",
  },
  { text: "Installer une douche à l'italienne", trade: "plombier", mots: "poser créer" },
  {
    text: "Réparer une fuite sous l'évier de la cuisine",
    trade: "plombier",
    mots: "fuit goutte eau",
  },
  {
    text: "Réparer une fuite d'eau au plafond",
    trade: "plombier",
    mots: "fuit infiltration dégât des eaux tache",
  },
  {
    text: "Rechercher l'origine d'une fuite d'eau",
    trade: "plombier",
    mots: "fuit recherche compteur",
  },
  { text: "Déboucher mes WC", trade: "plombier", mots: "toilettes bouchés bouché canalisation" },
  {
    text: "Déboucher l'évier de la cuisine",
    trade: "plombier",
    mots: "bouché évacuation canalisation",
  },
  {
    text: "Remplacer mes WC par un WC suspendu",
    trade: "plombier",
    mots: "toilettes changer installer",
  },
  { text: "Changer le mitigeur de la douche", trade: "plombier", mots: "robinet remplacer fuit" },
  { text: "Remplacer le robinet de la cuisine", trade: "plombier", mots: "mitigeur changer évier" },
  {
    text: "Remplacer mon chauffe-eau électrique",
    trade: "plombier",
    mots: "ballon eau chaude cumulus changer",
  },
  {
    text: "Mon chauffe-eau ne chauffe plus",
    trade: "plombier",
    mots: "ballon eau chaude cumulus panne froide",
  },
  {
    text: "Installer un meuble vasque dans la salle de bain",
    trade: "plombier",
    mots: "lavabo poser",
  },
  { text: "Créer une salle d'eau", trade: "plombier", mots: "salle de bain douche ajouter" },
  {
    text: "Raccorder un lave-vaisselle et un lave-linge",
    trade: "plombier",
    mots: "machine branchement",
  },
  // Électricien
  {
    text: "Mettre aux normes l'installation électrique de ma maison",
    trade: "electricien",
    mots: "électricité refaire vieille",
  },
  {
    text: "Refaire toute l'électricité de mon appartement",
    trade: "electricien",
    mots: "électricité rénover installation",
  },
  {
    text: "Remplacer mon tableau électrique",
    trade: "electricien",
    mots: "disjoncteur changer vieux",
  },
  {
    text: "Le disjoncteur saute régulièrement",
    trade: "electricien",
    mots: "panne coupure électricité",
  },
  {
    text: "Ajouter des prises électriques dans le salon",
    trade: "electricien",
    mots: "prise installer créer",
  },
  {
    text: "Installer des spots encastrés au plafond",
    trade: "electricien",
    mots: "éclairage lumière led",
  },
  {
    text: "Installer une borne de recharge pour voiture électrique",
    trade: "electricien",
    mots: "véhicule wallbox irve",
  },
  {
    text: "Installer un éclairage extérieur dans le jardin",
    trade: "electricien",
    mots: "lumière terrasse",
  },
  { text: "Remplacer les interrupteurs et les prises", trade: "electricien", mots: "changer" },
  {
    text: "Faire un diagnostic de mon installation électrique",
    trade: "electricien",
    mots: "contrôle vérifier électricité",
  },
  { text: "Installer un interphone ou un visiophone", trade: "electricien", mots: "sonnette" },
  { text: "Motoriser mes volets roulants", trade: "electricien", mots: "électrique automatiser" },
  // Chauffagiste
  {
    text: "Remplacer ma chaudière gaz",
    trade: "chauffagiste",
    mots: "changer vieille condensation",
  },
  {
    text: "Faire l'entretien annuel de ma chaudière",
    trade: "chauffagiste",
    mots: "révision ramonage contrôle",
  },
  { text: "Ma chaudière est en panne", trade: "chauffagiste", mots: "démarre plus chauffage" },
  { text: "Installer une pompe à chaleur", trade: "chauffagiste", mots: "pac air eau chauffage" },
  {
    text: "Remplacer ma chaudière fioul par une pompe à chaleur",
    trade: "chauffagiste",
    mots: "pac changer",
  },
  { text: "Installer un poêle à granulés", trade: "chauffagiste", mots: "pellets bois chauffage" },
  { text: "Remplacer mes radiateurs", trade: "chauffagiste", mots: "changer chauffage" },
  { text: "Installer un plancher chauffant", trade: "chauffagiste", mots: "sol chauffage" },
  {
    text: "Mes radiateurs ne chauffent plus",
    trade: "chauffagiste",
    mots: "chauffage panne froid purger",
  },
  // Climaticien
  {
    text: "Installer une climatisation réversible",
    trade: "climaticien",
    mots: "clim climatiseur",
  },
  {
    text: "Installer la climatisation dans les chambres",
    trade: "climaticien",
    mots: "clim climatiseur",
  },
  { text: "Entretenir ma climatisation", trade: "climaticien", mots: "clim révision nettoyage" },
  { text: "Ma climatisation ne refroidit plus", trade: "climaticien", mots: "clim panne" },
  // Maçon
  {
    text: "Construire une extension de ma maison",
    trade: "macon",
    mots: "agrandissement agrandir pièce",
  },
  {
    text: "Ouvrir un mur porteur entre la cuisine et le salon",
    trade: "macon",
    mots: "abattre casser ouverture",
  },
  { text: "Construire un muret dans le jardin", trade: "macon", mots: "mur parpaing" },
  { text: "Couler une dalle en béton", trade: "macon", mots: "chape terrasse" },
  { text: "Construire un garage", trade: "macon", mots: "abri" },
  { text: "Réparer des fissures sur un mur", trade: "macon", mots: "fissure lézarde" },
  { text: "Monter un mur en parpaings", trade: "macon", mots: "construire" },
  { text: "Créer une ouverture pour une porte", trade: "macon", mots: "percer mur" },
  { text: "Aménager mon garage en pièce à vivre", trade: "macon", mots: "transformer chambre" },
  { text: "Rénover entièrement ma maison", trade: "macon", mots: "refaire rénovation complète" },
  // Peintre
  { text: "Repeindre mon salon", trade: "peintre", mots: "peinture murs plafond" },
  {
    text: "Refaire la peinture de tout mon appartement",
    trade: "peintre",
    mots: "repeindre peinture",
  },
  {
    text: "Rénover entièrement mon appartement",
    trade: "peintre",
    mots: "refaire rénovation complète",
  },
  { text: "Repeindre les murs et les plafonds", trade: "peintre", mots: "peinture" },
  { text: "Repeindre une chambre", trade: "peintre", mots: "peinture" },
  { text: "Poser du papier peint", trade: "peintre", mots: "tapisserie" },
  { text: "Repeindre ma façade", trade: "peintre", mots: "peinture extérieure maison" },
  { text: "Repeindre mes volets et mes portes", trade: "peintre", mots: "peinture boiseries" },
  { text: "Repeindre la cage d'escalier", trade: "peintre", mots: "peinture couloir" },
  { text: "Enlever du papier peint et repeindre", trade: "peintre", mots: "décoller peinture" },
  // Plaquiste
  { text: "Monter une cloison en placo", trade: "plaquiste", mots: "plaque plâtre séparer pièce" },
  { text: "Séparer une grande chambre en deux", trade: "plaquiste", mots: "cloison placo" },
  { text: "Créer un faux plafond", trade: "plaquiste", mots: "placo abaisser" },
  { text: "Isoler mes murs par l'intérieur", trade: "plaquiste", mots: "isolation doublage placo" },
  { text: "Isoler les combles", trade: "plaquiste", mots: "isolation grenier" },
  { text: "Aménager les combles en chambre", trade: "plaquiste", mots: "grenier transformer" },
  {
    text: "Réparer un plafond abîmé par un dégât des eaux",
    trade: "plaquiste",
    mots: "placo fuite",
  },
  // Carreleur
  { text: "Poser du carrelage au sol", trade: "carreleur", mots: "carreaux sol" },
  { text: "Changer le carrelage de la cuisine", trade: "carreleur", mots: "remplacer carreaux" },
  {
    text: "Refaire la faïence de la salle de bain",
    trade: "carreleur",
    mots: "carrelage mural murs",
  },
  { text: "Poser une crédence dans la cuisine", trade: "carreleur", mots: "faïence carrelage" },
  { text: "Carreler une terrasse extérieure", trade: "carreleur", mots: "carrelage dallage" },
  { text: "Refaire les joints du carrelage", trade: "carreleur", mots: "joint douche" },
  { text: "Poser du carrelage imitation parquet", trade: "carreleur", mots: "sol bois" },
  // Menuisier
  {
    text: "Remplacer mes fenêtres par du double vitrage",
    trade: "menuisier",
    mots: "fenêtre pvc alu changer",
  },
  { text: "Changer ma porte d'entrée", trade: "menuisier", mots: "remplacer porte" },
  { text: "Installer des volets roulants", trade: "menuisier", mots: "volet poser" },
  { text: "Poser du parquet dans les chambres", trade: "menuisier", mots: "sol bois flottant" },
  {
    text: "Fabriquer des placards sur mesure",
    trade: "menuisier",
    mots: "dressing rangement agencement",
  },
  { text: "Installer une cuisine équipée", trade: "menuisier", mots: "meubles cuisine poser" },
  { text: "Rénover entièrement ma cuisine", trade: "menuisier", mots: "refaire meubles" },
  { text: "Remplacer les portes intérieures", trade: "menuisier", mots: "porte changer" },
  { text: "Installer une baie vitrée coulissante", trade: "menuisier", mots: "fenêtre vitrage" },
  { text: "Poser une véranda", trade: "menuisier", mots: "verrière extension" },
  { text: "Réparer une fenêtre qui ferme mal", trade: "menuisier", mots: "fenêtre réglage" },
  { text: "Construire une terrasse en bois", trade: "menuisier", mots: "deck lames" },
  { text: "Créer un escalier en bois", trade: "menuisier", mots: "escalier" },
  // Charpentier
  { text: "Rénover la charpente de ma maison", trade: "charpentier", mots: "poutres traitement" },
  { text: "Construire un carport en bois", trade: "charpentier", mots: "abri voiture" },
  { text: "Construire une pergola", trade: "charpentier", mots: "terrasse bois" },
  {
    text: "Traiter la charpente contre les insectes",
    trade: "charpentier",
    mots: "termites capricornes traitement",
  },
  { text: "Surélever ma maison", trade: "charpentier", mots: "surélévation étage" },
  // Couvreur
  { text: "Refaire la toiture de ma maison", trade: "couvreur", mots: "toit couverture tuiles" },
  { text: "Réparer une fuite sur le toit", trade: "couvreur", mots: "toiture infiltration tuiles" },
  { text: "Remplacer des tuiles cassées", trade: "couvreur", mots: "toit toiture tuile" },
  { text: "Nettoyer et démousser ma toiture", trade: "couvreur", mots: "toit mousse traitement" },
  { text: "Remplacer mes gouttières", trade: "couvreur", mots: "gouttière zinc chéneau" },
  { text: "Réparer une gouttière qui fuit", trade: "couvreur", mots: "gouttière fuite" },
  { text: "Installer des fenêtres de toit", trade: "couvreur", mots: "velux toit" },
  { text: "Isoler ma toiture par l'extérieur", trade: "couvreur", mots: "sarking isolation toit" },
  // Façadier
  { text: "Faire le ravalement de ma façade", trade: "facadier", mots: "façade enduit nettoyage" },
  { text: "Isoler ma maison par l'extérieur", trade: "facadier", mots: "ite isolation façade" },
  { text: "Refaire l'enduit de ma façade", trade: "facadier", mots: "crépi façade" },
  { text: "Réparer des fissures sur la façade", trade: "facadier", mots: "fissure façade" },
  { text: "Nettoyer ma façade", trade: "facadier", mots: "façade démoussage" },
  // Serrurier
  {
    text: "Changer la serrure de ma porte d'entrée",
    trade: "serrurier",
    mots: "serrure cylindre barillet",
  },
  { text: "Ouvrir ma porte claquée", trade: "serrurier", mots: "porte bloqué enfermé dehors clés" },
  { text: "Installer une porte blindée", trade: "serrurier", mots: "blindage sécurité" },
  { text: "Ma clé est cassée dans la serrure", trade: "serrurier", mots: "clé serrure bloquée" },
  { text: "Poser une serrure trois points", trade: "serrurier", mots: "serrure sécurité" },
  // Terrassier
  {
    text: "Terrasser mon terrain avant construction",
    trade: "terrassier",
    mots: "terrassement décaisser",
  },
  { text: "Creuser une piscine", trade: "terrassier", mots: "terrassement" },
  { text: "Créer une allée carrossable", trade: "terrassier", mots: "allée voirie gravier" },
  {
    text: "Raccorder ma maison au tout-à-l'égout",
    trade: "terrassier",
    mots: "assainissement raccordement réseau",
  },
  { text: "Niveler mon jardin", trade: "terrassier", mots: "terrain terrassement" },
  // Paysagiste
  { text: "Aménager mon jardin", trade: "paysagiste", mots: "jardin espace vert" },
  { text: "Tailler une haie", trade: "paysagiste", mots: "haie taille" },
  {
    text: "Poser une clôture autour de mon terrain",
    trade: "paysagiste",
    mots: "clôture grillage",
  },
  { text: "Installer un portail", trade: "paysagiste", mots: "portail clôture" },
  { text: "Créer une pelouse", trade: "paysagiste", mots: "gazon semer" },
  { text: "Installer un arrosage automatique", trade: "paysagiste", mots: "arrosage jardin" },
  { text: "Élaguer un arbre", trade: "paysagiste", mots: "arbre taille abattage" },
  { text: "Créer une allée en pavés dans le jardin", trade: "paysagiste", mots: "allée pavés" },
];

/** Mots qui ne servent pas à choisir une demande (début de phrase, politesse). */
const STOP_WORDS = new Set(
  (
    "je j me m ma mon mes un une le la les l de d du des et a au aux en pour sur dans par " +
    "avec chez mon ma mes notre nos votre vos il elle on nous vous ai a est suis bonjour " +
    "svp merci voudrais veux souhaite souhaiterais aimerais cherche recherche besoin faut " +
    "faire fait quelqu qu que qui un artisan entreprise devis prix"
  ).split(" "),
);

/** Verbes d'action : un bonus quand ils correspondent, jamais une exclusion. */
const SOFT_WORDS = new Set(
  (
    "refaire renover remplacer changer installer poser reparer creer construire mettre " +
    "amenager monter ajouter isoler repeindre nettoyer entretenir"
  ).split(" "),
);

const PROPOSAL_MAX_WORDS = 8;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Racine grossière : pluriel et féminin retirés (« bouchées », « bouchés » → « bouch »). */
function stem(word: string): string {
  return word.length >= 4 ? word.replace(/(ees|ee|es|e|s|x)$/, "") : word;
}

const indexed = NEED_PHRASES.map((phrase, rank) => {
  const text = normalize(phrase.text).split(" ");
  const all = [
    ...text,
    ...normalize(phrase.mots ?? "")
      .split(" ")
      .filter(Boolean),
  ];
  return {
    phrase,
    rank,
    normalized: text.join(" "),
    text: { words: text, stems: text.map(stem) },
    all: { words: all, stems: all.map(stem) },
  };
});

type Words = { words: string[]; stems: string[] };

/**
 * Force de la correspondance d'un mot tapé : 2 pour un mot entier (au pluriel ou au féminin
 * près), 1 pour un début de mot (le mot en cours de frappe, ou un mot tapé d'au moins 4 lettres),
 * 0 sinon.
 */
function strength(token: string, partial: boolean, { words, stems }: Words): number {
  if (stems.includes(stem(token)) || words.includes(token)) return 2;
  const prefix = partial ? token.length >= 3 : token.length >= 4;
  return prefix && words.some((w) => w.startsWith(token)) ? 1 : 0;
}

/**
 * Demandes types qui correspondent au début de la saisie : chaque mot important tapé doit se
 * retrouver dans la demande ou ses synonymes (le dernier peut être inachevé). Les mots entiers
 * passent avant les débuts de mots, ceux de la demande avant ceux des synonymes ; les verbes
 * d'action départagent. Rien au-delà de quelques mots : la suite revient aux suggestions de l'IA
 * (ADR 0177).
 */
export function matchNeedPhrases(input: string, limit = 5): NeedPhrase[] {
  const typed = normalize(input);
  if (typed.length < 2) return [];
  const tokens = typed.split(" ");
  if (tokens.length > PROPOSAL_MAX_WORDS) return [];
  // Dernier mot en cours de frappe (ignoré s'il fait une lettre).
  const last = /[\p{L}\p{N}]$/u.test(input) ? tokens.at(-1) : undefined;
  const meaningful = tokens.filter(
    (t, i) => !STOP_WORDS.has(t) && !(i === tokens.length - 1 && t === last && t.length < 2),
  );
  const partial = last && meaningful.at(-1) === last ? last : undefined;
  const hard = meaningful.filter((t) => !SOFT_WORDS.has(t));
  const soft = meaningful.filter((t) => SOFT_WORDS.has(t));
  if (meaningful.length === 0) return [];

  return indexed
    .map(({ phrase, rank, normalized, text, all }) => {
      if (normalized === typed) return null;
      let score = 0;
      for (const token of hard) {
        const found = strength(token, token === partial, all);
        // Mot en cours de frappe trop court pour un début de mot (« salle de ba ») : facultatif,
        // sauf s'il est seul (« wc »).
        const optional = token === partial && token.length < 3 && meaningful.length > 1;
        if (!found && !optional) return null;
        score += found + strength(token, token === partial, text);
      }
      let softHits = 0;
      for (const token of soft) {
        const found = strength(token, token === partial, all);
        if (found) softHits += 1;
        score += found + strength(token, token === partial, text);
      }
      if (hard.length === 0 && softHits < soft.length) return null;
      return { phrase, score, rank };
    })
    .filter((m): m is { phrase: NeedPhrase; score: number; rank: number } => m !== null)
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .slice(0, limit)
    .map((m) => m.phrase);
}
