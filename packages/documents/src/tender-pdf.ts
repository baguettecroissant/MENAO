/**
 * PDF du DPGF chiffré (F-136, ADR 0287) : A4, polices standard, tableau paginé par lot. Le contenu
 * vient de tenderPdfData (tender-data.ts) ; seul ce module dépend de pdf-lib.
 */
import { PDFDocument } from "pdf-lib";
import { winAnsi } from "./format.ts";
import {
  CONTENT,
  COLOR,
  Canvas,
  PAGE,
  drawIssuer,
  embedFonts,
  embedLogo,
  wrap,
  type DocumentAssets,
} from "./pdf-layout.ts";
import { TENDER_TEXTS as T, type TenderPdfData } from "./tender-data.ts";

// Colonnes : n°, désignation, puis valeurs alignées à droite (somme = largeur utile).
const CODE_WIDTH = 42;
const DESIGNATION_WIDTH = 218;
const VALUE_COLUMNS = [
  { key: "unit", width: 35 },
  { key: "quantity", width: 60 },
  { key: "unitPrice", width: 75 },
  { key: "total", width: CONTENT - 42 - 218 - 35 - 60 - 75 },
] as const;

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
  const head = { bold: true, color: COLOR.muted };
  c.text(winAnsi(T.columns.code), PAGE.margin + 4, c.y, 8, head);
  c.text(winAnsi(T.columns.designation), PAGE.margin + CODE_WIDTH + 4, c.y, 8, head);
  let x = PAGE.margin + CODE_WIDTH + DESIGNATION_WIDTH;
  for (const column of VALUE_COLUMNS) {
    c.text(winAnsi(T.columns[column.key]), x + 4, c.y, 8, {
      ...head,
      align: "right",
      width: column.width - 8,
    });
    x += column.width;
  }
  c.y -= 8;
}

export async function renderTenderPdf(
  data: TenderPdfData,
  assets: DocumentAssets = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(data.headLines[0] ?? data.title);
  doc.setAuthor(data.issuerName);
  doc.setCreator("MENAO");
  doc.setProducer("MENAO");
  doc.setLanguage("fr-FR");
  const fonts = await embedFonts(doc);
  const c = new Canvas(doc, fonts);
  const right = PAGE.width - PAGE.margin;

  // En-tête : entreprise à gauche, titre et appel d'offres à droite.
  const top = c.y;
  const logo = await embedLogo(doc, assets.logo);
  const left = drawIssuer(c, top, { name: data.issuerName, lines: data.issuerLines, logo }, 280);
  c.text(data.title, right - 220, top - 18, 20, {
    bold: true,
    color: COLOR.primary,
    align: "right",
    width: 220,
  });
  data.headLines.forEach((line, i) => {
    const parts = wrap(line, fonts.regular, 9, 230);
    c.text(parts[0] ?? "", right - 230, top - 34 - i * 12, 9, {
      bold: i === 0,
      align: "right",
      width: 230,
    });
  });
  c.y = Math.min(left, top - 34 - data.headLines.length * 12) - 12;
  c.paragraph(data.insuranceLine, 8, { color: COLOR.muted });
  c.y -= 4;

  // Tableau paginé (en-tête répété) : titres de lot sur fond clair, postes en dessous.
  tableHeader(c);
  for (const row of data.rows) {
    if (row.kind === "titre") {
      const lines = wrap(
        [row.code, row.designation].filter(Boolean).join(" "),
        fonts.bold,
        9,
        CONTENT - 8,
      );
      const height = lines.length * 11 + 8;
      if (c.ensure(height + 14)) tableHeader(c);
      c.page.drawRectangle({
        x: PAGE.margin,
        y: c.y - height,
        width: CONTENT,
        height,
        color: COLOR.soft,
      });
      lines.forEach((line, i) =>
        c.text(line, PAGE.margin + 4, c.y - 11 - i * 11, 9, { bold: true }),
      );
      c.y -= height;
      continue;
    }
    const designation = wrap(row.designation, fonts.regular, 8.5, DESIGNATION_WIDTH - 8);
    const height = Math.max(designation.length * 10.5, row.architectQuantity ? 21 : 0) + 8;
    if (c.ensure(height)) tableHeader(c);
    const rowTop = c.y - 11;
    c.text(row.code, PAGE.margin + 4, rowTop, 8.5, { color: COLOR.muted });
    designation.forEach((line, i) =>
      c.text(line, PAGE.margin + CODE_WIDTH + 4, rowTop - i * 10.5, 8.5),
    );
    let x = PAGE.margin + CODE_WIDTH + DESIGNATION_WIDTH;
    for (const column of VALUE_COLUMNS) {
      const value = row[column.key];
      c.text(value, x + 4, rowTop, 8.5, {
        align: "right",
        width: column.width - 8,
        bold: column.key === "total",
        color: column.key === "unitPrice" && row.total === "" ? COLOR.muted : undefined,
      });
      if (column.key === "quantity" && row.architectQuantity) {
        c.text(row.architectQuantity, x + 4, rowTop - 10.5, 7, {
          align: "right",
          width: column.width - 8,
          color: COLOR.muted,
        });
      }
      x += column.width;
    }
    c.y -= height;
    c.rule();
  }

  // Totaux, alignés à droite.
  c.ensure(data.totals.length * 14 + 12);
  c.y -= 6;
  data.totals.forEach(([label, value], i) => {
    const last = i === data.totals.length - 1;
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
    c.text(label, right - 225, c.y, last ? 10 : 9, { bold: last });
    c.text(value, right - 125, c.y, last ? 10 : 9, { bold: last, align: "right", width: 120 });
  });
  c.y -= 14;
  for (const note of data.notes) c.paragraph(note, 8, { color: COLOR.muted });

  // Pied de page sur toutes les pages.
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(data.footer, {
      x: PAGE.margin,
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
    const label = winAnsi(`Page ${i + 1} / ${pages.length}`);
    page.drawText(label, {
      x: right - fonts.regular.widthOfTextAtSize(label, 7),
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
  });
  return doc.save();
}
