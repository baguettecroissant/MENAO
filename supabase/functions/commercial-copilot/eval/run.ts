// Évaluation du copilote du commercial (F-74, ADR 0223) sur des prospects et des dictées fictifs
// (cases.json) : informations attendues, contenus interdits dans les textes destinés à l'artisan
// (concurrents, garanties, remises, demande de la zone citée sous le seuil), promesses détectées après le second essai, champs du
// compte rendu (intérêt, étape, « ne plus contacter », prochaine action et sa date), forme du
// message (prénom du commercial, MENAO, emplacement du lien, longueur), temps de réponse et coût
// réel. Même chemin que l'Edge Function (copilot.ts), avec le guide terrain du dépôt. Rien n'est
// enregistré. Date fixe : jeudi 5 novembre 2026, 11 h, pour des dates attendues stables.
//
// Appels payants : lancer d'abord `--estimation` (aucun appel au modèle), puis seulement avec
// l'accord du responsable. Depuis supabase/functions/commercial-copilot :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --estimation
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts
//     [--passes=1] [--plafond=0.20] [--modele=anthropic/claude-sonnet-5.5] [--sortie=rapport.json]
// Variable : OPENROUTER_API_KEY.
import {
  briefTexts,
  copilotBriefJsonSchema,
  copilotViolations,
  COPILOT_LINK_PLACEHOLDER,
  COPILOT_MESSAGE_MAX_LENGTH,
  reportTexts,
  type CopilotChannel,
  type ProspectDemand,
} from "../../../../packages/core/src/commercial-copilot.ts";
import { llmConfig, openRouterBaseUrl, type AiRun } from "../../_shared/ai.ts";
import {
  generateBrief,
  generateMessage,
  generateReport,
  prospectBlock,
  systemPrompt,
  type CopilotContext,
} from "../copilot.ts";
import { commercialGuideText } from "../knowledge.ts";
import data from "./cases.json" with { type: "json" };

type Prospect = CopilotContext & { demande: number | null };
type Case = {
  id: string;
  action: "brief" | "message" | "report";
  prospect: string;
  channel?: CopilotChannel;
  dictee?: string;
  attendu?: string[];
  interdit?: string[];
  rapport?: {
    interet?: string[];
    statut?: string[];
    nePlusContacter?: boolean;
    action?: string | null;
    date?: string;
    objection?: string;
    suivi?: boolean;
  };
};

const NOW = { date: "2026-11-05", time: "11:00", weekday: "jeudi" };

const args = new Map(
  Deno.args.map((a) => {
    const [key, ...rest] = a.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : "true"] as const;
  }),
);
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const ceilingUsd = Number(args.get("plafond") ?? 0.2);
const outputPath = args.get("sortie");

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

/** Tarif public de la passerelle (dollars par jeton). */
async function loadPrice(model: string): Promise<{ prompt: number; completion: number }> {
  const response = await fetch(`${openRouterBaseUrl()}/v1/models`);
  const { data: models } = (await response.json()) as {
    data: { id: string; pricing: { prompt: string; completion: string } }[];
  };
  const found = models.find((m) => m.id === model);
  if (!found) throw new Error(`Tarif inconnu : ${model}`);
  return { prompt: Number(found.pricing.prompt), completion: Number(found.pricing.completion) };
}

/** Dépense cumulée de la clé (dollars), pour le coût réel et le plafond. */
async function spentUsd(): Promise<number> {
  const response = await fetch(`${openRouterBaseUrl()}/v1/key`, {
    headers: { Authorization: `Bearer ${required("OPENROUTER_API_KEY")}` },
  });
  if (!response.ok) throw new Error(`Dépense de la clé illisible : ${response.status}`);
  const { data: key } = (await response.json()) as { data: { usage: number } };
  return key.usage;
}

function demandOf(p: Prospect): ProspectDemand | null {
  if (p.demande === null) return null;
  return { recherches: p.demande, jours: 30, rayonKm: 20, metiers: ["metier"] };
}

const prospects = data.prospects as unknown as Record<string, Prospect>;
const list = data.cases as Case[];
const guide = commercialGuideText();
const llm = llmConfig();
if (!llm || Deno.env.get("ANTHROPIC_API_KEY")) {
  throw new Error("OPENROUTER_API_KEY seule attendue (passerelle des tests et du staging).");
}
const model = args.get("modele") ?? llm.primary;
const price = await loadPrice(model);

