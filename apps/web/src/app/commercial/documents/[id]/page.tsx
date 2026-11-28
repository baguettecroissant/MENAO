import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/commercial/gains/document-view";
import { fr } from "@/i18n/fr";
import { getStatement } from "@/lib/commercial/gains";
import { getCommercialSpace } from "@/lib/commercial/space";

export const metadata: Metadata = {
  title: `${fr.commercialGains.steps.ctaShort} — MENAO`,
  robots: { index: false },
};

/** Relevé (par défaut) ou facture du conseiller, à imprimer (F-197, ADR 0397). */
export default async function CommercialDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  const space = await getCommercialSpace(`/commercial/documents/${id}`);
  if (!space.active) notFound();
  const statement = await getStatement(space.supabase, id);
  if (!statement) notFound();
  return (
    <DocumentView
      statement={statement}
      type={type === "facture" ? "facture" : "releve"}
      back={`/commercial/resultats/releve/${id}`}
    />
  );
}
