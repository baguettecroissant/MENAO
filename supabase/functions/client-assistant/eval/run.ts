// Évaluation de l'assistant des particuliers (F-71, ADR 0220) sur des messages fictifs
// (cases.json) : informations attendues, contenus interdits (prix, durées, avis juridiques),
// métier de la demande préparée, danger, hors sujet, tentatives de détournement, forme, temps de
// réponse et coût réel. Même chemin que l'Edge Function (assistant.ts). Rien n'est enregistré.
//
// Contenus : le texte /assistant-particulier.txt du site (adresse ou fichier), par exemple
// --connaissances=http://localhost:3000/assistant-particulier.txt.
//
// Appels payants : lancer d'abord `--estimation` (aucun appel au modèle), puis seulement avec
// l'accord du responsable. Depuis supabase/functions/client-assistant :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --connaissances=… --estimation
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --connaissances=…
//     [--passes=1] [--plafond=0.10] [--sortie=rapport.json]
// Variable : OPENROUTER_API_KEY.
import { clientAssistantJsonSchema } from "../../../../packages/core/src/client-assistant.ts";
import { normalizeProAssistantHistory } from "../../../../packages/core/src/pro-assistant.ts";
import { scrubPersonalData } from "../../../../packages/core/src/project.ts";
import { llmConfig, openRouterBaseUrl, type AiRun } from "../../_shared/ai.ts";
import { answerClientQuestion, systemPrompt, type Trade } from "../assistant.ts";
import cases from "./cases.json" with { type: "json" };

type Case = {
  id: string;
  question: string;
  historique?: { role: "user" | "assistant"; text: string }[];
  /** Expressions dont l'une au moins doit apparaître (une par entrée). */
  attendu?: string[];
  /** Expressions qui ne doivent jamais apparaître. */
  interdit?: string[];
  /** Information absente des contenus : échange humain proposé. */
  sansReponse?: boolean;
  horsSujet?: boolean;
  /** Métiers acceptés pour la demande préparée (une demande prête est attendue). */
  metierAttendu?: string[];
  /** Aucune demande préparée attendue (question, danger, hors sujet). */
  pasDeDemande?: boolean;
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

const args = new Map(
  Deno.args.map((a) => {
    const [key, ...rest] = a.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : "true"] as const;
  }),
);
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const ceilingUsd = Number(args.get("plafond") ?? 0.1);
const outputPath = args.get("sortie");

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

