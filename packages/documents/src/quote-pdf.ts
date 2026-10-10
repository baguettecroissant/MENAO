/**
 * PDF du devis (F-20) : A4, polices standard (Helvetica), tableau paginé. Le contenu vient de
 * quoteDocumentModel (quote-model.ts) ; seul ce module dépend de pdf-lib.
 */
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { winAnsi } from "./format.ts";
import { QUOTE_TEXTS as T, quoteDocumentModel, type QuotePdfData } from "./quote-model.ts";

// ---------------------------------------------------------------------------
// Dessin (A4, Helvetica)
// ---------------------------------------------------------------------------

const PAGE = { width: 595.28, height: 841.89, margin: 40, footer: 36 };
const CONTENT = PAGE.width - PAGE.margin * 2;
const COLOR = {
  text: rgb(0.067, 0.09, 0.157),
  muted: rgb(0.39, 0.42, 0.47),
  primary: rgb(0.282, 0.412, 0.965),
  line: rgb(0.9, 0.91, 0.94),
  soft: rgb(0.945, 0.957, 0.996),
};
// Tableau : désignation, puis colonnes de valeurs alignées à droite (somme = largeur utile).
const DESIGNATION_WIDTH = 235;
const VALUE_COLUMNS = [
  { key: "quantity", width: 45 },
  { key: "unit", width: 45 },
  { key: "unitPrice", width: 70 },
  { key: "vat", width: 45 },
  { key: "total", width: 75 },
] as const;

type Fonts = { regular: PDFFont; bold: PDFFont };

/** Découpe un texte en lignes tenant dans la largeur (coupe aussi les mots trop longs). */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
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

class Canvas {
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

function tableHeader(c: Canvas) {
  c.ensure(22);
  c.y -= 18;
  c.page.drawRectangle({
    x: PAGE.margin,
    y: c.y - 5,
    width: CONTENT,
    height: 18,
    color: COLOR.soft,
  });
  c.text(winAnsi(T.columns.designation), PAGE.margin + 4, c.y, 8, {
    bold: true,
    color: COLOR.muted,
  });
  let x = PAGE.margin + DESIGNATION_WIDTH;
  for (const column of VALUE_COLUMNS) {
    c.text(winAnsi(T.columns[column.key]), x + 4, c.y, 8, {
      bold: true,
      color: COLOR.muted,
      align: "right",
      width: column.width - 8,
    });
    x += column.width;
  }
  c.y -= 8;
}

/** Rendu du PDF (A4) : en-tête, client, tableau paginé, totaux, échéancier, mentions, accord. */
export async function renderQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const m = quoteDocumentModel(data);
  const doc = await PDFDocument.create();
  doc.setTitle(data.preview || !data.numero ? "Devis (aperçu)" : `Devis ${data.numero}`);
  doc.setAuthor(m.issuerName);
  doc.setCreator("MENAO");
  doc.setProducer("MENAO");
  doc.setLanguage("fr-FR");
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const c = new Canvas(doc, fonts);
  const right = PAGE.width - PAGE.margin;

  // En-tête : artisan à gauche, titre et références à droite.
  const top = c.y;
  c.text(m.issuerName, PAGE.margin, top - 14, 13, { bold: true });
  let left = top - 14;
  for (const line of m.issuerLines) {
    for (const part of wrap(line, fonts.regular, 8.5, 300)) {
      left -= 11;
      c.text(part, PAGE.margin, left, 8.5, { color: COLOR.muted });
    }
  }
  c.text(m.title, right - 200, top - 18, 22, {
    bold: true,
    color: COLOR.primary,
    align: "right",
    width: 200,
  });
  c.text(winAnsi(m.numberLine), right - 220, top - 34, 9, {
    bold: !data.preview,
    align: "right",
    width: 220,
  });
  c.text(winAnsi(m.dateLine), right - 220, top - 46, 9, { align: "right", width: 220 });
  c.text(winAnsi(m.validityLine), right - 220, top - 58, 9, {
    color: COLOR.muted,
    align: "right",
    width: 220,
  });
  c.y = Math.min(left, top - 58) - 18;

