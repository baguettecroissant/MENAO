import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";
import {
  CommercialBonusSettingsForm,
  CommercialInviteForm,
  CommercialStatusForm,
} from "@/components/admin/commercial-forms";
import { ProspectImport } from "@/components/admin/prospect-import";
import { Alert, Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { formatDayTimeInline } from "@/lib/format";

const t = fr.admin.commercials;
const tp = fr.admin.prospects;
const tr = fr.admin.commercialResults;
const count = (n: number) => n.toLocaleString("fr-FR");
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// Chiffres de la base de prospects (admin_prospects_summary, F-65 lot 2, ADR 0206).
const n = z.number().int().nonnegative();
const prospectsSummarySchema = z.object({
  total: n,
  followed: n,
  opt_outs: n,
  last_seen_at: z.string().nullable(),
  by_departement: z.array(z.object({ departement: z.string(), count: n })),
});

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Commerciaux de terrain (F-65, ADR 0205) : liste, inscrits et validés par code, suspension, et
 * invitation d'un nouveau commercial ; base de prospects et son import (lot 2, ADR 0206) ;
 * abonnés, prospects suivis, primes à payer, réglages des primes et export (lot 3, ADR 0207).
 * Réservé aux admins.
 */
export default async function AdminCommercialsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: summaryData }, { data: settings }] = await Promise.all([
    supabase.rpc("admin_commercials_dashboard"),
    supabase.rpc("admin_prospects_summary"),
    supabase
      .from("commercial_bonus_settings")
      .select(
        "prime_validation_centimes, prime_abonnement_centimes, delai_validation_jours, objectif_valides_mois",
      )
      .maybeSingle(),
  ]);
  const commercials = data ?? [];
  const parsedSummary = prospectsSummarySchema.safeParse(summaryData);
  const summary = parsedSummary.success ? parsedSummary.data : null;
  // Montants non décidés (règle 15) : aucune prime ne devient payable.
  const amountsNotSet =
    settings != null &&
    (settings.prime_validation_centimes === null || settings.prime_abonnement_centimes === null);
  const c = t.columns;
  const rc = tr.columns;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      {amountsNotSet && <Alert tone="info">{tr.settings.notSet}</Alert>}

      <Card className="flex flex-col gap-4 overflow-x-auto">
        <CardTitle
          title={t.listLabel}
          action={
            <TextLink
              href={"/admin/commerciaux/export" as Route}
              className="text-sm"
              prefetch={false}
            >
              {tr.export}
            </TextLink>
          }
        />
        {commercials.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <table className="w-full min-w-[52rem] text-left text-sm">
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
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {rc.subscribed}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {rc.followed}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {rc.toPay}
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
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/admin/commerciaux/${m.id}` as Route}
                        aria-label={tr.open(m.nom)}
                        className="font-medium text-primary-strong hover:underline"
                      >
                        {m.nom}
                      </Link>
                      {m.status === "suspendu" && (
                        <StatusBadge tone="neutral">{t.status.suspendu}</StatusBadge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{m.code}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.signups)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.validated)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.subscribed)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{count(m.followed)}</td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${m.to_pay_cents > 0 ? "font-medium" : ""}`}
                  >
                    {euros.format(m.to_pay_cents / 100)}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <CommercialStatusForm id={m.id} status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle title={t.newTitle} description={t.newLead} />
          <CommercialInviteForm />
        </Card>
        {settings && (
          <Card className="flex flex-col gap-4">
            <CardTitle title={tr.settings.title} description={tr.settings.lead} />
            <CommercialBonusSettingsForm settings={settings} />
          </Card>
        )}
      </div>

      <Card className="flex flex-col gap-4 lg:max-w-2xl">
        <CardTitle title={tp.title} description={tp.lead} />
        {summary && (
          <div className="flex flex-col gap-3 text-sm">
            <ul className="flex flex-col gap-1">
              <li className="font-medium">{tp.total(summary.total)}</li>
              <li>{tp.followed(summary.followed)}</li>
              <li>{tp.optOuts(summary.opt_outs)}</li>
            </ul>
            <p className="text-muted-foreground">
              {summary.last_seen_at
                ? tp.lastImport(formatDayTimeInline(summary.last_seen_at))
                : tp.never}
            </p>
            {summary.by_departement.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-medium text-muted-foreground">{tp.byDepartement}</h3>
                <dl className="flex flex-wrap gap-2">
                  {summary.by_departement.map((d) => (
                    <div
                      key={d.departement}
                      className="flex items-baseline gap-1.5 rounded-chip bg-background px-2.5 py-1"
                    >
                      <dt className="font-medium">{d.departement}</dt>
                      <dd className="tabular-nums text-muted-foreground">{count(d.count)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
        <ProspectImport />
      </Card>
    </div>
  );
}