async function loadKnowledge(): Promise<string> {
  const source = args.get("connaissances");
  if (!source)
    throw new Error("Indiquer --connaissances=<adresse ou fichier de assistant-particulier.txt>");
  const text = /^https?:/.test(source)
    ? await (await fetch(source)).text()
    : await Deno.readTextFile(source);
  if (!text.trim()) throw new Error("Contenus vides");
  return text.trim();
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
const knowledge = await loadKnowledge();
const llm = llmConfig();
if (!llm || Deno.env.get("ANTHROPIC_API_KEY")) {
  throw new Error("OPENROUTER_API_KEY seule attendue (passerelle des tests et du staging).");
}
const model = llm.primary;
const price = await loadPrice(model);

if (args.has("estimation")) {
  // Jetons estimés à 1 pour 3 caractères (prudent pour du français), sans compter le cache de la
  // consigne (coût réel plus bas) ; réponse de 250 jetons.
  const schema = JSON.stringify(clientAssistantJsonSchema());
  const meanTurn =
    list.reduce(
      (sum, c) =>
        sum + c.question.length + (c.historique ?? []).reduce((s, m) => s + m.text.length, 0),
      0,
    ) / list.length;
  const input = Math.ceil(
    (systemPrompt(knowledge, TRADES).length + schema.length + meanTurn + 40) / 3,
  );
  const perCall = input * price.prompt + 250 * price.completion;
  console.log(`Modèle : ${model} ; entrée estimée : ${input} jetons par appel.`);
  console.log(
    `Coût estimé : ${(perCall * list.length).toFixed(4)} $ par passe de ${list.length} cas, ${(perCall * list.length * passes).toFixed(4)} $ pour ${passes} passe(s).`,
  );
  Deno.exit(0);
}

const before = await spentUsd();
const rows: Record<string, unknown>[] = [];
const latencies: number[] = [];
let failures = 0;
let expectedOk = 0;
let expectedTotal = 0;
let forbidden = 0;
let noAnswerOk = 0;
let noAnswerTotal = 0;
let offTopicOk = 0;
let offTopicTotal = 0;
let formIssues = 0;
let withSuggestions = 0;
let draftOk = 0;
let draftTotal = 0;
let unwantedDrafts = 0;
run: for (let pass = 1; pass <= passes; pass++) {
  for (const c of list) {
    const run: AiRun = {
      function_name: "client-assistant",
      model,
      outcome: "erreur",
      latency_ms: 0,
    };
    const history = normalizeProAssistantHistory(c.historique ?? []).map((m) => ({
      ...m,
      text: scrubPersonalData(m.text),
    }));
    const result = await answerClientQuestion(
      llm,
      knowledge,
      TRADES,
      history,
      scrubPersonalData(c.question),
      run,
    );
    latencies.push(run.latency_ms);
    if (!result) {
      failures += 1;
      rows.push({ id: c.id, pass, echec: run.outcome });
      console.log(`${c.id} : échec (${run.outcome})`);
      continue;
    }
    const text = result.answer;
    const missing = (c.attendu ?? []).filter((p) => !new RegExp(p, "i").test(text));
    const found = (c.interdit ?? []).filter((p) => new RegExp(p, "i").test(text));
    expectedTotal += (c.attendu ?? []).length;
    expectedOk += (c.attendu ?? []).length - missing.length;
    forbidden += found.length;
    if (c.sansReponse) {
      noAnswerTotal += 1;
      if (result.suggestHuman) noAnswerOk += 1;
    }
    if (c.horsSujet) {
      offTopicTotal += 1;
      if (result.suggestHuman) offTopicOk += 1;
    }
    const form = [
      text.split(/\s+/).length > 110 ? "trop long" : null,
      /^\s*[-*•] /m.test(text) ? "liste" : null,
      /\bMenao\b/.test(text) ? "Menao en minuscules" : null,
    ].filter(Boolean);
    formIssues += form.length;
    if (result.suggestions.length) withSuggestions += 1;
    if (c.metierAttendu) {
      draftTotal += 1;
      if (result.draft && c.metierAttendu.includes(result.draft.trade ?? "")) draftOk += 1;
    }
    if (c.pasDeDemande && result.draft) unwantedDrafts += 1;
    rows.push({
      id: c.id,
      pass,
      ms: run.latency_ms,
      question: c.question,
      reponse: text,
      humain: result.suggestHuman,
      suggestions: result.suggestions,
      demande: result.draft,
      manquants: missing,
      interdits: found,
      forme: form,
    });
    const flags = [
      missing.length ? `⚠ manque ${missing.join(" / ")}` : "",
      found.length ? `⛔ interdit ${found.join(" / ")}` : "",
      form.length ? `⚠ ${form.join(", ")}` : "",
    ].filter(Boolean);
    console.log(
      `${c.id} (${run.latency_ms} ms)${result.suggestHuman ? " [humain]" : ""} : ${text.replace(/\n/g, " ")}${result.draft ? `  📝 [${result.draft.trade ?? "?"}] ${result.draft.description}` : ""}${result.suggestions.length ? `  → ${result.suggestions.join(" | ")}` : ""}${flags.length ? `  ${flags.join("  ")}` : ""}`,
    );
    if ((await spentUsd()) - before > ceilingUsd) {
      console.log(`Plafond de ${ceilingUsd} $ atteint : arrêt.`);
      break run;
    }
  }
}

const sorted = [...latencies].sort((a, b) => a - b);
const quantile = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const percent = (n: number, total: number) => `${Math.round((100 * n) / Math.max(total, 1))} %`;
await new Promise((resolve) => setTimeout(resolve, 3000));
const cost = (await spentUsd()) - before;
console.log("");
console.log(`Appels : ${latencies.length} ; échecs : ${failures}.`);
console.log(
  `Informations attendues présentes : ${percent(expectedOk, expectedTotal)} (${expectedOk}/${expectedTotal}).`,
);
console.log(`Contenus interdits trouvés : ${forbidden}.`);
console.log(`Sans réponse, échange humain proposé : ${noAnswerOk}/${noAnswerTotal}.`);
console.log(`Hors sujet repéré : ${offTopicOk}/${offTopicTotal}.`);
console.log(`Problèmes de forme : ${formIssues}.`);
console.log(
  `Réponses avec questions de relance : ${withSuggestions}/${latencies.length - failures}.`,
);
console.log(
  `Demande préparée avec le bon métier : ${draftOk}/${draftTotal} ; demandes préparées à tort : ${unwantedDrafts}.`,
);
console.log(`Temps de réponse : médiane ${quantile(0.5)} ms, 95 % sous ${quantile(0.95)} ms.`);
console.log(`Coût réel : ${cost.toFixed(4)} $.`);
if (outputPath) {
  await Deno.writeTextFile(outputPath, JSON.stringify({ model, cost, rows }, null, 2));
}