  // Client et chantier.
  const boxLines = Math.max(m.clientLines.length, m.siteLines.length + 1);
  const boxHeight = 22 + boxLines * 11;
  c.page.drawRectangle({
    x: PAGE.margin,
    y: c.y - boxHeight,
    width: CONTENT,
    height: boxHeight,
    color: COLOR.soft,
  });
  const colX = PAGE.margin + CONTENT / 2 + 8;
  c.text(winAnsi(T.client), PAGE.margin + 10, c.y - 14, 8, { bold: true, color: COLOR.muted });
  c.text(winAnsi(T.site), colX, c.y - 14, 8, { bold: true, color: COLOR.muted });
  m.clientLines.forEach((line, i) =>
    c.text(line, PAGE.margin + 10, c.y - 27 - i * 11, 9, { bold: i === 0 }),
  );
  m.siteLines.forEach((line, i) => c.text(line, colX, c.y - 27 - i * 11, 9));
  c.y -= boxHeight + 6;

  c.paragraph(m.subjectLine, 10, { bold: true });
  c.paragraph(m.insuranceLine, 8, { color: COLOR.muted });
  c.paragraph(m.datesLine, 8, { color: COLOR.muted });
  c.y -= 4;

  // Tableau des lignes, paginé (l'en-tête du tableau est répété).
  tableHeader(c);
  for (const row of m.rows) {
    const designation = wrap(row.designation, fonts.bold, 9, DESIGNATION_WIDTH - 8);
    const description = row.description
      ? wrap(row.description, fonts.regular, 7.5, DESIGNATION_WIDTH - 8)
      : [];
    const height = designation.length * 11 + description.length * 9.5 + 8;
    if (c.ensure(height)) tableHeader(c);
    const rowTop = c.y - 11;
    designation.forEach((line, i) =>
      c.text(line, PAGE.margin + 4, rowTop - i * 11, 9, { bold: true }),
    );
    description.forEach((line, i) =>
      c.text(line, PAGE.margin + 4, rowTop - designation.length * 11 - i * 9.5 + 1, 7.5, {
        color: COLOR.muted,
      }),
    );
    let x = PAGE.margin + DESIGNATION_WIDTH;
    for (const column of VALUE_COLUMNS) {
      c.text(row[column.key], x + 4, rowTop, 9, { align: "right", width: column.width - 8 });
      x += column.width;
    }
    c.y -= height;
    c.rule();
  }

  // Totaux, alignés à droite.
  c.ensure(m.totals.length * 14 + 12);
  c.y -= 6;
  m.totals.forEach(([label, value], i) => {
    const last = i === m.totals.length - 1;
    c.y -= last ? 16 : 13;
    if (last) {
      c.page.drawRectangle({
        x: right - 230,
        y: c.y - 5,
        width: 230,
        height: 18,
        color: COLOR.soft,
      });
    }
    c.text(winAnsi(label), right - 225, c.y, last ? 10 : 9, { bold: last });
    c.text(value, right - 125, c.y, last ? 10 : 9, { bold: last, align: "right", width: 120 });
  });
  c.y -= 14;

  // Échéancier et mentions.
  c.paragraph(winAnsi(T.scheduleTitle), 9.5, { bold: true });
  for (const line of m.scheduleLines) c.paragraph(`• ${line}`, 8.5);
  if (m.scheduleNote) c.paragraph(m.scheduleNote, 8.5);
  c.y -= 4;
  for (const mention of m.mentions) c.paragraph(mention, 8, { color: COLOR.muted });

  // « Bon pour accord » (signature électronique à venir, F-13).
  c.ensure(96);
  c.y -= 14;
  const boxTop = c.y;
  c.page.drawRectangle({
    x: right - 250,
    y: boxTop - 78,
    width: 250,
    height: 78,
    borderColor: COLOR.line,
    borderWidth: 1,
  });
  c.text(winAnsi(T.agreement), right - 240, boxTop - 16, 9.5, { bold: true });
  c.text(winAnsi(T.agreementDate), right - 240, boxTop - 34, 8.5, { color: COLOR.muted });
  c.text(winAnsi(T.agreementSignature), right - 240, boxTop - 50, 8.5, { color: COLOR.muted });
  c.y = boxTop - 84;

  // Pied de page et filigrane d'aperçu sur toutes les pages.
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(m.footer, {
      x: PAGE.margin,
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
    const label = winAnsi(T.page(i + 1, pages.length));
    page.drawText(label, {
      x: right - fonts.regular.widthOfTextAtSize(label, 7),
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
    if (data.preview) {
      page.drawText(winAnsi(T.watermark), {
        x: 150,
        y: 300,
        size: 96,
        font: fonts.bold,
        color: COLOR.primary,
        opacity: 0.08,
        rotate: degrees(40),
      });
    }
  });

  return doc.save();
}
