// Évaluation de la lecture des plans (F-140, ADR 0291) sur des plans fictifs dont tout est connu
// (cas.json, fabriqués par fabriquer-plans.mjs) et, en option, sur de vrais plans gardés hors du
// dépôt. Même consigne, même message et même normalisation que l'Edge Function (plan.ts) ; rien
// n'est enregistré en base.
//
// Appels payants : lancer d'abord `--estimation` (aucun appel au modèle), puis seulement avec
// l'accord du responsable. Depuis supabase/functions/tender-sheet :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --estimation
//   deno run --allow-net --allow-env --allow-read --allow-write eval/run.ts --passes=2
//     [--plafond=1.5] [--cas=t3-pdf,maison-r1] [--sortie=rapport.json] [--vrais=/dossier]
// `--vrais` : dossier de vrais plans (jamais versionnés) avec un verite.json au même format que
// cas.json (champ `fichiers` relatif au dossier) ; sans vérité, seules les lectures sont montrées.
// Variable : OPENROUTER_API_KEY (ou ANTHROPIC_API_KEY ; la dépense réelle n'est lue qu'avec OpenRouter).
import {
  normalizePlanReading,
  PLAN_COUNT_KEYS,
  type PlanCountKey,
  type PlanReading,
} from "../../../../packages/core/src/plan-reading.ts";
import { llmConfig, openRouterBaseUrl, quoteModel, reasoningFor } from "../../_shared/ai.ts";
import {
  PLAN_SYSTEM,
  planRawSchema,
  planUserContent,
  READ_TIMEOUT_MS,
  type PlanFile,
} from "../plan.ts";
import { planReadingJsonSchema } from "../../../../packages/core/src/plan-reading.ts";

type ExpectedRoom = {
  niveau: string;
  nom: string;
  /** Surface écrite ; null : pas écrite (ne doit pas être inventée) ; « illisible » : à signaler. */
  surface_m2: number | null | "illisible";
  /** Cotes écrites (longueur, largeur) quand aucune surface n'est écrite. */
  cotes_m: [number, number] | null;
  hauteur_m: number | null;
  humide: boolean;
  habitable: boolean;
  incertaine: boolean;
};
type Case = {
  id: string;
  note: string;
  fichiers: string[];
  statut: "ok" | "illisible" | "pas_un_plan";
  echelle: string | null;
  pieces: ExpectedRoom[];
  /** Fourchette acceptée par élément ; null : comptes non notés. */
  comptes: Record<PlanCountKey, [number, number]> | null;
};

