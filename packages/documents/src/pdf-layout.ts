/**
 * Mise en page commune des documents PDF (devis, factures) : format A4, polices standard
 * (Helvetica), couleurs, découpage du texte et pagination.
 */
import {
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
  rgb,
} from "pdf-lib";

export const PAGE = { width: 595.28, height: 841.89, margin: 40, footer: 36 };
export const CONTENT = PAGE.width - PAGE.margin * 2;
export const COLOR = {
  text: rgb(0.067, 0.09, 0.157),
  muted: rgb(0.39, 0.42, 0.47),
  primary: rgb(0.282, 0.412, 0.965),
  line: rgb(0.9, 0.91, 0.94),
  soft: rgb(0.945, 0.957, 0.996),
};

export type Fonts = { regular: PDFFont; bold: PDFFont };

/** Découpe un texte en lignes tenant dans la largeur (coupe aussi les mots trop longs). */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
        continue;
      }
      if (current) out.push(current);
      current = "";
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    out.push(current);
  }
  return out;
}

export class Canvas {
  page: PDFPage;
  y: number;

  constructor(
    readonly doc: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.page = this.addPage();
    this.y = PAGE.height - PAGE.margin;
  }

  addPage(): PDFPage {
    const page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.page = page;
    this.y = PAGE.height - PAGE.margin;
    return page;
  }

  /** Nouvelle page si la hauteur demandée ne tient pas au-dessus du pied de page. */
  ensure(height: number): boolean {
    if (this.y - height >= PAGE.margin + PAGE.footer) return false;
    this.addPage();
    return true;
  }

  text(
    value: string,
    x: number,
    y: number,
    size: number,
    options: { bold?: boolean; color?: RGB; align?: "left" | "right"; width?: number } = {},
  ) {
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const textWidth = font.widthOfTextAtSize(value, size);
    const left = options.align === "right" && options.width ? x + options.width - textWidth : x;
    this.page.drawText(value, { x: left, y, size, font, color: options.color ?? COLOR.text });
  }

  /** Paragraphe enveloppé ; renvoie la hauteur utilisée. */
  paragraph(
    value: string,
    size: number,
    options: { bold?: boolean; color?: RGB; width?: number } = {},
  ) {
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const lines = wrap(value, font, size, options.width ?? CONTENT);
    for (const line of lines) {
      this.ensure(size + 3);
      this.y -= size + 3;
      this.text(line, PAGE.margin, this.y, size, options);
    }
  }

  rule() {
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.6,
      color: COLOR.line,
    });
  }
}

/** Polices standard du PDF, sans fichier à embarquer (texte en WinAnsi, voir format.ts). */
export async function embedFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}
