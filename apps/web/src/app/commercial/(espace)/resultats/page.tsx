import {
  COMMERCIAL_MONTHLY_TARGET,
  COMMERCIAL_TRADE_TARGETS,
  formatZoneCodes,
  parisToday,
  sectorOfZone,
} from "@menao/core";
import type { Metadata } from "next";
import { z } from "zod";
import { GainsOverview } from "@/components/commercial/gains/gains-overview";
import { PacePanel } from "@/components/commercial/pace-panel";
import { EmptyState } from "@/components/empty-state";
import { ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getGains } from "@/lib/commercial/gains";
import { getCommercialPace } from "@/lib/commercial/pace";
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
  // Primes d'abonnement des offres 350 € et 950 € (ADR 0366, prix de l'ADR 0393) ; absentes avant la migration.
  prime_abonnement_premium_centimes: n.nullable().optional(),
  prime_abonnement_entreprise_centimes: n.nullable().optional(),
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
    <div className="flex flex-col gap-1.5 bg-surface px-5 py-4">
      <dt className="text-sm font-semibold text-label">{label}</dt>
      <dd className="font-display text-xl leading-tight font-bold tracking-tight tabular-nums sm:text-2xl">
        {value}
      </dd>
      {hint && <dd className="text-[0.8125rem] text-muted-foreground">{hint}</dd>}
    </div>
  );
}

/**
 * « Mes gains » des commerciaux (F-65, lot 3, ADR 0207 ; ma semaine, ADR 0381 ; gains, relevé et
 * facture en tête, ADR 0397) : inscrits, validés et abonnés (mois
 * en cours et total), objectif du mois s'il est fixé, prospects suivis, les six derniers mois, puis
 * les primes (montants fixés par l'équipe, en attente, à payer, payées) et leur règle.
 */
export default async function CommercialResultsPage() {
  const space = await getCommercialSpace();
  const [results, bonusList, pace, gains, statements] = space.active
    ? await Promise.all([
        space.supabase.rpc("commercial_results"),
        space.supabase.rpc("commercial_bonuses_list"),
        // Ma semaine, objectif commun et classement (ADR 0381).
        getCommercialPace(space.supabase),
        // Gains, relevés et factures (ADR 0397).
        getGains(space.supabase),
        space.supabase.rpc("commercial_statements_list"),
      ])
    : [null, null, null, null, null];
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.title}
          </h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>

        {!space.commercial ? (
          <Alert tone="info">{fr.commercialSpace.missing}</Alert>
        ) : !space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : !data ? (
          <Alert tone="error">{fr.commercialProspects.errors.unavailable}</Alert>
        ) : (
          <>
            {gains && (
              <GainsOverview
                gains={gains}
                statements={statements?.data ?? []}
                bonuses={bonuses}
                today={parisToday()}
              />
            )}
            {pace ? <PacePanel pace={pace} /> : <Alert tone="error">{t.pace.unavailable}</Alert>}
            <dl className="grid gap-px overflow-hidden rounded-card border border-border bg-border shadow-card sm:grid-cols-3">
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

            {/* Refonte « Nette » (ADR 0260) : prospects et mois à gauche, objectif et primes à droite. */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="flex min-w-0 flex-col gap-6">
                <section aria-labelledby="pipeline" className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 id="pipeline" className="text-lg">
                      {t.pipeline.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t.pipeline.followed(data.pipeline.followed)}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border shadow-card sm:grid-cols-4">
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
                  <h2 id="mois" className="text-lg">
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
                            <td className="px-2 py-3 text-right tabular-nums">
                              {count(m.signups)}
                            </td>
                            <td className="px-2 py-3 text-right tabular-nums">
                              {count(m.validated)}
                            </td>
                            <td className="py-3 pr-4 pl-2 text-right tabular-nums sm:pr-5">
                              {count(m.subscribed)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              <div className="flex flex-col gap-6">
                <SectorCard zone={space.zone} />
                {target !== null && (
                  <Card className="flex flex-col gap-3">
                    <p className="text-[0.9375rem] font-medium">
                      {t.objective(data.validated_month, target)}
                    </p>
                    <div
                      aria-hidden="true"
                      className="h-2 overflow-hidden rounded-full bg-background"
                    >
                      <div
                        className="h-full rounded-full bg-success"
                        style={{
                          width: `${Math.min(100, Math.round((data.validated_month / target) * 100))}%`,
                        }}
                      />
                    </div>
                  </Card>
                )}

                <section aria-labelledby="primes" className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 id="primes" className="text-lg">
                      {t.bonuses.title}
                    </h2>
                    {validationAmount || subscriptionAmount ? (
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {validationAmount && <p>{t.bonuses.scale.validation(validationAmount)}</p>}
                        {subscriptionAmount && (
                          <>
                            <p>{t.bonuses.scale.subscription}</p>
                            <ul className="grid grid-cols-3 gap-2">
                              {(
                                [
                                  ["base", data.prime_abonnement_centimes],
                                  ["premium", data.prime_abonnement_premium_centimes],
                                  ["entreprise", data.prime_abonnement_entreprise_centimes],
                                ] as const
                              ).map(([plan, cents]) => (
                                <li
                                  key={plan}
                                  className="flex flex-col rounded-input border border-border bg-surface px-3 py-2"
                                >
                                  <span className="text-xs">{t.bonuses.scale.plans[plan]}</span>
                                  <b className="text-base text-foreground tabular-nums">
                                    + {money(cents ?? data.prime_abonnement_centimes ?? 0)}
                                  </b>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t.bonuses.notSet}</p>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border shadow-card">
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
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/** Mon secteur et l'objectif par métier (ADR 0367). */
function SectorCard({ zone }: { zone: readonly string[] }) {
  const sector = sectorOfZone(zone);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg">{t.sector.title}</h2>
        <p className="text-[0.9375rem] font-semibold">
          {sector
            ? t.sector.named(sector.number, sector.name)
            : zone.length
              ? t.sector.custom(formatZoneCodes(zone))
              : t.sector.none}
        </p>
        {sector && <p className="text-sm text-muted-foreground">{sector.communes}</p>}
        <p className="text-sm text-muted-foreground">{t.sector.balance}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[0.9375rem] font-semibold">{t.trades.title}</h3>
        <p className="text-[0.8125rem] text-muted-foreground">{t.trades.lead}</p>
        <table className="w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">{t.trades.trade}</th>
              <th scope="col">{t.trades.perMonth}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {COMMERCIAL_TRADE_TARGETS.map((row) => (
              <tr key={row.trade}>
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  {row.trade}
                </th>
                <td className="py-1.5 text-right font-semibold tabular-nums">{row.perMonth}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1.5 pr-2 text-left font-semibold">
                {t.trades.total}
              </th>
              <td className="py-1.5 text-right font-bold tabular-nums">
                {COMMERCIAL_MONTHLY_TARGET}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
