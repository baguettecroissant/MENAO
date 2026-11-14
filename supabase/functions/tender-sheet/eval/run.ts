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
//     [--modele=claude-opus-5-5]
// `--modele` : compare un autre modèle avec la même consigne (F-158, ADR 0324) ; par défaut, celui
// de l'Edge Function. Les cas de terrain, de façades et de toiture notent aussi les ouvrages
// mesurés : quantités écrites, quantités calculées par le cœur, quantités inventées, lots, pages.
// `--vrais` : dossier de vrais plans (jamais versionnés) avec un verite.json au même format que
// cas.json (champ `fichiers` relatif au dossier) ; sans vérité, seules les lectures sont montrées.
// Variable : OPENROUTER_API_KEY (ou ANTHROPIC_API_KEY ; la dépense réelle n'est lue qu'avec OpenRouter).
import {
  normalizePlanReading,
  PLAN_COUNT_KEYS,
  type PlanCountKey,
  type PlanReading,
} from "../../../../packages/core/src/plan-reading.ts";
import {
  normalizePlanWorks,
  type PlanWorksReading,
} from "../../../../packages/core/src/plan-works.ts";
import { llmConfig, openRouterBaseUrl, quoteModel, reasoningFor } from "../../_shared/ai.ts";
import {
  PLAN_SYSTEM,
  planOutputSchema,
  planRawSchema,
  planUserContent,
  READ_TIMEOUT_MS,
  type PlanFile,
} from "../plan.ts";

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
  /** Métiers de l'appel d'offres (lots possibles des ouvrages). */
  metiers?: string[];
  /** Type attendu de chaque page, dans l'ordre des fichiers. */
  pages?: string[];
  /** Altitudes écrites à retrouver, en mètres. */
  altitudes?: number[];
  ouvrages?: ExpectedWork[];
};
type ExpectedWork = {
  nom: string;
  /** Mots (sans accents) qui retrouvent la ligne dans le relevé de l'IA. */
  mots: string[];
  mesure: "surface" | "lineaire" | "volume" | "nombre";
  /** null : pas écrite ni calculable, ne doit pas être inventée. */
  quantite: number | null;
  origine: "ecrit" | "calcul" | "compte" | "absent";
  /** Lot attendu ; chaîne vide : aucun lot ; null : non noté (plusieurs métiers défendables). */
  metier: string | null;
  fourchette?: [number, number];
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

/** « anthropic/claude-opus-5.5 » et « claude-opus-5-5 » désignent le même modèle. */
const modelKey = (id: string) => id.replace(/^anthropic\//, "").replaceAll(".", "-");

/** Pages d'un PDF (objets /Type /Page), pour l'estimation. */
function pdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return Math.max(1, (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length);
}

const model = args.get("modele") ?? quoteModel();

// ------------------------------------------------------------------ estimation (gratuite)
/** Jetons d'entrée par page de PDF (texte + image de la page) et par photo, en ordre de grandeur. */
const TOKENS_PDF_PAGE = 3000;
const TOKENS_PHOTO = 1700;
const TOKENS_SYSTEM = 3400;
const TOKENS_OUTPUT = 4500;

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
  ).find((m) => modelKey(m.id) === modelKey(model))?.pricing;
  if (!price) console.error(`Prix de ${model} introuvable : tarif par défaut utilisé.`);
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
  | {
      status: "ok" | "illisible" | "pas_un_plan";
      reading: PlanReading;
      measured: PlanWorksReading;
      tokens: [number, number];
    }
  | { status: "erreur"; message: string; tokens: [number, number] };

async function read(files: PlanFile[], trades: string[]): Promise<Read> {
  const reasoning = reasoningFor(model);
  try {
    const response = await llm!.client.messages.create(
      {
        model,
        max_tokens: 16000,
        thinking: reasoning.thinking,
        system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: planUserContent(files, trades) }],
        output_config: {
          ...(reasoning.effort ? { effort: reasoning.effort } : {}),
          format: { type: "json_schema", schema: planOutputSchema() },
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
    const measured = normalizePlanWorks(parsed.data, files.length, photos, trades);
    const status = reading.warnings.includes("illisible")
      ? "illisible"
      : reading.warnings.includes("pas_un_plan") ||
          (reading.rooms.length === 0 && measured.works.length === 0)
        ? "pas_un_plan"
        : "ok";
    return { status, reading, measured, tokens };
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
  hauteursNotees: number;
  usagesJustes: number;
  usagesFaux: string[];
  comptesJustes: number;
  comptesNotes: number;
  comptesFaux: string[];
  /** Éléments laissés vides par l'IA (« à compléter » à l'écran) : prudents, pas faux. */
  comptesOmis: string[];
  echelleJuste: boolean | null;
  // Ouvrages mesurés (F-158).
  ouvragesAttendus: number;
  ouvragesTrouves: number;
  ouvragesManquants: string[];
  /** Quantités attendues (écrites, calculées, comptées) justes, avec la bonne origine. */
  quantitesJustes: number;
  quantitesNotees: number;
  quantitesFausses: string[];
  /** Quantité donnée alors que rien n'est écrit ni calculable : la faute grave. */
  quantitesInventees: string[];
  lotsJustes: number;
  lotsNotes: number;
  lotsFaux: string[];
  pagesJustes: number;
  pagesNotees: number;
  altitudesJustes: number;
  altitudesNotees: number;
  ouvrages?: {
    nom: string;
    mesure: string;
    quantite: number | null;
    origine: string;
    lot: string | null;
  }[];
  jetons: [number, number];
  /** Relevé de l'IA, pour relire un écart sans relancer. */
  releve?: { niveau: string | null; nom: string; surface: number | null; incertaine: boolean }[];
  comptes?: PlanReading["counts"];
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
    hauteursNotees: 0,
    usagesJustes: 0,
    usagesFaux: [],
    comptesJustes: 0,
    comptesNotes: 0,
    comptesFaux: [],
    comptesOmis: [],
    echelleJuste: null,
    ouvragesAttendus: c.ouvrages?.length ?? 0,
    ouvragesTrouves: 0,
    ouvragesManquants: [],
    quantitesJustes: 0,
    quantitesNotees: 0,
    quantitesFausses: [],
    quantitesInventees: [],
    lotsJustes: 0,
    lotsNotes: 0,
    lotsFaux: [],
    pagesJustes: 0,
    pagesNotees: c.pages?.length ?? 0,
    altitudesJustes: 0,
    altitudesNotees: c.altitudes?.length ?? 0,
    jetons: r.tokens,
  };
  if (r.status === "erreur") return { ...base, erreur: r.message };
  const reading = r.reading;
  base.releve = reading.rooms.map((room) => ({
    niveau: room.level,
    nom: room.name,
    surface: room.areaCm2 === null ? null : room.areaCm2 / 10000,
    incertaine: room.uncertain,
  }));
  base.comptes = reading.counts;
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
      else base.surfacesInventees.push(`${expected.nom} : ${area}`);
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
    if (expected.incertaine && expected.surface_m2 !== "illisible" && room.uncertain) {
      base.incertitudesSignalees++;
    }
    if (expected.hauteur_m !== null) base.hauteursNotees++;
    if (
      expected.hauteur_m !== null &&
      room.heightMm !== null &&
      Math.abs(room.heightMm - expected.hauteur_m * 1000) <= 5
    ) {
      base.hauteursJustes++;
    }
    if (room.wet === expected.humide && room.habitable === expected.habitable) base.usagesJustes++;
    else {
      base.usagesFaux.push(
        `${expected.nom} : ${room.wet ? "humide" : "sèche"}, ${room.habitable ? "habitable" : "non habitable"}`,
      );
    }
  }
  base.piecesEnTrop = free.map((room) => room.name);
  if (c.comptes) {
    for (const key of PLAN_COUNT_KEYS) {
      const [min, max] = c.comptes[key];
      const got = reading.counts[key];
      // Laissé vide : l'artisan le complète ; on ne le note ni juste ni faux.
      if (got === null) {
        if (max > 0) base.comptesOmis.push(key);
        continue;
      }
      base.comptesNotes++;
      if (got >= min && got <= max) base.comptesJustes++;
      else
        base.comptesFaux.push(`${key} : ${got} (attendu ${min === max ? min : `${min}-${max}`})`);
    }
  }
  if (c.echelle) base.echelleJuste = plain(reading.scale ?? "") === plain(c.echelle);
  scoreWorks(c, r.measured, base);
  return base;
}

/** Ouvrages mesurés : retrouvés par leurs mots, puis quantité, origine et lot comparés. */
function scoreWorks(c: Case, measured: PlanWorksReading, base: Score) {
  base.ouvrages = measured.works.map((w) => ({
    nom: w.name,
    mesure: w.kind,
    quantite: w.quantityMilli === null ? null : w.quantityMilli / 1000,
    origine: w.source,
    lot: w.trade,
  }));
  const free = [...measured.works];
  for (const expected of c.ouvrages ?? []) {
    const i = free.findIndex(
      (w) => w.kind === expected.mesure && expected.mots.every((m) => plain(w.name).includes(m)),
    );
    if (i < 0) {
      base.ouvragesManquants.push(expected.nom);
      // Un ouvrage attendu avec une quantité et absent du relevé compte comme une quantité fausse.
      if (expected.quantite !== null) {
        base.quantitesNotees++;
        base.quantitesFausses.push(`${expected.nom} : absent`);
      }
      continue;
    }
    const [w] = free.splice(i, 1);
    if (!w) continue;
    base.ouvragesTrouves++;
    const got = w.quantityMilli === null ? null : w.quantityMilli / 1000;
    if (expected.quantite === null) {
      if (got !== null) base.quantitesInventees.push(`${expected.nom} : ${got} (${w.source})`);
    } else {
      base.quantitesNotees++;
      const [min, max] = expected.fourchette ?? [
        expected.quantite - 0.01,
        expected.quantite + 0.01,
      ];
      const origin =
        expected.origine === "calcul"
          ? w.source === "calcul"
          : expected.origine === "compte"
            ? w.source === "compte" || w.source === "plan"
            : w.source === "plan" || w.source === "photo";
      if (got !== null && got >= min && got <= max && origin) base.quantitesJustes++;
      // Un nombre laissé vide est prudent (« à compléter ») ; toute autre erreur est une faute.
      else if (!(expected.origine === "compte" && got === null)) {
        base.quantitesFausses.push(`${expected.nom} : ${got ?? "vide"} (${w.source})`);
      } else base.quantitesNotees--;
    }
    if (expected.metier !== null) {
      base.lotsNotes++;
      if ((w.trade ?? "") === expected.metier) base.lotsJustes++;
      else base.lotsFaux.push(`${expected.nom} : ${w.trade ?? "aucun"}`);
    }
  }
  // Ouvrages en plus : acceptés s'ils sont sans quantité ou écrits ; un calcul en plus est signalé.
  for (const w of free) {
    if (!c.ouvrages) {
      // Cas sans ouvrage attendu (plans de niveaux) : rien ne doit être calculé ici.
      if (w.source === "calcul") base.quantitesInventees.push(`${w.name} : calcul inattendu`);
    } else if (w.source === "calcul") {
      base.quantitesInventees.push(`${w.name} : ${(w.quantityMilli ?? 0) / 1000} (calcul en trop)`);
    }
  }
  (c.pages ?? []).forEach((type, index) => {
    // Pages numérotées dans l'ordre des fichiers ; les cas notés n'ont qu'un fichier.
    if (measured.pages.find((p) => p.file === 1 && p.page === index + 1)?.type === type) {
      base.pagesJustes++;
    }
  });
  for (const altitude of c.altitudes ?? []) {
    if (measured.levels.some((l) => Math.abs(l.altitudeMm - altitude * 1000) <= 5)) {
      base.altitudesJustes++;
    }
  }
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
    const r = await read(files, c.metiers ?? []);
    const s = score(c, pass, r);
    scores.push(s);
    console.log(
      `${c.id} (passe ${pass}) : ${s.statut}${s.statutJuste ? "" : ` ≠ ${s.statutAttendu}`}, pièces ${s.piecesTrouvees}/${s.piecesAttendues}, surfaces ${s.surfacesJustes}/${s.surfacesNotees}${s.surfacesInventees.length ? `, INVENTÉES ${s.surfacesInventees.join(" ; ")}` : ""}${s.comptesNotes ? `, comptes ${s.comptesJustes}/${s.comptesNotes}` : ""}${s.comptesOmis.length ? ` (vides : ${s.comptesOmis.join(", ")})` : ""}${s.comptesFaux.length ? ` FAUX ${s.comptesFaux.join(" ; ")}` : ""}${s.usagesFaux.length ? ` — usages : ${s.usagesFaux.join(" ; ")}` : ""}${s.ouvragesAttendus ? `, ouvrages ${s.ouvragesTrouves}/${s.ouvragesAttendus}, quantités ${s.quantitesJustes}/${s.quantitesNotees}, lots ${s.lotsJustes}/${s.lotsNotes}` : ""}${s.quantitesFausses.length ? ` FAUSSES ${s.quantitesFausses.join(" ; ")}` : ""}${s.quantitesInventees.length ? ` INVENTÉES ${s.quantitesInventees.join(" ; ")}` : ""} — ${Math.round((Date.now() - started) / 1000)} s${s.erreur ? ` — ${s.erreur}` : ""}`,
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
    sum((s) => s.hauteursNotees),
  ),
  usages_justes: pct(
    sum((s) => s.usagesJustes),
    sum((s) => s.piecesTrouvees),
  ),
  comptes_justes: pct(
    sum((s) => s.comptesJustes),
    sum((s) => s.comptesNotes),
  ),
  comptes_faux: sum((s) => s.comptesFaux.length),
  comptes_omis: sum((s) => s.comptesOmis.length),
  echelles_justes: pct(
    sum((s) => (s.echelleJuste ? 1 : 0)),
    scores.filter((s) => s.echelleJuste !== null).length,
  ),
  ouvrages_trouves: pct(
    sum((s) => s.ouvragesTrouves),
    sum((s) => s.ouvragesAttendus),
  ),
  quantites_justes: pct(
    sum((s) => s.quantitesJustes),
    sum((s) => s.quantitesNotees),
  ),
  quantites_fausses: sum((s) => s.quantitesFausses.length),
  quantites_inventees: sum((s) => s.quantitesInventees.length),
  lots_justes: pct(
    sum((s) => s.lotsJustes),
    sum((s) => s.lotsNotes),
  ),
  pages_justes: pct(
    sum((s) => s.pagesJustes),
    sum((s) => s.pagesNotees),
  ),
  altitudes_justes: pct(
    sum((s) => s.altitudesJustes),
    sum((s) => s.altitudesNotees),
  ),
  erreurs: scores.filter((s) => s.erreur).length,
  jetons: [sum((s) => s.jetons[0]), sum((s) => s.jetons[1])],
  cout_reel_usd:
    startUsd === null || endUsd === null ? null : Math.round((endUsd - startUsd) * 1000) / 1000,
  details: scores,
};
console.log(JSON.stringify({ ...report, details: undefined }, null, 2));
if (outputPath) await Deno.writeTextFile(outputPath, JSON.stringify(report, null, 2));
