// Boucle du chat « Demander à MENAO » (F-160, ADR 0346) : le modèle comprend la question et
// choisit les calculs ; packages/core les fait (materials.ts, plan-chat-calc.ts) ; la réponse cite
// les étapes. Une information manque : le modèle pose une question au lieu de deviner.
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ceilingTakeoff,
  paintTakeoff,
  partitionTakeoff,
  priceSupplies,
  skirtingTakeoff,
  tileTakeoff,
} from "../../../packages/core/src/materials.ts";
import { evaluateExpression } from "../../../packages/core/src/plan-chat-calc.ts";
import {
  CHAT_TOOLS,
  type ChatAnswer,
  type ChatCall,
  ceilingForModel,
  chatAnswerFromTool,
  paintForModel,
  parseChatCall,
  partitionForModel,
  priceForModel,
  tileForModel,
} from "../../../packages/core/src/plan-chat-tools.ts";

/** Au plus 8 allers-retours avec le modèle, et une réponse en moins de 2 minutes. */
const MAX_ROUNDS = 8;
const DEADLINE_MS = 120_000;

export type ChatOutcome =
  | { kind: "answer"; answer: string; result: ChatAnswer }
  | { kind: "question"; question: string; choices: string[]; result: ChatAnswer }
  | { kind: "failed"; reason: "timeout" | "invalid" };

export type ChatUsage = { inputTokens: number; outputTokens: number };

const SYSTEM_RULES = `Tu es MENAO, l'assistant de métré des artisans du bâtiment. Tu réponds en français, en vouvoyant l'artisan, précisément et brièvement.
Règles :
- Tu ne calcules jamais de tête : chaque chiffre de ta réponse vient d'un outil (calculer, cloison, plafond, peinture, carrelage, plinthes, chiffrer) ou du relevé ci-dessous.
- Tu pars du relevé des plans fourni : pièces (surface, périmètre, hauteur, origine), ouvrages écrits sur les plans, éléments comptés, symboles. « estime » veut dire estimé par MENAO, à signaler. Un plan de l'existant sert aux déposes, pas au neuf.
- Pour une cloison, donne l'épaisseur écrite sur le plan quand elle y figure : l'outil vérifie le type. Un doublage se compte avec faces = 1.
- S'il manque une information utile (hauteur, type de cloison, dimensions des ouvertures, rendement d'un produit, pourcentage de chutes, pièces concernées), utilise demander_precision avec des choix courts, au lieu de deviner.
- Pour un prix, cherche d'abord dans la bibliothèque de l'artisan (chercher_bibliotheque), puis chiffre (chiffrer). Prix des fournitures : prix d'achat ; prix des ouvrages : prix de vente.
- Termine toujours par repondre (réponse courte, métré ligne par ligne, fournitures) ou par demander_precision.
- Cite d'où vient chaque mesure (pièce, page du plan, cote lue ou estimation) et les ratios utilisés avec leur source.`;

type Library = (text: string) => Promise<unknown>;

/** Exécute un outil de calcul ou de recherche ; renvoie le résultat pour le modèle et ses étapes. */
async function runTool(
  call: ChatCall,
  library: Library,
): Promise<{ result: unknown; steps: string[] }> {
  switch (call.tool) {
    case "calculer": {
      const r = evaluateExpression(call.expression, call.values);
      return r.ok
        ? {
            result: { valeur: r.value },
            steps: [`Calcul : ${call.expression} = ${r.value.toLocaleString("fr-FR")}`],
          }
        : { result: { erreur: r.error }, steps: [] };
    }
    case "cloison": {
      const out = {
        ...partitionForModel(partitionTakeoff(call.input)),
        montants_mm: call.input.studWidthMm,
      };
      return { result: out, steps: out.etapes };
    }
    case "plafond": {
      const out = ceilingForModel(ceilingTakeoff(call.input));
      return { result: out, steps: out.etapes };
    }
    case "peinture": {
      const out = paintForModel(paintTakeoff(call.input));
      return {
        result: out,
        steps: [
          `Peinture : ${out.murs_m2.toLocaleString("fr-FR")} m² de murs, ${out.plafonds_m2.toLocaleString("fr-FR")} m² de plafonds`,
        ],
      };
    }
    case "carrelage": {
      const out = tileForModel(tileTakeoff(call.input));
      return {
        result: out,
        steps: [
          `Carrelage : ${out.surface_avec_chutes_m2.toLocaleString("fr-FR")} m² avec chutes, ${out.carreaux} carreaux`,
        ],
      };
    }
    case "plinthes": {
      const { lengthMm } = skirtingTakeoff(call.input);
      const metres = Math.round(lengthMm / 10) / 100;
      return {
        result: { plinthes_ml: metres },
        steps: [`Plinthes : ${metres.toLocaleString("fr-FR")} ml`],
      };
    }
    case "chercher_bibliotheque":
      return { result: await library(call.text), steps: [`Bibliothèque : « ${call.text} »`] };
    case "chiffrer": {
      const out = priceForModel(
        priceSupplies(
          call.lines.map((l) => ({
            label: l.label,
            quantityMilli: l.quantityMilli,
            unitPriceCents: l.unitPriceCents,
          })),
        ),
      );
      return {
        result: out,
        steps: [
          `Chiffrage : ${(out.total_centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT`,
        ],
      };
    }
    case "demander_precision":
      return { result: null, steps: [] };
  }
}

