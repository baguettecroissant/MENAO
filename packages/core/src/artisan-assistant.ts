/**
 * Assistant de l'espace artisan (F-86, ADR 0236) : assistant écrit inclus dans toutes les
 * formules. Il répond aux questions sur l'utilisation de MENAO en tenant compte de l'état du
 * compte de l'artisan (my_assistant_context) et peut proposer d'ouvrir un ou deux écrans.
 * Ici : écrans proposables, résumé du compte en français pour le modèle, schéma et nettoyage de
 * la réponse. Fichier autonome (aucun import) : il est aussi importé par l'Edge Function
 * artisan-assistant.
 */

/** Questions par conversation : au-delà, l'artisan est orienté vers l'équipe. */
export const ARTISAN_ASSISTANT_MAX_QUESTIONS = 12;
export const ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH = 500;
export const ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH = 1100;
const SUGGESTION_MAX_LENGTH = 70;
const MAX_SUGGESTIONS = 3;
const MAX_SCREENS = 2;
const HISTORY_MAX_MESSAGES = 12;

/**
 * Écrans que l'assistant peut proposer d'ouvrir. Chaque plateforme les relie à ses adresses ;
 * « formule » n'existe que sur le site (aucun achat dans l'application, CLAUDE.md règle 10).
 */
export const ASSISTANT_SCREENS = [
  "accueil",
  "demandes",
  "chantiers",
  "agenda",
  "disponibilites",
  "messages",
  "devis",
  "factures",
  "depenses",
  "comptable",
  "paiements",
  "fiche",
  "documents",
  "zone",
  "metiers",
  "avis",
  "grade",
  "profil",
  "formule",
] as const;
export type AssistantScreen = (typeof ASSISTANT_SCREENS)[number];

export type ArtisanAssistantMessage = { role: "user" | "assistant"; text: string };

/**
 * Historique reçu de l'interface, rendu sûr : messages valides, longueurs bornées, les plus
 * récents, alternant question et réponse et se terminant par une réponse. Jamais conservé.
 */
export function normalizeArtisanAssistantHistory(value: unknown): ArtisanAssistantMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: ArtisanAssistantMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") continue;
    const clean = text.trim();
    if (!clean) continue;
    const max =
      role === "user" ? ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH : ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH;
    if (messages[messages.length - 1]?.role === role) messages.pop();
    messages.push({ role, text: clean.slice(0, max) });
  }
  let recent = messages.slice(-HISTORY_MAX_MESSAGES);
  while (recent[0]?.role === "assistant") recent = recent.slice(1);
  if (recent[recent.length - 1]?.role === "user") recent = recent.slice(0, -1);
  return recent;
}

export function artisanAssistantQuestionCount(history: readonly ArtisanAssistantMessage[]) {
  return history.filter((m) => m.role === "user").length;
}

/** Réponse brute du modèle (sortie structurée, artisanAssistantJsonSchema). */
export type RawArtisanAssistantAnswer = {
  reponse: string;
  /** La réponse n'est ni dans le guide ni dans le compte : proposer d'écrire à l'équipe. */
  sans_reponse: boolean;
  hors_sujet: boolean;
  suggestions: string[];
  ecrans: string[];
};

export type ArtisanAssistantAnswer = {
  answer: string;
  suggestHuman: boolean;
  suggestions: string[];
  screens: AssistantScreen[];
};

export function artisanAssistantJsonSchema() {
  return {
    type: "object",
    properties: {
      reponse: { type: "string" },
      sans_reponse: { type: "boolean" },
      hors_sujet: { type: "boolean" },
      suggestions: { type: "array", items: { type: "string" } },
      ecrans: { type: "array", items: { type: "string", enum: [...ASSISTANT_SCREENS] } },
    },
    required: ["reponse", "sans_reponse", "hors_sujet", "suggestions", "ecrans"],
    additionalProperties: false,
  } as const;
}

function normalizeSuggestions(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    let text = value.replace(/\s+/g, " ").trim();
    if (!text || text.length > SUGGESTION_MAX_LENGTH) continue;
    if (!text.endsWith("?")) text = `${text.replace(/[.!…]+$/, "")} ?`;
    const key = text.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length === MAX_SUGGESTIONS) break;
  }
  return result;
}

/**
 * Nettoyage de la réponse : texte simple (ni titres ni gras), longueur bornée à la fin d'une
 * phrase, deux écrans connus au plus. Réponse vide : null.
 */
