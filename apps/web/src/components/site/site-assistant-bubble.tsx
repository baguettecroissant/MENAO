import { ClientAssistantBubble } from "@/components/project/client-assistant-bubble";
import { seoCatalog } from "@/lib/site/catalog";

/**
 * Bulle de l'assistant des particuliers (ADR 0220), ajoutée page par page sur les pages
 * d'information du site : jamais masquée selon l'adresse (accueil pré-généré, ADR 0199).
 */
export async function SiteAssistantBubble() {
  const { trades } = await seoCatalog();
  return <ClientAssistantBubble trades={trades.map(({ code, label }) => ({ code, label }))} />;
}
