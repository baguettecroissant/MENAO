import { parisToday, validRgeDomains } from "@menao/core";
import { CERTIFICATION_TYPES } from "@menao/validation";
import { Alert, Card, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteCertification, refreshRge } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
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
  const [{ data: trades }, { data: workTypes }, { data: rgeRows }] = await Promise.all([
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
  ]);
  const rgeDomains = validRgeDomains(
    (rgeRows ?? []).map((r) => ({ domain: r.domaine, endsOn: r.date_fin })),
    parisToday(),
  );

  return (
    <div className="flex flex-col gap-6">
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
        />
      </Card>

      <Card>
        <h2 className="text-lg font-medium">{t.certifications}</h2>
        <section
          aria-labelledby="rge-titre"
          className="mt-4 mb-6 flex flex-col gap-2 rounded-card bg-primary-softer p-4 text-sm"
        >
          <h3 id="rge-titre" className="font-medium">
            {t.rgeTitle}
          </h3>
          {rgeStatus && (
            <Alert tone={rgeStatus === "ok" ? "success" : "error"}>{t.rgeStatus[rgeStatus]}</Alert>
          )}
          {rgeDomains.length > 0 ? (
            <>
              <p>{t.rgeFound}</p>
              <ul className="flex flex-wrap gap-1.5">
                {rgeDomains.map((domain) => (
                  <li key={domain}>
                    <Tag tone="neutral">{domain}</Tag>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground">{t.rgeNone}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {artisan.rge_checked_at && (
              <p className="text-muted-foreground">
                {t.rgeCheckedOn(checkedFormat.format(new Date(artisan.rge_checked_at)))}
              </p>
            )}
            <form action={refreshRge}>
              <button
                type="submit"
                className="min-h-touch font-semibold text-primary-strong underline underline-offset-4"
              >
                {t.rgeRefresh}
              </button>
            </form>
          </div>
        </section>
        <p className="mb-4 text-sm text-muted-foreground">{t.certificationsHint}</p>
        {certifications.length === 0 ? (
          <p className="mb-4 text-muted-foreground">{t.noCertification}</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {certifications.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-button border border-border px-3 py-2"
              >
                <span>
                  <span className="font-medium">{fr.certificationTypes[c.type]}</span> · {c.numero}{" "}
                  · {t.certValidUntil(dateFormat.format(new Date(c.date_fin)))}
                </span>
                <form action={deleteCertification}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="min-h-touch px-2 text-sm font-medium text-danger underline-offset-2 hover:underline"
                  >
                    {t.certDelete}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <CertificationForm types={CERTIFICATION_TYPES} />
      </Card>
    </div>
  );
}
