import { quoteLineSchema, type QuoteLineInput } from "@menao/validation";

/**
 * Lignes d'un brouillon de Camille (devis en conversation, ADR 0234), relues avec le schéma de
 * l'éditeur : une ligne invalide est écartée, jamais corrigée en silence.
 */
export function voiceDraftLines(raw: unknown): QuoteLineInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((line) => {
    const parsed = quoteLineSchema.safeParse(line);
    return parsed.success ? [parsed.data] : [];
  });
}
