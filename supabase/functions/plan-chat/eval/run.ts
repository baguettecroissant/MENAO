// Évaluation du chat « Demander à MENAO » (F-160, lot E, ADR 0348). Pose chaque question d'un
// fichier de cas au vrai modèle avec un relevé de plans, puis compare la réponse aux nombres
// attendus (ou à une question de précision attendue). Les relevés et les cas tirés de vrais plans
// restent hors du dépôt.
// Usage (clés dans .env.staging, jamais affichées) :
//   deno run -A eval/run.ts <relevé.json> <cas.json> <rapport.json>
// Prix (dollars par million de tokens) : PRIX_ENTREE, PRIX_SORTIE, PRIX_CACHE_LU, PRIX_CACHE_ECRIT.
import { llmConfig, planChatModel } from "../../_shared/ai.ts";
import { askPlanChat, type ChatUsage } from "../chat.ts";

type Case = {
  id: string;
  question: string;
  nombres?: number[];
  un_parmi?: number[];
  precision?: boolean;
};

const [surveyPath, casesPath, reportPath] = Deno.args;
if (!surveyPath || !casesPath || !reportPath) {
  console.error("usage : deno run -A eval/run.ts <relevé.json> <cas.json> <rapport.json>");
  Deno.exit(1);
}
const survey = JSON.parse(await Deno.readTextFile(surveyPath));
const cases = JSON.parse(await Deno.readTextFile(casesPath)) as Case[];
const only = Deno.env.get("SEULEMENT")?.split(",");

// Bibliothèque fictive : quelques fournitures et un ouvrage au prix connu.
const LIBRARY = {
  fournitures: [
    {
      designation: "Plaque de plâtre BA13 2,50 × 1,20 m",
      unite: "u",
      prix_achat_centimes: 790,
      perte_pourcent: 0,
    },
    { designation: "Rail R48 3 m", unite: "u", prix_achat_centimes: 320, perte_pourcent: 0 },
    { designation: "Montant M48 2,70 m", unite: "u", prix_achat_centimes: 380, perte_pourcent: 0 },
    { designation: "Fourrure F530 3 m", unite: "u", prix_achat_centimes: 290, perte_pourcent: 0 },
    { designation: "Suspente pivot", unite: "u", prix_achat_centimes: 45, perte_pourcent: 0 },
  ],
  ouvrages: [
    { designation: "Faux plafond BA13 sur fourrures", unite: "m2", prix_vente_centimes: 4500 },
  ],
};
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const library = (text: string) => {
  const words = norm(text).split(/\s+/).filter(Boolean);
  const hit = (name: string) => words.some((w) => norm(name).includes(w));
  return Promise.resolve({
    fournitures: LIBRARY.fournitures.filter((f) => hit(f.designation)),
    ouvrages: LIBRARY.ouvrages.filter((o) => hit(o.designation)),
  });
};

/** Tous les nombres de la réponse : texte, lignes, fournitures, montants. */
function numbersOf(answer: string, result: unknown): number[] {
  const found = [...answer.matchAll(/\d[\d  ]*(?:[,.]\d+)?/g)].map((m) =>
    Number(m[0].replace(/[  ]/g, "").replace(",", ".")),
  );
  const r = result as {
    lignes?: { quantite: number }[];
    fournitures?: { quantite: number; total_centimes: number | null }[];
    total_centimes?: number | null;
  };
  for (const l of r?.lignes ?? []) found.push(l.quantite);
  for (const f of r?.fournitures ?? []) {
    found.push(f.quantite);
    if (f.total_centimes !== null) found.push(f.total_centimes / 100);
  }
  if (r?.total_centimes != null) found.push(r.total_centimes / 100);
  return found;
}
const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.02, Math.abs(b) * 0.005);

const llm = llmConfig();
if (!llm) {
  console.error("Aucune clé d'IA (ANTHROPIC_API_KEY ou OPENROUTER_API_KEY).");
  Deno.exit(1);
}
const model = planChatModel();
const price = (name: string, fallback: number) =>
  Number(Deno.env.get(name) ?? fallback) / 1_000_000;
const rows = [];
let total = 0;
for (const c of cases) {
  if (only && !only.includes(c.id)) continue;
  const usage: ChatUsage = { inputTokens: 0, outputTokens: 0 };
  const started = Date.now();
  let outcome;
  try {
    outcome = await askPlanChat({
      client: llm.client,
      model,
      survey,
      history: [],
      question: c.question,
      library,
      usage,
    });
  } catch (error) {
    outcome = { kind: "failed" as const, reason: error instanceof Error ? error.message : "?" };
  }
  const seconds = (Date.now() - started) / 1000;
  // Coût estimé : entrée au prix plein (borne haute, le cache réduit la facture réelle).
  const cost =
    usage.inputTokens * price("PRIX_ENTREE", 4) + usage.outputTokens * price("PRIX_SORTIE", 20);
  total += cost;
  let ok = false;
  let detail = "";
  if (outcome.kind === "failed") detail = `échec : ${outcome.reason}`;
  else if (c.precision) {
    ok = outcome.kind === "question";
    detail =
      outcome.kind === "question"
        ? `précision : ${outcome.question}`
        : `réponse au lieu d'une précision : ${outcome.answer}`;
  } else if (outcome.kind === "question")
    detail = `précision au lieu d'une réponse : ${outcome.question}`;
  else {
    const nums = numbersOf(outcome.answer, outcome.result);
    ok = c.un_parmi
      ? c.un_parmi.some((e) => nums.some((n) => near(n, e)))
      : (c.nombres ?? []).every((e) => nums.some((n) => near(n, e)));
    detail = outcome.answer;
  }
  rows.push({
    id: c.id,
    ok,
    detail,
    etapes: outcome.kind === "failed" ? [] : outcome.result.etapes,
    secondes: seconds,
    tokens: usage,
    cout_dollars: Math.round(cost * 10_000) / 10_000,
  });
  console.log(`${ok ? "✓" : "✗"} ${c.id} · ${seconds.toFixed(0)} s · ${cost.toFixed(3)} $`);
}
const passed = rows.filter((r) => r.ok).length;
const report = {
  modele: model,
  cas: rows.length,
  justes: passed,
  cout_estime_dollars: Math.round(total * 1000) / 1000,
  resultats: rows,
};
await Deno.writeTextFile(reportPath, JSON.stringify(report, null, 1));
console.log(
  `\n${passed}/${rows.length} justes · ${total.toFixed(2)} $ (borne haute) · modèle ${model}`,
);
