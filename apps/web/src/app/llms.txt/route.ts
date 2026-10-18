import { llmsTxt } from "@/lib/site/llms";

// Généré au build et régénéré une fois par jour : aucune fonction par visite (spec §4.4).
export const dynamic = "force-static";
export const revalidate = 86400;

/** llms.txt (ADR 0134) : présentation de MENAO pour les assistants IA. */
export async function GET() {
  return new Response(await llmsTxt(), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
