/**
 * PDF des factures (F-35) : A4, polices standard, même mise en page que le devis. Le contenu vient
 * de invoiceDocumentModel (invoice-model.ts).
 */
import { PDFDocument } from "pdf-lib";
import { winAnsi } from "./format.ts";
import { INVOICE_TEXTS as T, invoiceDocumentModel, type InvoicePdfData } from "./invoice-model.ts";
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
import { QUOTE_TEXTS } from "./quote-model.ts";

const AMOUNT_WIDTH = 110;
// Bloc des totaux : libellés longs de la facture de solde (« Acompte versé (facture …) »).
const TOTALS_WIDTH = 330;

export async function renderInvoicePdf(
  data: InvoicePdfData,
  assets: DocumentAssets = {},
): Promise<Uint8Array> {
  const m = invoiceDocumentModel(data);
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${data.numero}`);
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
  c.text(winAnsi(m.title), right - 260, top - 18, 18, {
    bold: true,
    color: COLOR.primary,
    align: "right",
    width: 260,
  });
  c.text(winAnsi(m.numberLine), right - 220, top - 34, 9, {
    bold: true,
    align: "right",
    width: 220,
  });
  c.text(winAnsi(m.dateLine), right - 220, top - 46, 9, { align: "right", width: 220 });
  if (m.quoteLine) {
    c.text(winAnsi(m.quoteLine), right - 220, top - 58, 9, {
      color: COLOR.muted,
      align: "right",
      width: 220,
    });
  }
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
  c.text(winAnsi(QUOTE_TEXTS.client), PAGE.margin + 10, c.y - 14, 8, {
    bold: true,
    color: COLOR.muted,
  });
  c.text(winAnsi(QUOTE_TEXTS.site), colX, c.y - 14, 8, { bold: true, color: COLOR.muted });
  m.clientLines.forEach((line, i) =>
    c.text(line, PAGE.margin + 10, c.y - 27 - i * 11, 9, { bold: i === 0 }),
  );
  m.siteLines.forEach((line, i) => c.text(line, colX, c.y - 27 - i * 11, 9));
  c.y -= boxHeight + 6;

  c.paragraph(m.subjectLine, 10, { bold: true });
  c.paragraph(m.insuranceLine, 8, { color: COLOR.muted });
  c.y -= 4;

  // Désignation et montant hors taxe.
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
  c.text(winAnsi(T.columns.total), right - AMOUNT_WIDTH, c.y, 8, {
    bold: true,
    color: COLOR.muted,
    align: "right",
    width: AMOUNT_WIDTH - 4,
  });
  c.y -= 8;
  for (const row of m.rows) {
    const lines = wrap(row.designation, fonts.regular, 9, CONTENT - AMOUNT_WIDTH - 12);
    const height = lines.length * 11 + 8;
    c.ensure(height);
    const rowTop = c.y - 11;
    lines.forEach((line, i) => c.text(line, PAGE.margin + 4, rowTop - i * 11, 9));
    c.text(row.total, right - AMOUNT_WIDTH, rowTop, 9, {
      align: "right",
      width: AMOUNT_WIDTH - 4,
    });
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
        x: right - TOTALS_WIDTH,
        y: c.y - 5,
        width: TOTALS_WIDTH,
        height: 18,
        color: COLOR.soft,
      });
    }
    c.text(winAnsi(label), right - TOTALS_WIDTH + 5, c.y, last ? 10 : 9, { bold: last });
    c.text(value, right - 125, c.y, last ? 10 : 9, { bold: last, align: "right", width: 120 });
  });
  c.y -= 14;

  if (m.paymentLine) c.paragraph(m.paymentLine, 9, { bold: true });
  c.y -= 2;
  for (const mention of m.mentions) c.paragraph(mention, 8, { color: COLOR.muted });

  // Pied de page.
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText(m.footer, {
      x: PAGE.margin,
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
    const label = winAnsi(QUOTE_TEXTS.page(i + 1, pages.length));
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