/** Recherche dans la bibliothèque de l'artisan (jeton de l'utilisateur : ses données seules). */
export function libraryOf(asUser: SupabaseClient): Library {
  return async (text: string) => {
    const like = `%${text.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const [{ data: supplies }, { data: works }] = await Promise.all([
      asUser
        .from("artisan_supplies")
        .select("designation, unit, purchase_price_cents, waste_bp")
        .ilike("designation", like)
        .limit(8),
      asUser
        .from("artisan_works")
        .select("designation, unit, manual_price_cents")
        .ilike("designation", like)
        .limit(8),
    ]);
    return {
      fournitures: (supplies ?? []).map((s) => ({
        designation: s.designation,
        unite: s.unit,
        prix_achat_centimes: s.purchase_price_cents,
        perte_pourcent: (s.waste_bp ?? 0) / 100,
      })),
      ouvrages: (works ?? []).map((w) => ({
        designation: w.designation,
        unite: w.unit,
        prix_vente_centimes: w.manual_price_cents,
      })),
    };
  };
}

/**
 * Pose la question au modèle avec le relevé et l'historique ; fait tourner les outils jusqu'à la
 * réponse finale ou la question de précision.
 */
export async function askPlanChat(input: {
  client: Anthropic;
  model: string;
  survey: unknown;
  history: Anthropic.MessageParam[];
  question: string;
  library: Library;
  usage: ChatUsage;
}): Promise<ChatOutcome> {
  const started = Date.now();
  const system = `${SYSTEM_RULES}\n\nRelevé des plans de l'appel d'offres (JSON) :\n${JSON.stringify(input.survey)}`;
  const messages: Anthropic.MessageParam[] = [
    ...input.history,
    { role: "user", content: input.question },
  ];
  const steps: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (Date.now() - started > DEADLINE_MS) return { kind: "failed", reason: "timeout" };
    const response = await input.client.messages.create(
      {
        model: input.model,
        max_tokens: 4000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools: CHAT_TOOLS as unknown as Anthropic.Tool[],
        thinking: { type: "adaptive" },
        messages,
      },
      { timeout: 60_000 },
    );
    input.usage.inputTokens += response.usage.input_tokens;
    input.usage.outputTokens += response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (uses.length === 0) {
      // Réponse en texte seul : gardée telle quelle, sans métré.
      const text = response.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("\n")
        .trim();
      const parsed = chatAnswerFromTool({ reponse: text, titre: "Réponse", lignes: [] }, steps);
      return parsed.ok
        ? { kind: "answer", answer: parsed.answer, result: parsed.result }
        : { kind: "failed", reason: "invalid" };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      if (use.name === "repondre") {
        const parsed = chatAnswerFromTool(use.input, steps);
        if (parsed.ok) return { kind: "answer", answer: parsed.answer, result: parsed.result };
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: parsed.error,
        });
        continue;
      }
      const parsed = parseChatCall(use.name, use.input);
      if (!parsed.ok) {
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: parsed.error,
        });
        continue;
      }
      if (parsed.call.tool === "demander_precision") {
        const { question, choices } = parsed.call;
        return {
          kind: "question",
          question,
          choices,
          result: {
            titre: "Une précision",
            lignes: [],
            fournitures: [],
            total_centimes: null,
            etapes: steps.slice(0, 60),
          },
        };
      }
      try {
        const { result, steps: toolSteps } = await runTool(parsed.call, input.library);
        steps.push(...toolSteps);
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
      } catch {
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: "calcul impossible avec ces valeurs",
        });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { kind: "failed", reason: "timeout" };
}