export function normalizeArtisanAssistantAnswer(
  raw: RawArtisanAssistantAnswer,
): ArtisanAssistantAnswer | null {
  let text = raw.reponse
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  if (text.length > ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH) {
    const cut = text.slice(0, ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"), cut.lastIndexOf(" ?"));
    text =
      end > ARTISAN_ASSISTANT_ANSWER_MAX_LENGTH / 2 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
  }
  const screens: AssistantScreen[] = [];
  for (const value of raw.ecrans) {
    const screen = ASSISTANT_SCREENS.find((s) => s === value);
    if (screen && !screens.includes(screen)) screens.push(screen);
    if (screens.length === MAX_SCREENS) break;
  }
  return {
    answer: text,
    suggestHuman: raw.sans_reponse || raw.hors_sujet,
    suggestions: normalizeSuggestions(raw.suggestions),
    screens: raw.hors_sujet ? [] : screens,
  };
}

// ---------------------------------------------------------------------------
// Résumé du compte pour le modèle
// ---------------------------------------------------------------------------

const DOSSIER: Record<string, string> = {
  brouillon: "inscription à terminer",
  en_verification: "en cours de vérification par l'équipe MENAO",
  valide: "vérifié",
  refuse: "refusé",
  suspendu: "suspendu",
};

const SUBSCRIPTION: Record<string, string> = {
  trialing: "essai gratuit en cours",
  active: "actif",
  past_due: "paiement en retard",
  unpaid: "impayé",
  canceled: "résilié",
  incomplete: "paiement à terminer",
  incomplete_expired: "paiement non abouti",
  paused: "en pause",
};

const PLANS: Record<string, string> = {
  base: "Base",
  premium: "Premium",
  entreprise: "Entreprise",
};

const CHANTIER: Record<string, string> = {
  demande_envoyee: "demande envoyée",
  rdv_planifie: "rendez-vous planifié, devis à faire",
  devis_envoye: "devis envoyé, en attente du client",
  devis_en_revision: "devis à modifier à la demande du client",
  devis_refuse: "devis refusé",
  devis_signe: "devis signé",
  acompte_paye: "acompte payé",
  planifie: "travaux planifiés",
  en_cours: "travaux en cours",
  travaux_termines: "travaux terminés",
  reserves_a_lever: "réserves à lever",
  receptionne: "réceptionné",
  cloture: "clôturé",
  en_litige: "en litige",
  annule: "annulé",
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

function parisDay(value: unknown, withTime = false): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * Compte de l'artisan en quelques lignes, à partir de my_assistant_context : états et nombres
 * seulement (aucun client, aucune coordonnée, aucun montant de chantier). Valeur absente : la
 * ligne est omise ; compte introuvable : chaîne vide.
 */
export function artisanAccountText(raw: unknown): string {
  const c = record(raw);
  if (Object.keys(c).length === 0) return "";
  const lines: string[] = [];
  // Place dans l'entreprise (ADR 0242) : l'ouvrier n'a que ses chantiers et son prochain rendez-vous.
  const chantierLine = () => {
    const chantiers = Object.entries(record(c.chantiers))
      .flatMap(([status, n]) =>
        count(n) && CHANTIER[status] ? [`${CHANTIER[status]} (${count(n)})`] : [],
      )
      .join(" ; ");
    return `Chantiers : ${chantiers || "aucun"}.`;
  };
  if (c.place === "ouvrier") {
    lines.push(
      "Place : ouvrier de l'entreprise. Il ne voit que les chantiers qui lui sont attribués (journal, photos, messages avec le client, rendez-vous), sans aucun montant ni demande ; le reste revient au patron ou au chef d'équipe.",
      chantierLine(),
    );
    const next = parisDay(c.prochain_rendez_vous, true);
    if (next) lines.push(`Prochain rendez-vous : ${next}.`);
    return lines.join("\n");
  }
  if (c.place === "chef") {
    lines.push(
      "Place : chef d'équipe de l'entreprise. Il s'occupe des demandes, des chantiers, de l'argent, de l'agenda et de la secrétaire ; la formule, les paiements en ligne, la vitrine, le dossier, l'envoi au comptable et l'équipe reviennent au patron.",
    );
  }
  const dossier = typeof c.dossier === "string" ? DOSSIER[c.dossier] : undefined;
  if (dossier) lines.push(`Dossier : ${dossier}.`);
  if (c.en_pause === true) lines.push("Réception des demandes : en pause (il l'a choisi).");
  lines.push(
    c.paiements_actives === true
      ? "Paiements en ligne de ses clients : activés."
      : "Paiements en ligne de ses clients : pas encore activés.",
  );
  if (c.franchise_tva === true) lines.push("TVA : franchise en base (pas de TVA sur ses devis).");
  const sub = record(c.abonnement);
  const plan = typeof sub.formule === "string" ? PLANS[sub.formule] : undefined;
  if (plan) {
    const state = typeof sub.statut === "string" ? SUBSCRIPTION[sub.statut] : undefined;
    const trial = sub.statut === "trialing" ? parisDay(sub.fin_essai) : null;
    lines.push(
      `Formule : ${plan}${state ? `, ${state}` : ""}${trial ? ` jusqu'au ${trial}` : ""}.`,
    );
  } else {
    lines.push("Formule : aucune pour l'instant.");
  }
  const agents = record(c.agents);
  const included = count(agents.secondes_incluses) + count(agents.secondes_recharge);
  if (included > 0) {
    lines.push(
      `Minutes de voix restantes ce mois-ci : ${Math.floor(count(agents.secondes_restantes) / 60)}.`,
    );
  }
  const requests = count(c.demandes_en_attente);
  const expires = parisDay(c.prochaine_expiration_demande, true);
  lines.push(
    requests
      ? `Demandes en attente de sa réponse : ${requests}${expires ? ` (la plus proche expire le ${expires})` : ""}.`
      : "Demandes en attente de sa réponse : aucune.",
  );
  lines.push(chantierLine());
  if (count(c.devis_brouillons))
    lines.push(`Devis commencés, pas encore envoyés : ${count(c.devis_brouillons)}.`);
  if (count(c.devis_en_attente_client))
    lines.push(
      `Devis envoyés, en attente de réponse du client : ${count(c.devis_en_attente_client)}.`,
    );
  if (count(c.documents_refuses))
    lines.push(`Documents refusés à redéposer : ${count(c.documents_refuses)}.`);
  if (count(c.documents_a_renouveler))
    lines.push(`Documents qui expirent dans les 30 jours : ${count(c.documents_a_renouveler)}.`);
  const next = parisDay(c.prochain_rendez_vous, true);
  if (next) lines.push(`Prochain rendez-vous : ${next}.`);
  return lines.join("\n");
}
