import type { Metadata, Route } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/list-controls";
import { PartnerForm, PartnerSettingsForm } from "@/components/admin/partner-forms";
import { Alert, Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import { commissionsToReview, getPartnerSettings, listPartners } from "@/lib/admin/partners";

const t = fr.admin.partners;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const count = (n: number) => n.toLocaleString("fr-FR");

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Programme Partenaires (F-59, ADR 0136) : partenaires et chiffres clés, réglages du programme,
 * création d'un partenaire, export des commissions à payer. Réservé aux admins.
 */
export default async function AdminPartnersPage({ searchParams }: PageProps<"/admin/partenaires">) {
  const page = parsePage((await searchParams).page);
  const { supabase } = await requireAdmin();
  const [{ rows: partners, total }, settings, toReview] = await Promise.all([
    listPartners(supabase, page),
    getPartnerSettings(supabase),
    commissionsToReview(supabase),
  ]);
  const amountsNotSet =
    settings !== null &&
    (settings.montant_demande_centimes === null || settings.montant_abonne_centimes === null);
  const c = t.columns;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      {amountsNotSet && <Alert tone="info">{t.settings.notSet}</Alert>}
      {toReview > 0 && <Alert tone="info">{t.quality.listToReview(toReview)}</Alert>}

      <Card className="flex flex-col gap-4 overflow-x-auto">
        <CardTitle
          title={t.title}
          action={
            <TextLink
              href={"/admin/partenaires/export" as Route}
              className="text-sm"
              prefetch={false}
            >
              {t.commissions.export}
            </TextLink>
          }
        />
        {partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {c.partner}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.projects}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.qualified}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.artisans}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.paying}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.pending}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {c.validated}
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  {c.paid}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-3">
                    <Link
                      href={`/admin/partenaires/${p.id}` as Route}
                      className="font-medium text-primary-strong hover:underline"
                    >
                      {p.nom}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p.code}
                      {p.status === "suspendu" && (
                        <StatusBadge tone="neutral">{t.status.suspendu}</StatusBadge>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.projects)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.qualified)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.artisans)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(p.paying)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {euros.format(p.pending_cents / 100)}
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">
                    {euros.format(p.validated_cents / 100)}
                  </td>
                  <td className="py-3 pl-3 text-right tabular-nums">
                    {euros.format(p.paid_cents / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          total={total}
          hrefFor={(p) => (p > 1 ? `/admin/partenaires?page=${p}` : "/admin/partenaires") as Route}
        />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle title={t.newTitle} description={t.newLead} />
          <PartnerForm />
        </Card>
        {settings && (
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.settings.title} description={t.settings.lead} />
            <PartnerSettingsForm settings={settings} />
          </Card>
        )}
      </div>
    </div>
  );
}
