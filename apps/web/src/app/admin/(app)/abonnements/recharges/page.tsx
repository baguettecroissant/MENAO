import { VOICE_COST_CENTS_PER_MINUTE } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { AdminSectionHeader } from "@/components/admin/admin-tabs";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";

const t = fr.admin.ai;
const f = fr.admin.followUp;
const tu = t.topUps;
const v = t.voice;
const count = (n: number) => n.toLocaleString("fr-FR");
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = {
  title: `${fr.admin.tabs.subscriptions.topUps} — ${fr.admin.title}`,
};

/**
 * Abonnements, onglet « Recharges de minutes » (ADR 0283, rangées avant dans le suivi de l'IA) :
 * recharges vendues ce mois-ci (ADR 0233) et minutes de voix consommées par chaque artisan
 * (ADR 0231), sur le mois en cours, heure de Paris.
 */
export default async function AdminTopUpsPage() {
  const { supabase } = await requireAdmin();
  const monthStart = new Date(
    `${new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()).slice(0, 7)}-01T00:00:00+01:00`,
  ).toISOString();
  const [{ data: voiceUsage, error: voiceError }, { data: topUpRows }] = await Promise.all([
    supabase.rpc("admin_voice_usage"),
    supabase
      .from("voice_credits")
      .select("seconds, amount_ht_cents")
      .eq("reason", "recharge")
      .gte("created_at", monthStart),
  ]);
  const topUps = (topUpRows ?? []).reduce(
    (acc, row) => ({
      count: acc.count + 1,
      cents: acc.cents + (row.amount_ht_cents ?? 0),
      minutes: acc.minutes + Math.floor(row.seconds / 60),
    }),
    { count: 0, cents: 0, minutes: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeader
        set="subscriptions"
        current="topUps"
        title={fr.admin.subscriptions.title}
        intro={fr.admin.subscriptions.intro}
      />
      {/* Recharges de minutes vendues ce mois-ci (ADR 0233). */}
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{tu.title}</h2>
        {topUps.count === 0 ? (
          <p className="text-sm text-muted-foreground">{tu.empty}</p>
        ) : (
          <SummaryTiles label={tu.title}>
            <SummaryTile label={tu.sold} value={count(topUps.count)} />
            <SummaryTile label={tu.revenue} value={euros(topUps.cents)} />
            <SummaryTile label={tu.minutes} value={count(topUps.minutes)} />
            <SummaryTile
              label={tu.margin}
              value={euros(topUps.cents - topUps.minutes * VOICE_COST_CENTS_PER_MINUTE)}
              hint={tu.marginHint}
            />
          </SummaryTiles>
        )}
      </Card>
      {/* Minutes de voix des agents IA des artisans (ADR 0231), toujours sur le mois en cours. */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">{v.title}</h2>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{v.intro}</p>
        </div>
        {voiceError ? (
          <Alert tone="error">{v.error}</Alert>
        ) : !voiceUsage?.length ? (
          <p className="text-sm text-muted-foreground">{v.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[36rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {v.company}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {v.plan}
                  </th>
                  {[v.calls, v.minutes, v.cost].map((label) => (
                    <th key={label} scope="col" className="py-2 pr-4 text-right font-normal">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {voiceUsage.map((row) => {
                  const minutes = Math.ceil(row.secondes / 60);
                  return (
                    <tr key={row.artisan_id} className="border-t border-border">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/artisans/${row.artisan_id}` as Route}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {row.entreprise}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{row.formule ?? f.none}</td>
                      <td className="py-3 pr-4 text-right">{count(row.appels)}</td>
                      <td className="py-3 pr-4 text-right">{count(minutes)}</td>
                      <td className="py-3 pr-4 text-right">
                        {euros(minutes * VOICE_COST_CENTS_PER_MINUTE)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
