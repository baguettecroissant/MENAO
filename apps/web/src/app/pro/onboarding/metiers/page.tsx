import { parisToday, validRgeDomains } from "@menao/core";
import { CERTIFICATION_TYPES } from "@menao/validation";
import { ShieldCheck } from "lucide-react";
import { sheetCard } from "@/components/pro/sheet";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteCertification, refreshRge } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { planUsage } from "@/lib/artisan/plan-limits";
import { RGE_REFRESH_STATUSES, type RgeRefreshStatus } from "@/lib/rge";
import { CertificationForm } from "./certification-form";
import { TradesForm } from "./trades-form";

const t = fr.pro.onboarding.trades;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const checkedFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
});

export default async function TradesStepPage({
  searchParams,
}: {
  searchParams: Promise<{ rge?: string }>;
}) {
  const { rge } = await searchParams;
  const rgeStatus = (RGE_REFRESH_STATUSES as readonly string[]).includes(rge ?? "")
    ? (rge as RgeRefreshStatus)
    : null;
  const { supabase, artisan, tradeCodes, workTypeCodes, certifications } =
    await getOnboardingContext();
  const [{ data: trades }, { data: workTypes }, { data: rgeRows }, usage] = await Promise.all([
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("work_types")
      .select("code, label, trade_code")
      .eq("active", true)
      .order("sort_order"),
    // Qualifications RGE lues dans l'annuaire de l'ADEME (ADR 0118).
    supabase
      .from("artisan_rge_qualifications")
      .select("domaine, date_fin")
      .eq("artisan_id", artisan.id),
    // Limite de métiers de la formule (ADR 0290).
    planUsage(supabase),
  ]);
  const rgeDomains = validRgeDomains(
    (rgeRows ?? []).map((r) => ({ domain: r.domaine, endsOn: r.date_fin })),
    parisToday(),
  );

  // Refonte « Nette » (lot 47, ADR 0316) : métiers à gauche ; RGE et certifications à droite.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
      <Card>
        <TradesForm
          trades={(trades ?? []).map((trade) => ({
            ...trade,
            workTypes: (workTypes ?? []).filter((w) => w.trade_code === trade.code),
          }))}
          selectedTrades={tradeCodes}
          selectedWorkTypes={workTypeCodes}
          experienceYears={artisan.experience_years}
          diploma={artisan.diplome_metier}
          budgetMinimum={artisan.budget_minimum}
          maxTrades={usage.trades.limit}
        />
      </Card>

      <div className="flex flex-col gap-4">
        <section aria-labelledby="rge-titre" className={`${sheetCard} gap-2.5`}>
          <span className="flex size-10 items-center justify-center rounded-input bg-success-soft text-success">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <h2 id="rge-titre" className="text-base font-bold tracking-tight">
            {t.rge}
          </h2>
          <p className="text-[0.84375rem] leading-[1.45] text-label">{t.rgeTitle}</p>
          {rgeStatus && (
            <Alert tone={rgeStatus === "ok" ? "success" : "error"}>{t.rgeStatus[rgeStatus]}</Alert>
          )}
          {rgeDomains.length > 0 ? (
            <>
              <p className="text-sm">{t.rgeFound}</p>
              <ul className="flex flex-wrap gap-1.5">
                {rgeDomains.map((domain) => (
                  <li key={domain}>
                    <StatusBadge tone="success">{domain}</StatusBadge>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t.rgeNone}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
            {artisan.rge_checked_at && (
              <p className="text-muted-foreground">
                {t.rgeCheckedOn(checkedFormat.format(new Date(artisan.rge_checked_at)))}
              </p>
            )}
            <form action={refreshRge}>
              <button
                type="submit"
                className="min-h-touch font-semibold text-primary-strong hover:underline"
              >
                {t.rgeRefresh}
              </button>
            </form>
          </div>
        </section>

        <section aria-labelledby="certif-titre" className={`${sheetCard} gap-2.5`}>
          <h2 id="certif-titre" className="text-base font-bold tracking-tight">
            {t.certifications}
          </h2>
          <p className="text-[0.8125rem] leading-[1.45] text-muted-foreground">
            {t.certificationsHint}
          </p>
          {certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noCertification}</p>
          ) : (
            <ul className="flex flex-col">
              {certifications.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{fr.certificationTypes[c.type]}</span> ·{" "}
                    {c.numero} · {t.certValidUntil(dateFormat.format(new Date(c.date_fin)))}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={c.verified_at ? "success" : "primary"}>
                      {c.verified_at ? t.certVerified : t.certPending}
                    </StatusBadge>
                    <form action={deleteCertification}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="min-h-touch px-1 text-sm font-medium text-danger underline-offset-2 hover:underline"
                      >
                        {t.certDelete}
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border pt-3">
            <CertificationForm types={CERTIFICATION_TYPES} />
          </div>
        </section>
      </div>
    </div>
  );
}
