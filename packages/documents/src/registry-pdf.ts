/**
 * PDF de la fiche de vérification au registre (ADR 0217) : A4, polices standard, même mise en page
 * que les devis et factures. Contenu : registryCheckModel (registry-model.ts).
 */
import { PDFDocument } from "pdf-lib";
import { CONTENT, COLOR, Canvas, PAGE, embedFonts, wrap } from "./pdf-layout.ts";
import { registryCheckModel, type RegistryCheckPdfData } from "./registry-model.ts";

export async function renderRegistryCheckPdf(data: RegistryCheckPdfData): Promise<Uint8Array> {
  const m = registryCheckModel(data);
  const doc = await PDFDocument.create();
  doc.setTitle(m.title);
  doc.setAuthor("MENAO");
  doc.setCreator("MENAO");
  doc.setProducer("MENAO");
  doc.setLanguage("fr-FR");
  const fonts = await embedFonts(doc);
  const c = new Canvas(doc, fonts);

  c.y -= 18;
  c.text(m.title, PAGE.margin, c.y, 15, { bold: true, color: COLOR.primary });
  c.y -= 16;
  c.text(m.subtitle, PAGE.margin, c.y, 10, { color: COLOR.muted });
  c.y -= 16;
  c.rule();

  // Identité de l'entreprise : libellés à gauche, valeurs à droite.
  c.y -= 6;
  for (const [label, value] of m.rows) {
    const lines = wrap(value, fonts.regular, 10, CONTENT - 140);
    c.ensure(16 * lines.length);
    c.y -= 16;
    c.text(label, PAGE.margin, c.y, 10, { bold: true });
    lines.forEach((line, i) => c.text(line, PAGE.margin + 140, c.y - i * 13, 10));
    c.y -= (lines.length - 1) * 13;
  }

  const section = (title: string, lines: readonly string[], size = 10) => {
    c.ensure(40);
    c.y -= 22;
    c.text(title, PAGE.margin, c.y, 11, { bold: true });
    c.y -= 4;
    for (const line of lines) {
      c.paragraph(line, size);
      c.y -= 4;
    }
  };
  section(m.resultTitle, m.result);
  section(m.sourcesTitle, m.sources, 9);

  // Mise en garde, dans un encadré clair.
  const notice = wrap(m.notice, fonts.regular, 9, CONTENT - 20);
  const height = notice.length * 12 + 16;
  c.ensure(height + 20);
  c.y -= 20;
  c.page.drawRectangle({
    x: PAGE.margin,
    y: c.y - height,
    width: CONTENT,
    height,
    color: COLOR.soft,
  });
  notice.forEach((line, i) => c.text(line, PAGE.margin + 10, c.y - 16 - i * 12, 9));
  c.y -= height;

  for (const page of doc.getPages()) {
    page.drawText(m.footer, {
      x: PAGE.margin,
      y: 22,
      size: 7,
      font: fonts.regular,
      color: COLOR.muted,
    });
  }
  return doc.save();
}
