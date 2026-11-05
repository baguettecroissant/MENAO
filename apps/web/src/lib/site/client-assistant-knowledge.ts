import "server-only";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "./catalog";
import { publishedGuides } from "./guides";
import { llmsFullTxt } from "./llms";

const k = fr.search.assistant.knowledge;

/**
 * Texte de référence de l'assistant des particuliers (ADR 0220) : la présentation publiée pour les
 * assistants IA (llms-full.txt : faits clés, fonctionnement, communes, FAQ), les métiers et les
 * guides publiés (titres et résumés, vers lesquels l'assistant oriente). Il suit le site sans
 * copie à tenir à jour.
 */
export async function clientAssistantKnowledge(): Promise<string> {
  const [base, { trades }] = await Promise.all([llmsFullTxt(), seoCatalog()]);
  const guides = publishedGuides();
  return [
    base,
    "",
    `## ${k.trades}`,
    ...trades.map((trade) => `- ${trade.label}`),
    ...(guides.length
      ? ["", `## ${k.guides}`, ...guides.map((g) => `- ${g.title} : ${g.description}`)]
      : []),
  ].join("\n");
}
