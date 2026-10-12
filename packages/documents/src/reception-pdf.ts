/**
 * PDF du procès-verbal de réception (F-25, F-26) : A4, polices standard, même mise en page que le
 * devis et la facture. Hors aperçu, balises de signature du prestataire (signature du maître de
 * l'ouvrage). Contenu : receptionDocumentModel (reception-model.ts).
 */
import { PDFDocument, rgb } from "pdf-lib";
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
import { QUOTE_TEXTS } from "./quote-model.ts";
import { SIGNATURE_TAGS } from "./quote-pdf.ts";
import { receptionDocumentModel, type ReceptionPdfData } from "./reception-model.ts";

export async function renderReceptionPdf(
  data: ReceptionPdfData,
  assets: DocumentAssets = {},
): Promise<Uint8Array> {
  const m = receptionDocumentModel(data);
  const doc = await PDFDocument.create();
  doc.setTitle(`Procès-verbal de réception ${data.numero}`);
  doc.setAuthor(m.issuerName);
  doc.setCreator("MENAO");
  doc.setProducer("MENAO");
  doc.setLanguage("fr-FR");
  const fonts = await embedFonts(doc);
  const c = new Canvas(doc, fonts);
  const right = PAGE.width - PAGE.margin;

  // En-tête : entreprise à gauche, titre et références à droite.
  const top = c.y;
  const logo = await embedLogo(doc, assets.logo);
  const left = drawIssuer(c, top, { name: m.issuerName, lines: m.issuerLines, logo }, 260);
  c.text(m.title, right - 270, top - 18, 15, {
    bold: true,
    color: COLOR.primary,
    align: "right",
    width: 270,
  });
  c.text(m.numberLine, right - 220, top - 34, 9, { bold: true, align: "right", width: 220 });
  c.text(m.dateLine, right - 220, top - 46, 9, { align: "right", width: 220 });
  c.y = Math.min(left, top - 46) - 18;

  // Parties : maître de l'ouvrage et entreprise.
  const section = (title: string) => {
    c.ensure(30);
    c.y -= 14;
    c.text(title, PAGE.margin, c.y, 10, { bold: true });
    c.y -= 2;
  };
  section(m.partiesTitle);
  for (const [label, text] of m.parties) {
    const lines = wrap(`${label} : ${text}`, fonts.regular, 9, CONTENT);
    for (const line of lines) {
      c.ensure(13);
      c.y -= 12;
      c.text(line, PAGE.margin, c.y, 9);
    }
  }
  section(m.siteTitle);
  for (const line of m.siteLines) {
    c.y -= 12;
    c.text(line, PAGE.margin, c.y, 9);
  }
  for (const reference of m.references) c.paragraph(reference, 9, { color: COLOR.muted });

  section(m.natureTitle);
  c.paragraph(m.nature, 9);

  // Réception : la case cochée correspond au cas réel.
  section(m.receptionTitle);
  for (const choice of m.choices) {
    c.ensure(16);
    c.y -= 15;
    const box = { x: PAGE.margin, y: c.y - 2, size: 10 };
    c.page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.size,
      height: box.size,
      borderColor: COLOR.text,
      borderWidth: 0.8,
    });
    if (choice.checked) {
      const ink = { thickness: 1.4, color: COLOR.primary };
      c.page.drawLine({
        start: { x: box.x + 2, y: box.y + 2 },
        end: { x: box.x + 8, y: box.y + 8 },
        ...ink,
      });
      c.page.drawLine({
        start: { x: box.x + 2, y: box.y + 8 },
        end: { x: box.x + 8, y: box.y + 2 },
        ...ink,
      });
    }
    c.text(choice.label, PAGE.margin + 16, c.y, 9, { bold: choice.checked });
  }

  section(m.observationsTitle);
  for (const line of m.observations) c.paragraph(line, 9);

  // Récapitulatif financier ; le solde est mis en avant.
  section(m.financialTitle);
  c.y -= 4;
  m.financial.forEach(([label, value], i) => {
    const last = i === m.financial.length - 1;
    c.ensure(18);
    c.y -= 16;
    if (last) {
      c.page.drawRectangle({
        x: PAGE.margin,
        y: c.y - 5,
        width: CONTENT,
        height: 18,
        color: COLOR.soft,
      });
    }
    c.text(label, PAGE.margin + 6, c.y, 9, { bold: last });
    c.text(value, right - 126, c.y, 9, { bold: last, align: "right", width: 120 });
  });
  c.y -= 10;
  c.paragraph(m.insuranceLine, 8, { color: COLOR.muted });

  // Lieu, date et signature du maître de l'ouvrage.
  c.ensure(110);
  c.y -= 16;
  c.text(m.placeLine, PAGE.margin, c.y, 9);
  const boxTop = c.y - 12;
  c.page.drawRectangle({
    x: right - 260,
    y: boxTop - 90,
    width: 260,
    height: 90,
    borderColor: COLOR.line,
    borderWidth: 0.8,
  });
  c.text(m.signatureLabel, right - 252, boxTop - 14, 8.5, { bold: true });
  if (!data.preview) {
    // Balises lues par le prestataire, écrites en blanc dans le cadre (ADR 0022).
    const tag = { size: 6, font: fonts.regular, color: rgb(1, 1, 1) };
    c.page.drawText(SIGNATURE_TAGS.date, { x: right - 252, y: boxTop - 30, ...tag });
    c.page.drawText(SIGNATURE_TAGS.signature, { x: right - 252, y: boxTop - 60, ...tag });
  }
  c.y = boxTop - 100;

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
