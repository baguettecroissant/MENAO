import type { Metadata } from "next";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay } from "@/lib/format";

const t = fr.commercialResults;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const count = (n: number) => n.toLocaleString("fr-FR");
// Mois AAAA-MM → « oct. 2026 » (colonne étroite sur téléphone).
const monthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

// Résultats du commercial (commercial_results, F-65 lot 3, ADR 0207). Réglages nuls : pas décidés.
const n = z.number().int().nonnegative();
const resultsSchema = z.object({
  signups: n,
  validated: n,
  subscribed: n,
  signups_month: n,
  validated_month: n,
  subscribed_month: n,
  by_month: z.array(z.object({ month: z.string(), signups: n, validated: n, subscribed: n })),
  pipeline: z.object({
    followed: n,
    a_contacter: n,
    rdv_pris: n,
    demo_faite: n,
    pas_interesse: n,
  }),
  bonuses: z.object({ pending: n, validated_cents: n, paid_cents: n }),
  prime_validation_centimes: n.nullable(),
  prime_abonnement_centimes: n.nullable(),
  objectif_valides_mois: n.nullable(),
});

const PIPELINE = ["a_contacter", "rdv_pris", "demo_faite", "pas_interesse"] as const;

const BONUS_TONES: Record<string, ListTone> = {
  en_attente: "primary",
  validee: "warning",
  annulee: "neutral",
  payee: "success",
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-medium tracking-tight tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-subtle-foreground">{hint}</dd>}
    </div>
  );
}

/**
 * « Mes résultats » des commerciaux (F-65, lot 3, ADR 0207) : inscrits, validés et abonnés (mois
 * en cours et total), objectif du mois s'il est fixé, prospects suivis, les six derniers mois, puis
 * les primes (montants fixés par l'équipe, en attente, à payer, payées) et leur règle.
 */
export default async function CommercialResultsPage() {
  const space = await getCommercialSpace();
  const [results, bonusList] = space.active
    ? await Promise.all([
        space.supabase.rpc("commercial_results"),
        space.supabase.rpc("commercial_bonuses_list"),
      ])
    : [null, null];
  const parsed = results?.error ? null : resultsSchema.safeParse(results?.data);
  const data = parsed?.success ? parsed.data : null;
  const bonuses = bonusList?.data ?? [];

  const validationAmount =
    data?.prime_validation_centimes != null ? money(data.prime_validation_centimes) : null;
  const subscriptionAmount =
    data?.prime_abonnement_centimes != null ? money(data.prime_abonnement_centimes) : null;
  const target = data?.objectif_valides_mois ?? null;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>

        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : !data ? (
          <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <Tile
                label={t.figures.signups}
                value={t.figures.thisMonth(data.signups_month)}
                hint={t.figures.total(data.signups)}
              />
              <Tile
                label={t.figures.validated}
                value={t.figures.thisMonth(data.validated_month)}
                hint={t.figures.total(data.validated)}
              />
              <Tile
                label={t.figures.subscribed}
                value={t.figures.thisMonth(data.subscribed_month)}
                hint={t.figures.total(data.subscribed)}
              />
            </dl>

            {target !== null && (
              <Card className="flex flex-col gap-3">
                <p className="text-[0.9375rem] font-medium">
                  {t.objective(data.validated_month, target)}
                </p>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.round((data.validated_month / target) * 100))}%`,
                    }}
                  />
                </div>
              </Card>
            )}

            <section aria-labelledby="pipeline" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="pipeline" className="text-lg font-medium">
                  {t.pipeline.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t.pipeline.followed(data.pipeline.followed)}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PIPELINE.map((key) => (
                  <Tile
                    key={key}
                    label={fr.commercialProspects.status[key] ?? key}
                    value={count(data.pipeline[key])}
                  />
                ))}
              </dl>
            </section>

            <section aria-labelledby="mois" className="flex flex-col gap-3">
              <h2 id="mois" className="text-lg font-medium">
                {t.months.title}
              </h2>
              <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
                <table className="w-full text-left text-sm">
                  <caption className="px-4 pt-4 text-left text-sm text-muted-foreground sm:px-5">
                    {t.months.caption}
                  </caption>
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th scope="col" className="px-4 py-2 font-medium sm:px-5">
                        {t.months.month}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        {t.figures.signups}
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">
                        {t.figures.validated}
                      </th>
                      <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium sm:pr-5">
                        {t.figures.subscribed}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.by_month.map((m) => (
                      <tr key={m.month}>
                        <th scope="row" className="px-4 py-3 font-normal sm:px-5">
                          {monthLabel.format(new Date(`${m.month}-15T12:00:00Z`))}
                        </th>
                        <td className="px-2 py-3 text-right tabular-nums">{count(m.signups)}</td>
                        <td className="px-2 py-3 text-right tabular-nums">{count(m.validated)}</td>
                        <td className="py-3 pr-4 pl-2 text-right tabular-nums sm:pr-5">
                          {count(m.subscribed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="primes" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="primes" className="text-lg font-medium">
                  {t.bonuses.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {validationAmount || subscriptionAmount
                    ? t.bonuses.amounts(validationAmount, subscriptionAmount)
                    : t.bonuses.notSet}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <Tile label={t.bonuses.validated} value={money(data.bonuses.validated_cents)} />
                <Tile label={t.bonuses.paid} value={money(data.bonuses.paid_cents)} />
              </dl>
              <p className="text-sm text-muted-foreground">
                {t.bonuses.pending(data.bonuses.pending)}
              </p>
              {bonusList?.error ? (
                <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
              ) : bonuses.length === 0 ? (
                <EmptyState illustration="documents">{t.bonuses.empty}</EmptyState>
              ) : (
                <ListPanel label={t.bonuses.listLabel}>
                  {bonuses.map((b) => {
                    // En attente : date prévue de la vérification ; ensuite, sa date réelle.
                    const checked =
                      b.status === "en_attente" ? b.validate_after : (b.validated_at ?? null);
                    return (
                      <ListRow
                        key={b.id}
                        title={b.artisan || fr.commercialSpace.signups.unnamed}
                        detail={[
                          t.bonuses.kind[b.kind] ?? b.kind,
                          checked
                            ? b.status === "en_attente"
                              ? t.bonuses.checkOn(formatDay(checked))
                              : t.bonuses.delay(formatDay(checked))
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        value={b.amount_cents != null ? money(b.amount_cents) : undefined}
                        status={{
                          text: t.bonuses.status[b.status] ?? b.status,
                          tone: BONUS_TONES[b.status] ?? "neutral",
                        }}
                      />
                    );
                  })}
                </ListPanel>
              )}
              <p className="text-xs text-muted-foreground">{t.bonuses.rules}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
