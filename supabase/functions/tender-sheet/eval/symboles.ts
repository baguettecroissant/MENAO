// Essai du comptage des symboles sur un plan (F-159, lot 7) : le modèle liste chaque symbole
// (points lumineux, prises, interrupteurs, appareils sanitaires, portes…) avec son centre en
// pixels ; le code ramène les zones au plan entier, supprime les doublons des chevauchements et
// compte par type. Sert à mesurer, avant d'écrire le code de production, ce que donnent le plan
// entier et les zones agrandies. Rien n'est enregistré.
//
// Appels payants : accord du responsable d'abord. Depuis supabase/functions/tender-sheet :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/symboles.ts
//     --vrais=/dossier [--lecture=entier|zones|les-deux] [--sortie=rapport.json]
// `--vrais` : dossier (jamais versionné) avec symboles.json : pour chaque plan, l'image entière et
// ses zones agrandies (fichier, décalage x/y dans le plan, échelle).
import { llmConfig, planModel, reasoningFor } from "../../_shared/ai.ts";
import { SYMBOL_SCHEMA, SYMBOL_SYSTEM } from "../symbols.ts";

type Zone = {
  fichier: string;
  x: number;
  y: number;
  echelle: number;
  largeur: number;
  hauteur: number;
};
type Plan = { id: string; fichier: string; largeur: number; hauteur: number; zones: Zone[] };

type Found = { type: string; x: number; y: number; piece: string };

const args = new Map(
  Deno.args.map((a) => {
    const [key, value] = a.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);
const dir = args.get("vrais");
if (!dir) throw new Error("--vrais=/dossier attendu (symboles.json et images).");
const mode = args.get("lecture") ?? "les-deux";
const outputPath = args.get("sortie");
const model = args.get("modele") ?? planModel();
const plans = JSON.parse(await Deno.readTextFile(`${dir}/symboles.json`)) as Plan[];
const llm = llmConfig();
if (!llm) throw new Error("Aucune clé de modèle (OPENROUTER_API_KEY ou ANTHROPIC_API_KEY).");

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

let tokensIn = 0;
let tokensOut = 0;
async function read(file: string, width: number, height: number) {
  const bytes = await Deno.readFile(`${dir}/${file}`);
  const reasoning = reasoningFor(model);
  const started = Date.now();
  const response = await llm!.client.messages.create(
    {
      model,
      max_tokens: 32000,
      thinking: reasoning.thinking,
      system: [{ type: "text", text: SYMBOL_SYSTEM }],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64(bytes) },
            },
            {
              type: "text",
              text: `<plan>Image de ${width} × ${height} pixels. Liste chaque symbole.</plan>`,
            },
          ],
        },
      ],
      output_config: {
        ...(reasoning.effort ? { effort: "medium" as const } : {}),
        format: { type: "json_schema", schema: SYMBOL_SCHEMA },
      },
    },
    { timeout: 300_000, maxRetries: 0 },
  );
  tokensIn += response.usage?.input_tokens ?? 0;
  tokensOut += response.usage?.output_tokens ?? 0;
  const body = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const data = JSON.parse(body) as { legende: string[]; symboles: Found[] };
  return { ...data, seconds: Math.round((Date.now() - started) / 1000) };
}

/** Doublons des chevauchements : même type à moins de `radius` pixels du plan. */
function dedupe(items: Found[], radius = 14): Found[] {
  const kept: Found[] = [];
  for (const item of items) {
    if (
      !kept.some((k) => k.type === item.type && Math.hypot(k.x - item.x, k.y - item.y) < radius)
    ) {
      kept.push(item);
    }
  }
  return kept;
}

const countOf = (items: Found[]) => {
  const counts: Record<string, number> = {};
  for (const i of items) counts[i.type] = (counts[i.type] ?? 0) + 1;
  return counts;
};

const report: Record<string, unknown>[] = [];
for (const plan of plans) {
  const readings: Record<string, { items: Found[]; legende: string[]; seconds: number }> = {};
  if (mode !== "zones") {
    const r = await read(plan.fichier, plan.largeur, plan.hauteur);
    readings.entier = { items: r.symboles, legende: r.legende, seconds: r.seconds };
  }
  if (mode !== "entier") {
    const results = await Promise.all(
      plan.zones.map(async (z) => {
        const r = await read(z.fichier, z.largeur, z.hauteur);
        // Zone agrandie → plan : on ne garde que les symboles de la partie propre à la zone, puis
        // on supprime les doublons restants des chevauchements.
        return {
          ...r,
          symboles: r.symboles.map((s) => ({
            ...s,
            x: z.x + s.x / z.echelle,
            y: z.y + s.y / z.echelle,
          })),
        };
      }),
    );
    readings.zones = {
      items: dedupe(results.flatMap((r) => r.symboles)),
      legende: results.flatMap((r) => r.legende),
      seconds: Math.max(...results.map((r) => r.seconds)),
    };
  }
  for (const [name, r] of Object.entries(readings)) {
    console.log(
      `${plan.id} (${name}) : ${r.items.length} symboles en ${r.seconds} s — ${JSON.stringify(countOf(r.items))}`,
    );
  }
  report.push({ id: plan.id, readings });
  if (outputPath) {
    // Une page par lecture : chaque symbole numéroté sur le plan, pour vérifier à l'œil.
    const image = base64(await Deno.readFile(`${dir}/${plan.fichier}`));
    for (const [name, r] of Object.entries(readings)) {
      const colors: Record<string, string> = {};
      const palette = [
        "#e11d48",
        "#2563eb",
        "#16a34a",
        "#d97706",
        "#7c3aed",
        "#0891b2",
        "#be185d",
        "#4d7c0f",
      ];
      [...new Set(r.items.map((i) => i.type))].forEach(
        (t, k) => (colors[t] = palette[k % palette.length]!),
      );
      const marks = r.items
        .map(
          (i, k) =>
            `<circle cx="${i.x}" cy="${i.y}" r="9" fill="none" stroke="${colors[i.type]}" stroke-width="3"/><text x="${i.x + 10}" y="${i.y - 8}" font-size="14" fill="${colors[i.type]}">${k + 1}</text>`,
        )
        .join("");
      const legend = Object.entries(countOf(r.items))
        .map(([t, n]) => `<li style="color:${colors[t]}">${t} : ${n}</li>`)
        .join("");
      await Deno.writeTextFile(
        outputPath.replace(/\.json$/, `-${plan.id}-${name}.html`),
        `<!doctype html><meta charset="utf-8"><ul>${legend}</ul><svg viewBox="0 0 ${plan.largeur} ${plan.hauteur}" width="${plan.largeur}"><image href="data:image/jpeg;base64,${image}" width="${plan.largeur}" height="${plan.hauteur}"/>${marks}</svg>`,
      );
    }
  }
}
console.log(`jetons : ${tokensIn} en entrée, ${tokensOut} en sortie`);
if (outputPath) await Deno.writeTextFile(outputPath, JSON.stringify({ model, report }, null, 2));
