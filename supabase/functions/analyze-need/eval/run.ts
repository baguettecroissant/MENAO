// Évaluation de l'analyse du besoin (F-06, ADR 0172) sur des descriptions types fictives
// (cases.json) : métier principal, autres métiers proposés par l'IA seule puis avec les chantiers
// composés (ADR 0167), stabilité d'une passe à l'autre, coût réel. Même chemin que l'Edge
// Function (analysis.ts). Rien n'est enregistré en base.
//
// Appels payants : lancer d'abord `--estimation` (aucun appel au modèle), puis seulement avec
// l'accord du responsable. Depuis supabase/functions/analyze-need :
//   deno run --allow-net --allow-env --allow-write eval/run.ts --estimation
//   deno run --allow-net --allow-env --allow-write eval/run.ts --passes=2 [--sonnet]
//     [--plafond=1.5] [--sortie=rapport.json]
// Variables : OPENROUTER_API_KEY, SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY (référentiels, lecture
// publique). `--sonnet` : Sonnet seul, pour comparer au modèle de production.
import {
  compositeTrades,
  needAnalysisJsonSchema,
  parisToday,
  scrubPersonalData,
  suggestedLots,
} from "../../../../packages/core/src/project.ts";
import { llmConfig, openRouterBaseUrl, type AiRun } from "../../_shared/ai.ts";
import {
  analyzeNeed,
  needUserContent,
  systemPrompt,
  type Labeled,
  type Referentials,
} from "../analysis.ts";
import cases from "./cases.json" with { type: "json" };

type Case = {
  id: string;
  description: string;
  /** Métiers principaux acceptés (null : aucun métier déterminable). */
  metier: (string | null)[];
  /** Métiers qui doivent figurer dans le chantier (principal ou proposés). */
  attendus: string[];
  /** Métiers tolérés en plus ; tout autre métier proposé est compté en trop. */
  acceptes: string[];
};

type Outcome = {
  id: string;
  pass: number;
  metier: string | null;
  confiance: number | null;
  modeles: string[];
  lotsIa: string[];
  lots: string[];
  metierJuste: boolean;
  couvertureIa: number | null;
  couverture: number | null;
  enTropIa: string[];
  enTrop: string[];
};

const args = new Map(
  Deno.args.map((a) => {
    const [key, value] = a.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);
const estimation = args.has("estimation");
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const sonnetOnly = args.has("sonnet");
const ceilingUsd = Number(args.get("plafond") ?? 1.5);
const outputPath = args.get("sortie");

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

/** Référentiels actifs, dans l'ordre de l'Edge Function (lecture publique). */
async function loadReferentials(): Promise<Referentials> {
  const url = required("SUPABASE_URL").replace(/\/$/, "");
  const key = required("SUPABASE_PUBLISHABLE_KEY");
  const get = async <T>(path: string): Promise<T[]> => {
    const response = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key } });
    if (!response.ok) throw new Error(`Référentiel ${path.split("?")[0]} : ${response.status}`);
    return await response.json();
  };
  const [trades, works, rooms] = await Promise.all([
    get<Labeled>("trades?select=code,label&active=eq.true&order=sort_order"),
    get<Labeled & { trade_code: string }>(
      "work_types?select=code,label,trade_code&active=eq.true&order=sort_order",
    ),
    get<Labeled>("rooms?select=code,label&active=eq.true&order=sort_order"),
  ]);
  const workTypeLabels = works.map((w) => ({ code: w.code, label: w.label, trade: w.trade_code }));
  return {
    trades: trades.map((t) => t.code),
    workTypes: workTypeLabels.map((w) => ({ code: w.code, trade: w.trade })),
    rooms: rooms.map((r) => r.code),
    tradeLabels: trades,
    workTypeLabels,
    roomLabels: rooms,
  };
}

type Price = { prompt: number; completion: number };

