import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/commercial/gains/document-view";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getStatement } from "@/lib/commercial/gains";

export const metadata: Metadata = {
  title: `${fr.commercialGains.admin.title} — MENAO`,
  robots: { index: false },
};

/** Relevé ou facture d'un conseiller vu par un admin, à imprimer (F-197, ADR 0397). */
export default async function AdminCommercialDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdmin();
  const statement = await getStatement(supabase, id, true);
  if (!statement) notFound();
  return (
    <DocumentView
      statement={statement}
      type={type === "facture" ? "facture" : "releve"}
      back="/admin/commerciaux"
    />
  );
}
