import { clientAssistantKnowledge } from "@/lib/site/client-assistant-knowledge";

// Généré au build et régénéré une fois par jour, comme llms-full.txt : aucune fonction par visite
// (spec §4.4).
export const dynamic = "force-static";
export const revalidate = 86400;

/** Texte de référence de l'assistant des particuliers (ADR 0220), lu par l'Edge Function. */
export async function GET() {
  return new Response(await clientAssistantKnowledge(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Texte technique : pas dans les résultats des moteurs de recherche.
      "x-robots-tag": "noindex",
    },
  });
}
