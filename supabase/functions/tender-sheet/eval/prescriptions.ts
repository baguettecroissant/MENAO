// Essai de la lecture des ouvrages écrits sur un plan (F-159, lot 6, consigne de notes.ts) : revêtements indiqués par
// pièce, menuiseries avec leurs dimensions, ouvrages décrits par métier (cloisons, doublages, faux
// plafonds, démolition, équipements). Sert à chiffrer ce que le modèle retrouve et ce qu'il
// rattache mal avant d'écrire la base et l'écran. Rien n'est enregistré.
//
// Appels payants : accord du responsable d'abord. Depuis supabase/functions/tender-sheet :
//   deno run --allow-net --allow-env --allow-read --allow-write eval/prescriptions.ts
//     --vrais=/dossier [--passes=2] [--cas=sols] [--sortie=rapport.json] [--effort=medium]
// `--vrais` : dossier de plans (jamais versionnés) avec un prescriptions.json : pour chaque cas,
// l'image, puis ce qu'on attend (menuiseries, revêtement de sol par pièce, mots des ouvrages).
import { llmConfig, planModel, reasoningFor } from "../../_shared/ai.ts";
import { NOTES_SCHEMA, NOTES_SYSTEM } from "../notes.ts";

type Case = {
  id: string;
  fichier: string;
  /** Repère → [largeur, hauteur] en cm. */
  menuiseries?: Record<string, [number, number]>;
  /** Pièce → mot attendu dans le revêtement de sol (sans accents). */
  sols?: Record<string, string>;
  /** Mots (sans accents) attendus chacun dans au moins un ouvrage. */
  ouvrages?: string[];
};

const args = new Map(
  Deno.args.map((a) => {
    const [key, value] = a.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);
const passes = Math.max(1, Number(args.get("passes") ?? 1));
const only = args.get("cas")?.split(",");
const dir = args.get("vrais");
const outputPath = args.get("sortie");
const model = args.get("modele") ?? planModel();
const effort = (args.get("effort") ?? "medium") as "low" | "medium" | "high";
if (!dir) throw new Error("--vrais=/dossier attendu (plans et prescriptions.json).");
const cases = (JSON.parse(await Deno.readTextFile(`${dir}/prescriptions.json`)) as Case[]).filter(
  (c) => !only || only.includes(c.id),
);

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type Reading = {
  type_plan: string;
  pieces: { nom: string; sol: string; murs: string; plafond: string }[];
  menuiseries: {
    repere: string;
    designation: string;
    largeur_cm: number | null;
    hauteur_cm: number | null;
    details: string;
  }[];
  ouvrages: {
    metier: string;
    action: string;
    designation: string;
    piece: string;
    quantite: number | null;
    unite: string;
  }[];
};

const llm = llmConfig();
if (!llm) throw new Error("Aucune clé de modèle (OPENROUTER_API_KEY ou ANTHROPIC_API_KEY).");
const rows: unknown[] = [];

for (let pass = 1; pass <= passes; pass++) {
  for (const c of cases) {
    const started = Date.now();
    const bytes = await Deno.readFile(`${dir}/${c.fichier}`);
    try {
      const reasoning = reasoningFor(model);
      const response = await llm.client.messages.create(
        {
          model,
          max_tokens: 16000,
          thinking: reasoning.thinking,
          system: [{ type: "text", text: NOTES_SYSTEM }],
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: base64(bytes) },
                },
                { type: "text", text: "<plan>Relève ce qui est écrit sur ce plan.</plan>" },
              ],
            },
          ],
          output_config: {
            ...(reasoning.effort ? { effort } : {}),
            format: { type: "json_schema", schema: NOTES_SCHEMA },
          },
        },
        { timeout: 140_000, maxRetries: 0 },
      );
      const body = response.content.find((b) => b.type === "text")?.text ?? "";
      const reading = JSON.parse(body) as Reading;
      // Menuiseries : repère retrouvé et dimensions exactes.
      const wanted = Object.entries(c.menuiseries ?? {});
      const joinery = wanted.map(([mark, [w, h]]) => {
        const found = reading.menuiseries.find((m) => plain(m.repere) === plain(mark));
        return {
          repere: mark,
          attendu: `${w}x${h}`,
          lu: found ? `${found.largeur_cm ?? "?"}x${found.hauteur_cm ?? "?"}` : "absent",
          juste: !!found && found.largeur_cm === w && found.hauteur_cm === h,
        };
      });
      // Sols : le mot attendu figure dans le sol de la pièce.
      const floors = Object.entries(c.sols ?? {}).map(([room, word]) => {
        const found = reading.pieces.find((p) => plain(p.nom) === plain(room));
        return {
          piece: room,
          attendu: word,
          lu: found ? found.sol : "pièce absente",
          juste: !!found && plain(found.sol).includes(word),
        };
      });
      // Ouvrages : chaque mot attendu figure dans au moins une désignation.
      const all = reading.ouvrages.map((o) => plain(o.designation));
      const works = (c.ouvrages ?? []).map((word) => ({
        mot: word,
        trouve: all.some((d) => d.includes(word)),
      }));
      const ok = (list: { juste?: boolean; trouve?: boolean }[]) =>
        `${list.filter((x) => x.juste ?? x.trouve).length}/${list.length}`;
      console.log(
        `${c.id} (passe ${pass}) : « ${reading.type_plan} » — menuiseries ${ok(joinery)}${
          joinery.filter((j) => !j.juste).length
            ? ` (${joinery
                .filter((j) => !j.juste)
                .map((j) => `${j.repere} ${j.lu}≠${j.attendu}`)
                .join(", ")})`
            : ""
        }, sols ${ok(floors)}${
          floors.filter((f) => !f.juste).length
            ? ` (${floors
                .filter((f) => !f.juste)
                .map((f) => `${f.piece} : « ${f.lu} »`)
                .join(" ; ")})`
            : ""
        }, ouvrages ${ok(works)}${
          works.filter((w) => !w.trouve).length
            ? ` (manquent : ${works
                .filter((w) => !w.trouve)
                .map((w) => w.mot)
                .join(", ")})`
            : ""
        } — ${reading.ouvrages.length} ouvrages, ${reading.menuiseries.length} menuiseries, ${reading.pieces.length} pièces — ${Math.round((Date.now() - started) / 1000)} s — jetons ${response.usage?.input_tokens}/${response.usage?.output_tokens}`,
      );
      rows.push({ id: c.id, pass, joinery, floors, works, reading });
    } catch (error) {
      console.log(
        `${c.id} (passe ${pass}) : erreur ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`,
      );
    }
  }
}
if (outputPath)
  await Deno.writeTextFile(outputPath, JSON.stringify({ modele: model, effort, rows }, null, 2));
