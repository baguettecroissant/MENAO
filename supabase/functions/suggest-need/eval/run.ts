// Évaluation des suggestions pendant la saisie (F-05, ADR 0177, 0179) sur des débuts de demande
// fictifs (cases.json) : idées qui redemandent une information déjà écrite (à éviter),
// informations essentielles proposées (ville, surface, délai), suite de phrase, métier compris,
// question posée, texte hors sujet, temps de réponse et coût réel. Même chemin que l'Edge Function
// (suggestion.ts). Rien n'est enregistré.
//
// Appels payants : lancer d'abord `--estimation` (aucun appel au modèle), puis seulement avec
// l'accord du responsable. Depuis supabase/functions/suggest-need :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --estimation
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --passes=2
//     [--plafond=0.05] [--sortie=rapport.json]
// Variable : OPENROUTER_API_KEY.
import { needSuggestionJsonSchema } from "../../../../packages/core/src/need-suggestion.ts";
import { scrubPersonalData } from "../../../../packages/core/src/project.ts";
import { llmConfig, openRouterBaseUrl, type AiRun } from "../../_shared/ai.ts";
import { suggestNeed, systemPrompt, type Trade } from "../suggestion.ts";
import cases from "./cases.json" with { type: "json" };

type Category = "ville" | "surface" | "delai";
type Case = {
  id: string;
  texte: string;
  /** Informations déjà écrites : aucune idée ne doit les redemander. */
  deja: Category[];
  /** Informations essentielles absentes, attendues parmi les idées. */
  manque: Category[];
  /** Dernier mot inachevé : la suite le termine, sans espace. */
  finDeMot?: boolean;
  /** Texte sans rapport avec des travaux : aucune suggestion attendue. */
  horsSujet?: boolean;
  /** Métiers acceptés comme métier compris ; vide : aucun métier attendu. */
  metiers: string[];
};

/** Métiers actifs (référentiel du 23 octobre 2026). */
const TRADES: Trade[] = [
  ["electricien", "Électricien"],
  ["plombier", "Plombier"],
  ["chauffagiste", "Chauffagiste"],
  ["climaticien", "Climaticien"],
  ["macon", "Maçon"],
  ["peintre", "Peintre"],
  ["plaquiste", "Plaquiste"],
  ["carreleur", "Carreleur"],
  ["menuisier", "Menuisier"],
  ["charpentier", "Charpentier"],
  ["couvreur", "Couvreur"],
  ["facadier", "Façadier"],
  ["serrurier", "Serrurier"],
  ["terrassier", "Terrassier"],
  ["paysagiste", "Paysagiste"],
].map(([code, label]) => ({ code, label }));

const PATTERNS: Record<Category, RegExp> = {
  ville: /ville|commune|lieu|localisation|code postal|adresse|^à …$/i,
  surface: /surface|superficie|m²|m2|dimension|taille|longueur/i,
  delai: /délai|quand|date|urgen|d'ici|période|disponibilit/i,
};