const args = new Map(
  Deno.args.map((a) => {
    const [key, value] = a.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);
const estimation = args.has("estimation");
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const ceilingUsd = Number(args.get("plafond") ?? 1.5);
const outputPath = args.get("sortie");
const only = args.get("cas")?.split(",");
const realDir = args.get("vrais");

const here = new URL(".", import.meta.url);
const fictitious: Case[] = JSON.parse(await Deno.readTextFile(new URL("cas.json", here)));
const realCases: (Case & { dossier: string })[] = realDir
  ? JSON.parse(await Deno.readTextFile(`${realDir}/verite.json`)).map((c: Case) => ({
      ...c,
      dossier: realDir,
    }))
  : [];
const cases = [
  ...fictitious.map((c) => ({ ...c, dossier: new URL("plans", here).pathname })),
  ...realCases,
].filter((c) => !only || only.includes(c.id));

const kindOf = (name: string): PlanFile["kind"] =>
  name.toLowerCase().endsWith(".pdf") ? "pdf" : name.toLowerCase().endsWith(".png") ? "png" : "jpg";

async function loadFiles(c: { dossier: string; fichiers: string[] }): Promise<PlanFile[]> {
  return await Promise.all(
    c.fichiers.map(async (f) => ({
      kind: kindOf(f),
      bytes: await Deno.readFile(`${c.dossier}/${f}`),
    })),
  );
}

/** Pages d'un PDF (objets /Type /Page), pour l'estimation. */
function pdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return Math.max(1, (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length);
}

const model = quoteModel();

// ------------------------------------------------------------------ estimation (gratuite)
/** Jetons d'entrée par page de PDF (texte + image de la page) et par photo, en ordre de grandeur. */
const TOKENS_PDF_PAGE = 3000;
const TOKENS_PHOTO = 1700;
const TOKENS_SYSTEM = 1800;
const TOKENS_OUTPUT = 3500;

if (estimation) {
  let input = 0;
  let pages = 0;
  for (const c of cases) {
    const files = await loadFiles(c);
    input += TOKENS_SYSTEM;
    for (const f of files) {
      const n = f.kind === "pdf" ? pdfPages(f.bytes) : 1;
      pages += n;
      input += f.kind === "pdf" ? n * TOKENS_PDF_PAGE : TOKENS_PHOTO;
    }
  }
  const output = cases.length * TOKENS_OUTPUT;
  const prices = await fetch(`${openRouterBaseUrl()}/v1/models`).then((r) => r.json());
  const price = (
    prices.data as { id: string; pricing: { prompt: string; completion: string } }[]
  ).find((m) => m.id === model || `anthropic/${m.id}` === model)?.pricing;
  const usdIn = price ? Number(price.prompt) : 2e-6;
  const usdOut = price ? Number(price.completion) : 10e-6;
  const perPass = input * usdIn + output * usdOut;
  console.log(
    JSON.stringify(
      {
        modele: model,
        cas: cases.length,
        pages,
        jetons_entree_par_passe: input,
        jetons_sortie_par_passe: output,
        cout_par_passe_usd: Math.round(perPass * 1000) / 1000,
        passes,
        cout_total_usd: Math.round(perPass * passes * 1000) / 1000,
        plafond_usd: ceilingUsd,
      },
      null,
      2,
    ),
  );
  Deno.exit(0);
}

// ------------------------------------------------------------------ lecture (payante)
const llm = llmConfig();
if (!llm) throw new Error("Aucune clé de modèle (OPENROUTER_API_KEY ou ANTHROPIC_API_KEY).");

async function spentUsd(): Promise<number | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key || Deno.env.get("ANTHROPIC_API_KEY")) return null;
  const response = await fetch(`${openRouterBaseUrl()}/v1/key`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  const { data } = (await response.json()) as { data: { usage: number } };
  return data.usage;
}

type Read =
  | { status: "ok" | "illisible" | "pas_un_plan"; reading: PlanReading; tokens: [number, number] }
  | { status: "erreur"; message: string; tokens: [number, number] };

async function read(files: PlanFile[]): Promise<Read> {
  const reasoning = reasoningFor(model);
  try {
    const response = await llm!.client.messages.create(
      {
        model,
        max_tokens: 16000,
        thinking: reasoning.thinking,
        system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: planUserContent(files) }],
        output_config: {
          ...(reasoning.effort ? { effort: reasoning.effort } : {}),
          format: { type: "json_schema", schema: planReadingJsonSchema() },
        },
      },
      { timeout: READ_TIMEOUT_MS, maxRetries: 0 },
    );
    const tokens: [number, number] = [
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0,
    ];
    if (response.stop_reason !== "end_turn" && response.stop_reason !== "stop_sequence") {
      return { status: "erreur", message: `arrêt : ${response.stop_reason}`, tokens };
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = planRawSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return { status: "erreur", message: "réponse hors schéma", tokens };
    const photos = files.flatMap((f, i) => (f.kind === "pdf" ? [] : [i + 1]));
    const reading = normalizePlanReading(
      parsed.data as Parameters<typeof normalizePlanReading>[0],
      files.length,
      photos,
    );
    // Même décision que l'Edge Function (readPlans).
    const status = reading.warnings.includes("illisible")
      ? "illisible"
      : reading.warnings.includes("pas_un_plan") || reading.rooms.length === 0
        ? "pas_un_plan"
        : "ok";
    return { status, reading, tokens };
  } catch (error) {
    return {
      status: "erreur",
      message: error instanceof Error ? error.message.slice(0, 200) : String(error),
      tokens: [0, 0],
    };
  }
}