if (args.has("estimation")) {
  // Jetons estimés à 1 pour 3 caractères (prudent pour du français), sans compter le cache de la
  // consigne (coût réel plus bas) ; réponse de 600 jetons ; un essai sur cinq refait.
  const system = systemPrompt(guide).length + JSON.stringify(copilotBriefJsonSchema()).length;
  const meanTask =
    list.reduce((sum, c) => {
      const p = prospects[c.prospect]!;
      return sum + prospectBlock(p, demandOf(p), NOW.date).length + 1500 + (c.dictee?.length ?? 0);
    }, 0) / list.length;
  const input = Math.ceil((system + meanTask) / 3);
  const perCall = (input * price.prompt + 600 * price.completion) * 1.2;
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
let retried = 0;
let expectedOk = 0;
let expectedTotal = 0;
let forbidden = 0;
let violationsLeft = 0;
let fieldsOk = 0;
let fieldsTotal = 0;
let formIssues = 0;

const check = (ok: boolean) => {
  fieldsTotal += 1;
  if (ok) fieldsOk += 1;
  return ok;
};

run: for (let pass = 1; pass <= passes; pass++) {
  for (const c of list) {
    const p = prospects[c.prospect]!;
    const run: AiRun = {
      function_name: "commercial-copilot",
      model,
      outcome: "erreur",
      latency_ms: 0,
    };
    let texts: string[] = [];
    // Textes dits ou envoyés à l'artisan : les seuls où un contenu interdit compte.
    let facing: string[] = [];
    let shown = "";
    let attempts = 0;
    const issues: string[] = [];
    let output: unknown = null;

    if (c.action === "brief") {
      const r = await generateBrief(llm, guide, p, demandOf(p), NOW.date, run);
      attempts = r.attempts;
      if (r.value) {
        output = r.value;
        texts = [
          r.value.portrait,
          ...briefTexts(r.value),
          ...r.value.objections.map((o) => o.objection),
        ];
        facing = briefTexts(r.value);
        shown = [
          r.value.portrait,
          ...r.value.arguments.map((a) => `• ${a.title} — ${a.detail}`),
          ...r.value.objections.map((o) => `? ${o.objection} → ${o.answer}`),
          `» ${r.value.openingQuestion}`,
        ].join("\n   ");
        violationsLeft += briefTexts(r.value).flatMap(copilotViolations).length;
      }
    } else if (c.action === "message" && c.channel) {
      const r = await generateMessage(llm, guide, p, demandOf(p), c.channel, NOW.date, run);
      attempts = r.attempts;
      if (r.value) {
        output = r.value;
        texts = [r.value.subject ?? "", r.value.body];
        facing = texts;
        shown = `${r.value.subject ? `[${r.value.subject}] ` : ""}${r.value.body}`;
        violationsLeft += texts.flatMap(copilotViolations).length;
        const written = c.channel !== "appel";
        if (
          r.value.body.replace(COPILOT_LINK_PLACEHOLDER, "").length >
          COPILOT_MESSAGE_MAX_LENGTH[c.channel]
        ) {
          issues.push("trop long");
        }
        if (written && r.value.body.split(COPILOT_LINK_PLACEHOLDER).length !== 2)
          issues.push("lien absent ou répété");
        if (c.channel === "email" && !r.value.subject) issues.push("objet manquant");
        if (/\*\*|^#/m.test(r.value.body)) issues.push("Markdown");
        if (/\b(monsieur|madame|M\.|Mme)\b/i.test(r.value.body)) issues.push("genre deviné");
      }
    } else if (c.action === "report" && c.dictee) {
      const r = await generateReport(llm, guide, p, c.dictee, NOW, run);
      attempts = r.attempts;
      if (r.value) {
        output = r.value;
        texts = [r.value.summary, ...r.value.objections, r.value.followUp ?? ""];
        facing = reportTexts(r.value);
        shown = `${r.value.summary} [${r.value.interest}, ${r.value.status}${r.value.doNotContact ? ", NE PLUS CONTACTER" : ""}] → ${
          r.value.nextAction
            ? `${r.value.nextAction.kind} ${r.value.nextAction.date} ${r.value.nextAction.time} « ${r.value.nextAction.label} »`
            : "aucune action"
        }${r.value.followUp ? `\n   ✉ ${r.value.followUp}` : ""}`;
        violationsLeft += reportTexts(r.value).flatMap(copilotViolations).length;
        const e = c.rapport;
        if (e?.interet && !check(e.interet.includes(r.value.interest)))
          issues.push(`intérêt ${r.value.interest}`);
        if (e?.statut && !check(e.statut.includes(r.value.status)))
          issues.push(`étape ${r.value.status}`);
        if (
          e?.nePlusContacter !== undefined &&
          !check(r.value.doNotContact === e.nePlusContacter)
        ) {
          issues.push("ne plus contacter");
        }
        if (e?.action !== undefined && !check((r.value.nextAction?.kind ?? null) === e.action)) {
          issues.push(`action ${r.value.nextAction?.kind ?? "aucune"}`);
        }
        if (e?.date && !check(r.value.nextAction?.date === e.date))
          issues.push(`date ${r.value.nextAction?.date}`);
        if (
          e?.objection &&
          !check(r.value.objections.some((o) => new RegExp(e.objection!, "i").test(o)))
        ) {
          issues.push("objection manquante");
        }
        if (e?.suivi && !check(!!r.value.followUp)) issues.push("message de suivi manquant");
      }
    }

    latencies.push(run.latency_ms);
    if (attempts > 1) retried += 1;
    if (!output) {
      failures += 1;
      rows.push({ id: c.id, pass, echec: run.outcome, essais: attempts });
      console.log(`${c.id} : échec (${run.outcome}, ${attempts} essai(s))`);
      continue;
    }
    const all = texts.join("\n");
    const missing = (c.attendu ?? []).filter((re) => !new RegExp(re, "i").test(all));
    const found = (c.interdit ?? []).filter((re) => new RegExp(re, "i").test(facing.join("\n")));
    expectedTotal += (c.attendu ?? []).length;
    expectedOk += (c.attendu ?? []).length - missing.length;
    forbidden += found.length;
    if (/\bMenao\b/.test(all)) issues.push("Menao en minuscules");
    formIssues += issues.filter((i) =>
      [
        "trop long",
        "lien absent ou répété",
        "objet manquant",
        "Markdown",
        "genre deviné",
        "Menao en minuscules",
      ].includes(i),
    ).length;
    rows.push({
      id: c.id,
      pass,
      ms: run.latency_ms,
      essais: attempts,
      sortie: output,
      manquants: missing,
      interdits: found,
      ecarts: issues,
    });
    const flags = [
      attempts > 1 ? "↻ second essai" : "",
      missing.length ? `⚠ manque ${missing.join(" / ")}` : "",
      found.length ? `⛔ interdit ${found.join(" / ")}` : "",
      issues.length ? `⚠ ${issues.join(", ")}` : "",
    ].filter(Boolean);
    console.log(
      `\n${c.id} (${run.latency_ms} ms)${flags.length ? `  ${flags.join("  ")}` : ""}\n   ${shown}`,
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
console.log(
  `Modèle : ${model}. Appels : ${latencies.length} ; échecs : ${failures} ; seconds essais : ${retried}.`,
);
console.log(
  `Informations attendues présentes : ${percent(expectedOk, expectedTotal)} (${expectedOk}/${expectedTotal}).`,
);
console.log(
  `Contenus interdits trouvés : ${forbidden} ; promesses restantes (détecteur) : ${violationsLeft}.`,
);
console.log(
  `Champs du compte rendu justes : ${percent(fieldsOk, fieldsTotal)} (${fieldsOk}/${fieldsTotal}).`,
);
console.log(`Problèmes de forme : ${formIssues}.`);
console.log(`Temps de réponse : médiane ${quantile(0.5)} ms, 95 % sous ${quantile(0.95)} ms.`);
console.log(`Coût réel : ${cost.toFixed(4)} $.`);
if (outputPath) {
  await Deno.writeTextFile(outputPath, JSON.stringify({ model, cost, rows }, null, 2));
}
