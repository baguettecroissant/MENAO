import { CERTIFICATION_TYPES } from "@menao/validation";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deleteCertification } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { CertificationForm } from "./certification-form";
import { TradesForm } from "./trades-form";

const t = fr.pro.onboarding.trades;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export default async function TradesStepPage() {
  const { supabase, artisan, tradeCodes, workTypeCodes, certifications } =
    await getOnboardingContext();
  const [{ data: trades }, { data: workTypes }] = await Promise.all([
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("work_types")
      .select("code, label, trade_code")
      .eq("active", true)
      .order("sort_order"),
  ]);

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
        />
      </Card>

      <Card>
        <h2 className="text-lg font-medium">{t.certifications}</h2>
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