const args = new Map(
  Deno.args.map((a) => {
    const [key, value] = a.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const ceilingUsd = Number(args.get("plafond") ?? 0.05);
const outputPath = args.get("sortie");

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

/** Tarif public de la passerelle (dollars par jeton). */
async function loadPrice(model: string): Promise<{ prompt: number; completion: number }> {
  const response = await fetch(`${openRouterBaseUrl()}/v1/models`);
  const { data } = (await response.json()) as {
    data: { id: string; pricing: { prompt: string; completion: string } }[];
  };
  const found = data.find((m) => m.id === model);
  if (!found) throw new Error(`Tarif inconnu : ${model}`);
  return { prompt: Number(found.pricing.prompt), completion: Number(found.pricing.completion) };
}

/** Dépense cumulée de la clé (dollars), pour le coût réel et le plafond. */
async function spentUsd(): Promise<number> {
  const response = await fetch(`${openRouterBaseUrl()}/v1/key`, {
    headers: { Authorization: `Bearer ${required("OPENROUTER_API_KEY")}` },
  });
  if (!response.ok) throw new Error(`Dépense de la clé illisible : ${response.status}`);
  const { data } = (await response.json()) as { data: { usage: number } };
  return data.usage;
}

const list = cases as Case[];
const llm = llmConfig();
if (!llm || Deno.env.get("ANTHROPIC_API_KEY")) {
  throw new Error("OPENROUTER_API_KEY seule attendue (passerelle des tests et du staging).");
}
const model = llm.primary;
const price = await loadPrice(model);

if (args.has("estimation")) {
  // Jetons estimés à 1 pour 3 caractères (prudent pour du français) ; réponse de 200 jetons.
  const schema = JSON.stringify(needSuggestionJsonSchema());
  const meanText = list.reduce((sum, c) => sum + c.texte.length, 0) / list.length;
  const input = Math.ceil((systemPrompt(TRADES).length + schema.length + meanText + 20) / 3);
  const perCall = input * price.prompt + 300 * price.completion;
  console.log(`Modèle : ${model} ; entrée estimée : ${input} jetons par appel.`);
  console.log(
    `Coût estimé : ${(perCall * list.length).toFixed(4)} $ par passe de ${list.length} cas, ${(perCall * list.length * passes).toFixed(4)} $ pour ${passes} passe(s).`,
  );
  Deno.exit(0);
}

const matches = (category: Category, idea: { label: string; insert: string }) =>
  PATTERNS[category].test(idea.label) || PATTERNS[category].test(idea.insert.trim());

const before = await spentUsd();
const rows: Record<string, unknown>[] = [];
const latencies: number[] = [];
let repeated = 0;
let expected = 0;
let covered = 0;
let failures = 0;
let withCompletion = 0;
let wordEndsOk = 0;
let wordEnds = 0;
let offTopicOk = 0;
let offTopic = 0;
let tradeOk = 0;
let questions = 0;
let questionsExpected = 0;
let questionsRepeated = 0;
run: for (let pass = 1; pass <= passes; pass++) {
  for (const c of list) {
    const run: AiRun = { function_name: "suggest-need", model, outcome: "erreur", latency_ms: 0 };
    const suggestion = await suggestNeed(llm, scrubPersonalData(c.texte), run, TRADES);
    latencies.push(run.latency_ms);
    if (!suggestion) {
      failures += 1;
      rows.push({ id: c.id, pass, echec: run.outcome });
      continue;
    }
    const ideas = suggestion.ideas;
    const again = c.deja.filter((category) => ideas.some((idea) => matches(category, idea)));
    // Information essentielle proposée en idée ou demandée par la question.
    const asked = suggestion.question ? [{ label: suggestion.question.label, insert: "" }] : [];
    const found = c.manque.filter((category) =>
      [...ideas, ...asked].some((idea) => matches(category, idea)),
    );
    repeated += again.length;
    expected += c.manque.length;
    covered += found.length;
    if (suggestion.completion) withCompletion += 1;
    if (c.finDeMot) {
      wordEnds += 1;
      if (suggestion.completion && !/^\s/.test(suggestion.completion)) wordEndsOk += 1;
    }
    if (c.horsSujet) {
      offTopic += 1;
      if (!suggestion.completion && ideas.length === 0 && !suggestion.question) offTopicOk += 1;
    }
    const trade = suggestion.understood.trade;
    if (c.metiers.length ? c.metiers.includes(trade ?? "") : trade === null) tradeOk += 1;
    // Une question attendue quand la surface ou le délai manquent (la ville se tape).
    const missing = c.manque.filter((category) => category !== "ville");
    if (missing.length) questionsExpected += 1;
    if (suggestion.question) {
      questions += 1;
      const asked = { label: suggestion.question.label, insert: "" };
      if (c.deja.some((category) => category !== "ville" && matches(category, asked))) {
        questionsRepeated += 1;
      }
    }
    rows.push({
      id: c.id,
      pass,
      ms: run.latency_ms,
      texte: c.texte,
      suite: suggestion.completion,
      idees: ideas.map((idea) => `${idea.label} « ${idea.insert} »`),
      compris: suggestion.understood,
      question: suggestion.question
        ? `${suggestion.question.label} ${suggestion.question.answers.map((a) => `[${a.label}]`).join(" ")}`
        : null,
      redemandees: again,
      manquantes: c.manque.filter((category) => !found.includes(category)),
    });
    const u = suggestion.understood;
    const understood = [u.trade, u.room, u.city, u.surface, u.timing].filter(Boolean).join(" · ");
    const question = suggestion.question
      ? ` | ${suggestion.question.label} ${suggestion.question.answers.map((a) => `[${a.label}]`).join(" ")}`
      : "";
    console.log(
      `${c.id} (${run.latency_ms} ms) : ${c.texte}⟨${suggestion.completion ?? ""}⟩ | ${ideas.map((i) => i.label).join(", ")} | compris : ${understood || "—"}${question}${again.length ? `  ⚠ redemande ${again.join(", ")}` : ""}`,
    );
    if ((await spentUsd()) - before > ceilingUsd) {
      console.log(`Plafond de ${ceilingUsd} $ atteint : arrêt.`);
      break run;
    }
  }
}

const sorted = [...latencies].sort((a, b) => a - b);
const quantile = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const calls = latencies.length;
const percent = (n: number, total: number) => `${Math.round((100 * n) / Math.max(total, 1))} %`;
await new Promise((resolve) => setTimeout(resolve, 3000));
const cost = (await spentUsd()) - before;
console.log("");
console.log(`Appels : ${calls} ; échecs : ${failures}.`);
console.log(`Idées qui redemandent une information déjà écrite : ${repeated}.`);
console.log(
  `Informations essentielles proposées : ${percent(covered, expected)} (${covered}/${expected}).`,
);
console.log(`Suite proposée : ${percent(withCompletion, calls - failures)} des réponses.`);
console.log(`Fin de mot complétée sans espace : ${wordEndsOk}/${wordEnds}.`);
console.log(`Hors sujet sans suggestion : ${offTopicOk}/${offTopic}.`);
console.log(`Métier compris juste : ${percent(tradeOk, calls - failures)}.`);
console.log(
  `Question posée : ${questions} réponses sur ${calls - failures} (attendue dans ${questionsExpected}) ; sur une information déjà donnée : ${questionsRepeated}.`,
);
console.log(`Temps de réponse : médiane ${quantile(0.5)} ms, 95 % sous ${quantile(0.95)} ms.`);
console.log(`Coût réel : ${cost.toFixed(4)} $.`);
if (outputPath) {
  await Deno.writeTextFile(outputPath, JSON.stringify({ model, cost, rows }, null, 2));
}
