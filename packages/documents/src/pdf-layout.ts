/**
 * Mise en page commune des documents PDF (devis, factures, PV) : format A4, polices standard
 * (Helvetica), couleurs, découpage du texte, pagination et bloc de l'émetteur avec son logo.
 */
import {
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFImage,
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

/** Logo de l'entreprise (ADR 0038) : fichier PNG ou JPEG vérifié au dépôt (process-upload). */
export type DocumentLogo = { bytes: Uint8Array; type: "png" | "jpeg" };
/** Éléments graphiques du rendu, fournis à part des données du document. */
export type DocumentAssets = { logo?: DocumentLogo | null };

/** Cadre du logo, en haut à gauche du document (points). */
export const LOGO_BOX = { width: 140, height: 56 };

/** Dimensions du logo dans son cadre, proportions conservées. */
export function fitLogo(
  width: number,
  height: number,
  box = LOGO_BOX,
): { width: number; height: number } {
  const scale = Math.min(box.width / width, box.height / height);
  const round = (value: number) => Math.round(value * 100) / 100;
  return { width: round(width * scale), height: round(height * scale) };
}

/** Logo intégré au PDF ; fichier illisible : null, le document sort sans logo. */
export async function embedLogo(
  doc: PDFDocument,
  logo: DocumentLogo | null | undefined,
): Promise<PDFImage | null> {
  if (!logo) return null;
  try {
    const image =
      logo.type === "png" ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
    // Intégration immédiate : une erreur de décodage n'empêche pas la production du document.
    await image.embed();
    return image;
  } catch {
    return null;
  }
}

/**
 * Bloc de l'émetteur en haut à gauche : logo éventuel, nom en gras, puis lignes d'identité
 * enveloppées dans la largeur donnée. Renvoie l'ordonnée de la dernière ligne écrite.
 */
export function drawIssuer(
  c: Canvas,
  top: number,
  issuer: { name: string; lines: string[]; logo: PDFImage | null },
  width: number,
): number {
  let y = top;
  if (issuer.logo) {
    const size = fitLogo(issuer.logo.width, issuer.logo.height);
    c.page.drawImage(issuer.logo, { x: PAGE.margin, y: top - size.height, ...size });
    y -= size.height + 6;
  }
  c.text(issuer.name, PAGE.margin, y - 14, 13, { bold: true });
  let left = y - 14;
  for (const line of issuer.lines) {
    for (const part of wrap(line, c.fonts.regular, 8.5, width)) {
      left -= 11;
      c.text(part, PAGE.margin, left, 8.5, { color: COLOR.muted });
    }
  }
  return left;
}