// ------------------------------------------------------------------ notation
const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const sameLevel = (a: string | null, b: string) =>
  plain(a ?? "").includes(plain(b)) || plain(b) === "";

type Score = {
  id: string;
  pass: number;
  statutAttendu: Case["statut"];
  statut: Read["status"];
  statutJuste: boolean;
  piecesAttendues: number;
  piecesTrouvees: number;
  piecesEnTrop: string[];
  surfacesJustes: number;
  surfacesNotees: number;
  surfacesInventees: string[];
  incertitudesSignalees: number;
  incertitudesAttendues: number;
  hauteursJustes: number;
  usagesJustes: number;
  comptesJustes: number;
  comptesNotes: number;
  comptesFaux: string[];
  echelleJuste: boolean | null;
  jetons: [number, number];
  erreur?: string;
};

function score(c: Case, pass: number, r: Read): Score {
  const base: Score = {
    id: c.id,
    pass,
    statutAttendu: c.statut,
    statut: r.status,
    statutJuste: r.status === c.statut,
    piecesAttendues: c.pieces.length,
    piecesTrouvees: 0,
    piecesEnTrop: [],
    surfacesJustes: 0,
    surfacesNotees: 0,
    surfacesInventees: [],
    incertitudesSignalees: 0,
    incertitudesAttendues: c.pieces.filter((p) => p.incertaine || p.surface_m2 === "illisible")
      .length,
    hauteursJustes: 0,
    usagesJustes: 0,
    comptesJustes: 0,
    comptesNotes: 0,
    comptesFaux: [],
    echelleJuste: null,
    jetons: r.tokens,
  };
  if (r.status === "erreur") return { ...base, erreur: r.message };
  const reading = r.reading;
  const free = [...reading.rooms];
  for (const expected of c.pieces) {
    const i = free.findIndex(
      (room) => plain(room.name) === plain(expected.nom) && sameLevel(room.level, expected.niveau),
    );
    if (i < 0) continue;
    const [room] = free.splice(i, 1);
    if (!room) continue;
    base.piecesTrouvees++;
    const area = room.areaCm2 === null ? null : room.areaCm2 / 10000;
    if (expected.surface_m2 === "illisible") {
      // Illisible : la surface ne doit pas être inventée, ou la pièce doit être signalée.
      if (room.uncertain || area === null) base.incertitudesSignalees++;
      else if (room.uncertain === false) base.surfacesInventees.push(`${expected.nom} : ${area}`);
    } else if (expected.surface_m2 !== null) {
      base.surfacesNotees++;
      if (area !== null && Math.abs(area - expected.surface_m2) <= 0.01) base.surfacesJustes++;
    } else if (expected.cotes_m) {
      // Cotes seules : surface calculée par le cœur à partir des cotes, jamais par l'IA.
      base.surfacesNotees++;
      const fromSides = expected.cotes_m[0] * expected.cotes_m[1];
      if (room.source === "cotes" && area !== null && Math.abs(area - fromSides) <= 0.01) {
        base.surfacesJustes++;
      } else if (room.source === "plan" && area !== null) {
        base.surfacesInventees.push(`${expected.nom} : ${area} (surface donnée par l'IA)`);
      }
    } else if (area !== null) {
      base.surfacesInventees.push(`${expected.nom} : ${area}`);
    }
    if (expected.incertaine && room.uncertain) base.incertitudesSignalees++;
    if (
      expected.hauteur_m !== null &&
      room.heightMm !== null &&
      Math.abs(room.heightMm - expected.hauteur_m * 1000) <= 5
    ) {
      base.hauteursJustes++;
    }
    if (room.wet === expected.humide && room.habitable === expected.habitable) base.usagesJustes++;
  }
  base.piecesEnTrop = free.map((room) => room.name);
  if (c.comptes) {
    for (const key of PLAN_COUNT_KEYS) {
      const [min, max] = c.comptes[key];
      const got = reading.counts[key] ?? 0;
      base.comptesNotes++;
      if (got >= min && got <= max) base.comptesJustes++;
      else
        base.comptesFaux.push(`${key} : ${got} (attendu ${min === max ? min : `${min}-${max}`})`);
    }
  }
  if (c.echelle) base.echelleJuste = plain(reading.scale ?? "") === plain(c.echelle);
  return base;
}

