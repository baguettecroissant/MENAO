import { FORMATION_MODULES, formationModulePassed, parisToday, urssafStatus } from "@menao/core";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { Route } from "next";
import { z } from "zod";
import { Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { onboardingRaw, onboardingStateSchema } from "@/lib/commercial/onboarding";
import { commercialReady } from "@menao/core";
import { formatDay } from "@/lib/format";

const t = fr.commercialField.admin;

export const onboardingRowsSchema = z.array(
  z.object({
    id: z.string(),
    nom: z.string(),
    status: z.string(),
    zone: z.array(z.string()),
    created_at: z.string(),
    state: onboardingStateSchema,
  }),
);
export type OnboardingRow = z.infer<typeof onboardingRowsSchema>[number];

const ok = <CircleCheck aria-label="✓" className="size-[1.125rem] text-success" />;

/**
 * Back-office (F-194, ADR 0394) : l'arrivée de chaque conseiller, ses pièces et sa formation, puis
 * ce qui demande une action (contrat à confirmer, attestation Urssaf à renouveler).
 */
export function CommercialOnboardingCard({ rows }: { rows: OnboardingRow[] }) {
  const today = parisToday();
  const alerts: string[] = [];
  for (const row of rows) {
    const s = row.state;
    if (s.contrat_depose_le && !s.contrat_signe_le) alerts.push(t.alerts.contract(row.nom));
    const u = urssafStatus(s.urssaf_deposee_le, today);
    if (u.state === "bientot" && u.expiresOn)
      alerts.push(t.alerts.urssafSoon(row.nom, formatDay(u.expiresOn)));
    if (u.state === "expiree") alerts.push(t.alerts.urssafExpired(row.nom));
  }
  const warn = (label: string) => (
    <span className="text-[0.8125rem] font-bold text-warning">{label}</span>
  );
  return (
    <Card className="flex flex-col gap-4 overflow-x-auto">
      <CardTitle title={t.title} description={t.lead} />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-bold">{t.columns.name}</th>
              <th className="py-2 pr-3 font-bold">{t.columns.contract}</th>
              <th className="py-2 pr-3 font-bold">{t.columns.rsac}</th>
              <th className="py-2 pr-3 font-bold">{t.columns.urssaf}</th>
              <th className="py-2 pr-3 font-bold">{t.columns.rib}</th>
              <th className="py-2 pr-3 font-bold">{t.columns.formation}</th>
              <th className="py-2 font-bold">{t.columns.state}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const s = row.state;
              const raw = onboardingRaw(s);
              const u = urssafStatus(s.urssaf_deposee_le, today).state;
              const quizzes = FORMATION_MODULES.filter((m) =>
                formationModulePassed(raw.modules[m]),
              ).length;
              const ready = commercialReady(raw);
              return (
                <tr key={row.id} className="border-t border-border">
                  <td className="py-3 pr-3">
                    <TextLink href={`/admin/commerciaux/${row.id}` as Route}>{row.nom}</TextLink>
                  </td>
                  <td className="py-3 pr-3">
                    {s.contrat_signe_le
                      ? ok
                      : s.contrat_depose_le
                        ? warn(t.contract.toConfirm)
                        : warn(t.contract.none)}
                  </td>
                  <td className="py-3 pr-3">{s.rsac_numero ? ok : warn(t.missing)}</td>
                  <td className="py-3 pr-3">{u === "valide" ? ok : warn(t.urssaf[u])}</td>
                  <td className="py-3 pr-3">{s.rib_depose_le ? ok : warn(t.missing)}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {t.formation(quizzes, s.meilleur_entrainement)}
                  </td>
                  <td className="py-3">
                    <StatusBadge tone={ready ? "success" : "neutral"}>
                      {ready ? t.ready : t.inProgress}
                    </StatusBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t.alertsTitle}</h3>
          <ul className="flex flex-col divide-y divide-border text-sm">
            {alerts.map((alert) => (
              <li key={alert} className="flex items-center gap-2.5 py-2">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
