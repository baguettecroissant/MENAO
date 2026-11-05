// Copilote du commercial (F-74, ADR 0223) : la seule source de l'IA sur MENAO est le guide terrain
// des commerciaux (apps/web/src/content/commercial/guide.ts), relu et tenu à jour par l'équipe.
// Il est importé tel quel et mis en texte ; seules les rubriques utiles à la prospection sont
// gardées (pas l'installation sur le téléphone, la journée type ni le kit d'impression).
import {
  COMMERCIAL_GUIDE,
  type CommercialGuideSection,
} from "../../../apps/web/src/content/commercial/guide.ts";
import type { GuideBlock } from "../../../apps/web/src/content/guides/types.ts";

/** Rubriques transmises à l'IA, dans cet ordre. */
export const COPILOT_GUIDE_SECTIONS = [
  "offre",
  "regles",
  "objections",
  "demo",
  "scripts",
  "parcours",
] as const;

/** Liens `[libellé](/chemin)` → libellé ; gras `**texte**` → texte. */
function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function blockText(block: GuideBlock): string {
  switch (block.type) {
    case "p":
      return plain(block.text);
    case "h2":
      return `### ${plain(block.text)}`;
    case "list":
      return block.items
        .map((item, i) => `${block.ordered ? `${i + 1}.` : "-"} ${plain(item)}`)
        .join("\n");
    case "callout":
      return `[${plain(block.title)}] ${plain(block.text)}`;
    case "table":
      return [
        `${plain(block.caption)} :`,
        ...block.rows.map(
          (row) =>
            `- ${row.map((cell, i) => `${block.head[i] ?? ""} : ${plain(cell)}`).join(" | ")}`,
        ),
      ].join("\n");
    case "flow":
      return [
        `${plain(block.caption)} :`,
        ...block.rows.map((row) => `- ${plain(row.label)} : ${row.steps.map(plain).join(" → ")}`),
      ].join("\n");
    case "document":
      return [
        `${plain(block.caption)} (${plain(block.title)}) :`,
        ...block.zones.map(
          (zone) => `- ${plain(zone.title)} : ${zone.items.map(plain).join(" ; ")}`,
        ),
      ].join("\n");
    default:
      // Schémas (frises, arbres de décision) : leur légende suffit, le texte du guide les décrit.
      return "caption" in block ? plain(block.caption) : "";
  }
}

function sectionText(section: CommercialGuideSection): string {
  return [`## ${section.title}`, ...section.body.map(blockText).filter(Boolean)].join("\n\n");
}

/** Le guide terrain mis en texte, pour la consigne de l'IA. */
export function commercialGuideText(): string {
  return COPILOT_GUIDE_SECTIONS.map((slug) => COMMERCIAL_GUIDE.find((s) => s.slug === slug))
    .filter((s): s is CommercialGuideSection => !!s)
    .map(sectionText)
    .join("\n\n");
}