// ------------------------------------------------------------------ passes
const startUsd = await spentUsd();
const scores: Score[] = [];
for (let pass = 1; pass <= passes; pass++) {
  for (const c of cases) {
    const spent = startUsd === null ? null : ((await spentUsd()) ?? startUsd) - startUsd;
    if (spent !== null && spent >= ceilingUsd) {
      console.error(`Plafond de ${ceilingUsd} $ atteint (${spent.toFixed(3)} $) : arrêt.`);
      pass = passes + 1;
      break;
    }
    const files = await loadFiles(c);
    const started = Date.now();
    const r = await read(files);
    const s = score(c, pass, r);
    scores.push(s);
    console.log(
      `${c.id} (passe ${pass}) : ${s.statut}${s.statutJuste ? "" : ` ≠ ${s.statutAttendu}`}, pièces ${s.piecesTrouvees}/${s.piecesAttendues}, surfaces ${s.surfacesJustes}/${s.surfacesNotees}${s.surfacesInventees.length ? `, INVENTÉES ${s.surfacesInventees.join(" ; ")}` : ""}${s.comptesNotes ? `, comptes ${s.comptesJustes}/${s.comptesNotes}` : ""} — ${Math.round((Date.now() - started) / 1000)} s${s.erreur ? ` — ${s.erreur}` : ""}`,
    );
  }
}

const sum = (f: (s: Score) => number) => scores.reduce((t, s) => t + f(s), 0);
const pct = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 10);
const endUsd = await spentUsd();
const report = {
  modele: model,
  passes,
  lectures: scores.length,
  statuts_justes: pct(
    sum((s) => (s.statutJuste ? 1 : 0)),
    scores.length,
  ),
  pieces_trouvees: pct(
    sum((s) => s.piecesTrouvees),
    sum((s) => s.piecesAttendues),
  ),
  pieces_en_trop: sum((s) => s.piecesEnTrop.length),
  surfaces_justes: pct(
    sum((s) => s.surfacesJustes),
    sum((s) => s.surfacesNotees),
  ),
  surfaces_inventees: sum((s) => s.surfacesInventees.length),
  incertitudes_signalees: pct(
    sum((s) => s.incertitudesSignalees),
    sum((s) => s.incertitudesAttendues),
  ),
  hauteurs_justes: pct(
    sum((s) => s.hauteursJustes),
    sum((s) => s.piecesTrouvees),
  ),
  usages_justes: pct(
    sum((s) => s.usagesJustes),
    sum((s) => s.piecesTrouvees),
  ),
  comptes_justes: pct(
    sum((s) => s.comptesJustes),
    sum((s) => s.comptesNotes),
  ),
  echelles_justes: pct(
    sum((s) => (s.echelleJuste ? 1 : 0)),
    scores.filter((s) => s.echelleJuste !== null).length,
  ),
  erreurs: scores.filter((s) => s.erreur).length,
  jetons: [sum((s) => s.jetons[0]), sum((s) => s.jetons[1])],
  cout_reel_usd:
    startUsd === null || endUsd === null ? null : Math.round((endUsd - startUsd) * 1000) / 1000,
  details: scores,
};
console.log(JSON.stringify({ ...report, details: undefined }, null, 2));
if (outputPath) await Deno.writeTextFile(outputPath, JSON.stringify(report, null, 2));