/** Tarifs publics de la passerelle (dollars par jeton). */
async function loadPrices(models: string[]): Promise<Map<string, Price>> {
  const response = await fetch(`${openRouterBaseUrl()}/v1/models`);
  const { data } = (await response.json()) as {
    data: { id: string; pricing: { prompt: string; completion: string } }[];
  };
  return new Map(
    data
      .filter((m) => models.includes(m.id))
      .map((m) => [
        m.id,
        { prompt: Number(m.pricing.prompt), completion: Number(m.pricing.completion) },
      ]),
  );
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

function evaluate(c: Case, pass: number, metier: string | null, lotsIa: string[], lots: string[]) {
  const coverage = (proposed: string[]) => {
    if (c.attendus.length === 0) return null;
    const present = new Set([metier, ...proposed]);
    return c.attendus.filter((t) => present.has(t)).length / c.attendus.length;
  };
  const extra = (proposed: string[]) =>
    proposed.filter((t) => t !== metier && !c.attendus.includes(t) && !c.acceptes.includes(t));
  return {
    id: c.id,
    pass,
    metier,
    lotsIa,
    lots,
    metierJuste: c.metier.includes(metier),
    couvertureIa: coverage(lotsIa),
    couverture: coverage(lots),
    enTropIa: extra(lotsIa),
    enTrop: extra(lots),
  };
}

const percent = (n: number, total: number) => `${Math.round((100 * n) / Math.max(total, 1))} %`;
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const list = cases as Case[];
const ref = await loadReferentials();
const today = parisToday();
const llm = llmConfig();
if (!llm || Deno.env.get("ANTHROPIC_API_KEY")) {
  throw new Error("OPENROUTER_API_KEY seule attendue (passerelle des tests et du staging).");
}
const config = sonnetOnly ? { ...llm, primary: llm.fallback } : llm;
const prices = await loadPrices([config.primary, config.fallback]);

if (estimation) {
  // Jetons estimés à 1 pour 3 caractères (prudent pour du français) ; réponse de 500 jetons, plus
  // 1 500 de raisonnement pour Sonnet ; modèle de secours dans un quart des cas en production.
  const schema = JSON.stringify(needAnalysisJsonSchema(ref));
  const system = systemPrompt(ref);
  const userChars = mean(list.map((c) => needUserContent(today, null, c.description).length));
  const input = Math.ceil((system.length + schema.length + userChars) / 3);
  const cost = (model: string, output: number) => {
    const price = prices.get(model);
    if (!price) throw new Error(`Tarif inconnu : ${model}`);
    return input * price.prompt + output * price.completion;
  };
  const sonnetCall = cost(llm.fallback, 2000);
  const perCase = sonnetOnly ? sonnetCall : cost(llm.primary, 500) + 0.25 * sonnetCall;
  console.log(`Consigne : ${system.length} caractères ; schéma : ${schema.length} caractères.`);
  console.log(`Entrée estimée : ${input} jetons par appel.`);
  console.log(`Modèles : ${config.primary}, secours ${config.fallback}.`);
  console.log(
    `Coût estimé : ${(perCase * list.length).toFixed(3)} $ par passe de ${list.length} cas, ${(perCase * list.length * passes).toFixed(3)} $ pour ${passes} passe(s).`,
  );
  Deno.exit(0);
}

const before = await spentUsd();
const outcomes: Outcome[] = [];
const tokens = { input: 0, output: 0 };
run: for (let pass = 1; pass <= passes; pass++) {
  for (const c of list) {
    const clean = scrubPersonalData(c.description);
    const runs: AiRun[] = [];
    const best = await analyzeNeed(
      config,
      ref,
      needUserContent(today, null, clean),
      today,
      null,
      runs,
    );
    const metier = best?.criteria.tradeCode ?? null;
    const extraTrades = best?.criteria.extraTrades ?? [];
    const lots = suggestedLots(metier, extraTrades, compositeTrades(clean, ref.trades));
    outcomes.push({
      ...evaluate(
        c,
        pass,
        metier,
        extraTrades.map((t) => t.tradeCode),
        lots.map((l) => l.tradeCode),
      ),
      confiance: best?.criteria.confiance ?? null,
      modeles: runs.map((r) => `${r.model.replace(/^anthropic\//, "")} (${r.outcome})`),
    });
    for (const r of runs) {
      tokens.input += r.input_tokens ?? 0;
      tokens.output += r.output_tokens ?? 0;
    }
    const spent = (await spentUsd()) - before;
    if (spent >= ceilingUsd) {
      console.log(`Plafond de ${ceilingUsd} $ atteint (${spent.toFixed(3)} $) : arrêt.`);
      break run;
    }
  }
}
// La dépense de la clé peut être mise à jour avec quelques secondes de retard.
await new Promise((resolve) => setTimeout(resolve, 5000));
const spent = (await spentUsd()) - before;

const lines: string[] = [];
const log = (line = "") => lines.push(line);
log(`Évaluation de l'analyse du besoin, ${today}`);
log(`Modèles : ${config.primary}, secours ${config.fallback} ; ${passes} passe(s).`);
for (let pass = 1; pass <= passes; pass++) {
  const rows = outcomes.filter((o) => o.pass === pass);
  if (rows.length === 0) continue;
  const multi = rows.filter(
    (o) => o.couverture !== null && list.find((c) => c.id === o.id)!.attendus.length >= 2,
  );
  log();
  log(`Passe ${pass} (${rows.length} cas)`);
  log(
    `- Métier principal juste : ${rows.filter((o) => o.metierJuste).length}/${rows.length} (${percent(rows.filter((o) => o.metierJuste).length, rows.length)})`,
  );
  log(
    `- Couverture des métiers attendus (${multi.length} chantiers à plusieurs métiers) : IA seule ${Math.round(100 * mean(multi.map((o) => o.couvertureIa ?? 0)))} %, avec les chantiers composés ${Math.round(100 * mean(multi.map((o) => o.couverture ?? 0)))} %`,
  );
  log(
    `- Cas avec un métier proposé en trop : IA seule ${rows.filter((o) => o.enTropIa.length).length}, avec les chantiers composés ${rows.filter((o) => o.enTrop.length).length}`,
  );
  log(`- Modèle de secours appelé : ${rows.filter((o) => o.modeles.length > 1).length} cas`);
  log(`- Confiance moyenne : ${mean(rows.map((o) => o.confiance ?? 0)).toFixed(2)}`);
}
if (passes > 1) {
  const unstable = list.filter((c) => {
    const rows = outcomes.filter((o) => o.id === c.id);
    const keys = new Set(rows.map((o) => `${o.metier}|${[...o.lots].sort().join(",")}`));
    return rows.length > 1 && keys.size > 1;
  });
  log();
  log(
    `Cas instables d'une passe à l'autre : ${unstable.length}${unstable.length ? ` (${unstable.map((c) => c.id).join(", ")})` : ""}`,
  );
}
log();
log("Écarts (passe 1) :");
for (const o of outcomes.filter((o) => o.pass === 1)) {
  const c = list.find((x) => x.id === o.id)!;
  const missing = c.attendus.filter((t) => t !== o.metier && !o.lots.includes(t));
  if (o.metierJuste && o.enTrop.length === 0 && missing.length === 0) continue;
  log(
    `- ${o.id} : métier ${o.metier ?? "aucun"}${o.metierJuste ? "" : ` (attendu : ${c.metier.join(" ou ")})`} ; proposés ${o.lots.join(", ") || "aucun"} (IA : ${o.lotsIa.join(", ") || "aucun"})${o.enTrop.length ? ` ; en trop : ${o.enTrop.join(", ")}` : ""}${missing.length ? ` ; manquants : ${missing.join(", ")}` : ""}`,
  );
}
log();
log(`Jetons : ${tokens.input} en entrée (hors cache), ${tokens.output} en sortie.`);
log(`Coût réel mesuré sur la clé : ${spent.toFixed(4)} $.`);
console.log(lines.join("\n"));
if (outputPath) {
  await Deno.writeTextFile(
    outputPath,
    JSON.stringify(
      {
        today,
        config: { primary: config.primary, fallback: config.fallback },
        passes,
        spent,
        tokens,
        outcomes,
      },
      null,
      2,
    ),
  );
}
