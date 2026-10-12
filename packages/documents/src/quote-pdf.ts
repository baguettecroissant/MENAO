/**
 * PDF du devis (F-20) : A4, polices standard (Helvetica), tableau paginé. Le contenu vient de
 * quoteDocumentModel (quote-model.ts) ; seul ce module dépend de pdf-lib.
 */
import { PDFDocument, degrees, rgb } from "pdf-lib";
import { SIGNER_ROLE } from "../../core/src/signature.ts";
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
import { QUOTE_TEXTS as T, quoteDocumentModel, type QuotePdfData } from "./quote-model.ts";

/**
 * Balises lues par le prestataire de signature (F-13) : champs « date » et « signature » du
 * client, dans le cadre « Bon pour accord » du devis envoyé. Écrites en blanc, elles sont
 * retirées du PDF signé. Dimensions en points, vérifiées lors d'un essai réel (ADR 0022).
 */
export const SIGNATURE_TAGS = {
  date: `{{Date;role=${SIGNER_ROLE};type=date;width=90;height=12}}`,
  signature: `{{Signature;role=${SIGNER_ROLE};type=signature;width=200;height=34}}`,
} as const;

// ---------------------------------------------------------------------------
// Dessin (A4, Helvetica)
// ---------------------------------------------------------------------------

// Tableau : désignation, puis colonnes de valeurs alignées à droite (somme = largeur utile).
const DESIGNATION_WIDTH = 235;
const VALUE_COLUMNS = [
  { key: "quantity", width: 45 },
  { key: "unit", width: 45 },
  { key: "unitPrice", width: 70 },
  { key: "vat", width: 45 },
  { key: "total", width: 75 },
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
export async function renderQuotePdf(
  data: QuotePdfData,
  assets: DocumentAssets = {},
): Promise<Uint8Array> {
  const m = quoteDocumentModel(data);
  const doc = await PDFDocument.create();
  doc.setTitle(data.preview || !data.numero ? "Devis (aperçu)" : `Devis ${data.numero}`);
  doc.setAuthor(m.issuerName);
  doc.setCreator("MENAO");
  doc.setProducer("MENAO");
  doc.setLanguage("fr-FR");
  const fonts = await embedFonts(doc);
  const c = new Canvas(doc, fonts);
  const right = PAGE.width - PAGE.margin;

  // En-tête : artisan à gauche, titre et références à droite.
  const top = c.y;
  const logo = await embedLogo(doc, assets.logo);
  const left = drawIssuer(c, top, { name: m.issuerName, lines: m.issuerLines, logo }, 300);
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

  // « Bon pour accord » : date et signature du client, posées par le prestataire (F-13).
  c.ensure(118);
  c.y -= 14;
  const boxTop = c.y;
  c.page.drawRectangle({
    x: right - 250,
    y: boxTop - 100,
    width: 250,
    height: 100,
    borderColor: COLOR.line,
    borderWidth: 1,
  });
  c.text(winAnsi(T.agreement), right - 240, boxTop - 16, 9.5, { bold: true });
  c.text(winAnsi(T.agreementDate), right - 240, boxTop - 32, 8.5, { color: COLOR.muted });
  c.text(winAnsi(T.agreementSignature), right - 240, boxTop - 48, 8.5, { color: COLOR.muted });
  if (!data.preview) {
    const tag = { size: 5, font: fonts.regular, color: rgb(1, 1, 1) };
    c.page.drawText(SIGNATURE_TAGS.date, { x: right - 205, y: boxTop - 32, ...tag });
    c.page.drawText(SIGNATURE_TAGS.signature, { x: right - 240, y: boxTop - 60, ...tag });
  }
  c.y = boxTop - 106;

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
