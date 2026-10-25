import { describe, expect, it } from "vitest";
import { accountantExportContent } from "../src/accountant.ts";
import { renderAccountantExport } from "../src/render.tsx";

const email = {
  company: "Entreprise Exemple",
  period: "septembre 2026",
  downloadUrl: "https://stockage.example/export.zip?token=x",
  expiresOn: "31 octobre 2026",
  invoices: 3,
  expenses: 1,
};

describe("e-mail du comptable (F-63)", () => {
  it("objet, contenu et lien de téléchargement", () => {
    const content = accountantExportContent(email);
    expect(content.subject).toBe("Entreprise Exemple : factures et dépenses de septembre 2026");
    expect(content.paragraphs[0]).toBe(
      "Entreprise Exemple vous transmet son export comptable de septembre 2026, préparé par MENAO : 3 factures et 1 dépense, en tableaux CSV et avec les pièces.",
    );
    expect(content.paragraphs[1]).toBe(
      "Le lien de téléchargement est valable jusqu'au 31 octobre 2026.",
    );
    expect(content.cta.url).toBe(email.downloadUrl);
  });

  it("partie non demandée : pas citée", () => {
    const content = accountantExportContent({ ...email, invoices: null, expenses: 0 });
    expect(content.paragraphs[0]).toContain(": 0 dépense, en tableaux");
  });

  it("pied de page propre au comptable, sans la mention du compte MENAO", () => {
    const rendered = renderAccountantExport(email, "https://menao.example");
    expect(rendered.text).toContain("vous a indiqué comme comptable sur MENAO");
    expect(rendered.text).not.toContain("vous avez un compte MENAO");
    expect(rendered.html).toContain("Télécharger l&#x27;export (ZIP)");
  });
});
