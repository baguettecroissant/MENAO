import { proAssistantKnowledge } from "@/lib/site/pro-assistant-knowledge";

// Généré au build et régénéré toutes les heures, comme la page Pro : aucune fonction par visite
// (spec §4.4).
export const dynamic = "force-static";
export const revalidate = 3600;

/** Texte de référence de l'assistant des pages Pro (ADR 0218), lu par l'Edge Function. */
export async function GET() {
  return new Response(await proAssistantKnowledge(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Texte technique : pas dans les résultats des moteurs de recherche.
      "x-robots-tag": "noindex",
    },
  });
}
