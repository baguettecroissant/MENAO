import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { ChantierDocuments, type ChantierDocument } from "@/components/chantier/chantier-dossier";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

const t = fr.clientDocuments;
const d = fr.chantier.dossier;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Mes documents » (maquette « Mes chantiers - Mobile », onglet Documents) : devis, factures et
 * PV de réception de tous les chantiers du client, servis après contrôle d'accès.
 */
export default async function ClientDocumentsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/mon-espace/documents" as Route);
  const [{ data: chantiers }, { data: quotes }, { data: invoices }, { data: receptions }] =
    await Promise.all([
      supabase.rpc("particulier_chantiers"),
      supabase
        .from("quotes")
        .select("id, chantier_id, status, numero, sent_at, signed_at, version")
        .neq("status", "brouillon")
        .order("version", { ascending: false }),
      supabase
        .from("invoices")
        .select("id, chantier_id, numero, kind, issued_on")
        .order("issued_on"),
      supabase
        .from("receptions")
        .select("id, chantier_id, numero, status, signed_at")
        .eq("status", "signe"),
    ]);

  const sections = (chantiers ?? []).flatMap((c) => {
    // Dernière version envoyée du devis, comme dans le dossier du chantier.
    const quote = (quotes ?? []).find((q) => q.chantier_id === c.chantier_id && q.numero);
    const documents: ChantierDocument[] = [
      ...(quote?.numero
        ? [
            {
              href: `/devis/${quote.id}/pdf`,
              title: quote.status === "signe" ? d.signedQuote : d.quote,
              meta: d.meta(
                quote.numero,
                formatDateNumeric(quote.signed_at ?? quote.sent_at ?? c.created_at),
              ),
            },
          ]
        : []),
      ...(invoices ?? [])
        .filter((i) => i.chantier_id === c.chantier_id)
        .map((i) => ({
          href: `/factures/${i.id}/pdf`,
          title: d.invoice[i.kind],
          meta: d.meta(i.numero, formatDateNumeric(i.issued_on)),
        })),
      ...(receptions ?? [])
        .filter((r) => r.chantier_id === c.chantier_id && r.signed_at)
        .map((r) => ({
          href: `/receptions/${r.id}/pdf`,
          title: fr.chantier.reception.pvDocument,
          meta: d.meta(r.numero, formatDateNumeric(r.signed_at ?? c.created_at)),
        })),
    ];
    return documents.length ? [{ id: c.chantier_id, title: c.title, documents }] : [];
  });

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {sections.length ? (
          sections.map((section) => (
            <ChantierDocuments
              key={section.id}
              title={section.title}
              headingId={`documents-${section.id}`}
              documents={section.documents}
            />
          ))
        ) : (
          <EmptyState illustration="documents">{t.empty}</EmptyState>
        )}
      </div>
    </main>
  );
}
