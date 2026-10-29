import type { Metadata } from "next";
import { CommercialInviteForm, CommercialStatusForm } from "@/components/admin/commercial-forms";
import { Card, CardTitle, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.commercials;
const count = (n: number) => n.toLocaleString("fr-FR");

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Commerciaux de terrain (F-65, ADR 0205) : liste, inscrits et validés par code, suspension, et
 * invitation d'un nouveau commercial. Réservé aux admins.
 */
export default async function AdminCommercialsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc("admin_commercials");
  const commercials = data ?? [];
  const c = t.columns;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>

      <Card className="flex flex-col gap-4 overflow-x-auto">
        <CardTitle title={t.listLabel} />
        {commercials.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {c.name}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {c.code}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.signups}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.validated}
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  <span className="sr-only">{c.status}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {commercials.map((m) => (
                <tr key={m.id}>
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2 font-medium">
                      {m.nom}
                      {m.status === "suspendu" && (
                        <StatusBadge tone="neutral">{t.status.suspendu}</StatusBadge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.signups)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.validated)}</td>
                  <td className="py-3 pl-3 text-right">
                    <CommercialStatusForm id={m.id} status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="flex flex-col gap-4 lg:max-w-2xl">
        <CardTitle title={t.newTitle} description={t.newLead} />
        <CommercialInviteForm />
      </Card>
    </div>
  );
}
