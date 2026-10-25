/**
 * E-mail du comptable (F-63, ADR 0187) : l'export des factures et des dépenses d'une période, par
 * un lien de téléchargement à durée limitée. Le comptable n'a pas de compte MENAO : pied de page
 * et réponse vont à l'artisan.
 */
import type { EmailContent } from "./content.ts";

export type AccountantExportEmail = {
  /** Raison sociale de l'artisan. */
  company: string;
  /** « septembre 2026 », « 3e trimestre 2026 ». */
  period: string;
  downloadUrl: string;
  /** Dernier jour de validité du lien, en toutes lettres (« 24 novembre 2026 »). */
  expiresOn: string;
  /** Nombre de factures et de dépenses ; null : partie non demandée. */
  invoices: number | null;
  expenses: number | null;
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export function accountantExportContent(email: AccountantExportEmail): EmailContent {
  const contents = [
    email.invoices === null ? null : plural(email.invoices, "facture"),
    email.expenses === null ? null : plural(email.expenses, "dépense"),
  ].filter(Boolean);
  return {
    subject: `${email.company} : factures et dépenses de ${email.period}`,
    preview: `Export de ${email.period} préparé par MENAO pour le comptable.`,
    title: `Export de ${email.period}`,
    paragraphs: [
      `${email.company} vous transmet son export comptable de ${email.period}, préparé par MENAO : ${contents.join(" et ")}, en tableaux CSV et avec les pièces.`,
      `Le lien de téléchargement est valable jusqu'au ${email.expiresOn}.`,
    ],
    quote: null,
    cta: { label: "Télécharger l'export (ZIP)", url: email.downloadUrl },
  };
}

export const accountantFooter = (company: string) =>
  `Vous recevez cet e-mail car ${company} vous a indiqué comme comptable sur MENAO. Pour toute question, répondez à ce message : il sera transmis à ${company}.`;
