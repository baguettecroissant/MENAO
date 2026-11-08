import {
  accountantPeriodRange,
  accountantRangeLabel,
  nextAccountantSendLabel,
  parisToday,
  type AccountantPeriod,
} from "@menao/core";
import { ArrowLeft, CircleAlert, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountantSettingsForm } from "@/components/pro/accountant-settings";
import { MoneyFigures } from "@/components/pro/money-figures";
import { SheetChip, sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { requireTeamPermission } from "@/lib/artisan/space";
import { formatDay } from "@/lib/format";

const t = fr.pro.accountant;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Envoi au comptable (F-63) : réglages de l'envoi automatique, « Envoyer maintenant » et derniers
 * envois. L'adresse du comptable n'est lue que par l'artisan.
 */
export default async function AccountantPage() {
  const { supabase } = await requireTeamPermission("accounting");
  const [{ data: settings }, { data: exports }, { count: missing }] = await Promise.all([
    supabase
      .from("accountant_settings")
      .select("enabled, email, period, include_invoices, include_expenses")
      .maybeSingle(),
    supabase
      .from("accountant_exports")
      .select(
        "id, kind, status, period_start, period_end, recipient, invoices_count, expenses_count, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(12),
    // Dépenses sans facture ni ticket : à compléter avant l'envoi (ADR 0253).
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .is("document_path", null),
  ]);
  const today = parisToday();
  const period: AccountantPeriod = settings?.period ?? "mensuel";

  const last = exports?.find((row) => row.status === "envoye") ?? null;
  const nextLabel = settings?.enabled ? nextAccountantSendLabel(period, today) : null;
  // Refonte « Nette » (ADR 0253) : chiffres, réglages à gauche, derniers envois à droite.
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/pro/factures"
          className="inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {fr.pro.invoices.title}
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.subtitle}</p>
        </div>
        <MoneyFigures
          label={t.figuresLabel}
          dense
          cells={[
            {
              label: t.figNext,
              short: t.figNextShort,
              value: nextLabel ?? t.figNextOff,
              hint: nextLabel
                ? t.figNextHint(accountantPeriodRange(period, today).label)
                : t.figNextOffHint,
            },
            {
              label: t.figLast,
              short: t.figLastShort,
              value: last ? formatDay(last.created_at) : "—",
              hint: last
                ? t.counts(last.invoices_count, last.expenses_count) || undefined
                : t.figLastNone,
            },
            {
              label: t.figMissing,
              short: t.figMissingShort,
              value: String(missing ?? 0),
              hint: t.figMissingHint,
              tone: (missing ?? 0) > 0 ? "danger" : undefined,
            },
          ]}
        />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <AccountantSettingsForm
              initial={{
                enabled: settings?.enabled ?? false,
                email: settings?.email ?? "",
                period,
                includeInvoices: settings?.include_invoices ?? true,
                includeExpenses: settings?.include_expenses ?? true,
              }}
              saved={settings !== null}
              lastPeriod={accountantPeriodRange(period, today).label}
              nextSend={nextLabel}
            />
          </div>
          <section aria-labelledby="derniers-envois" className={sheetCard}>
            <h2 id="derniers-envois" className="text-lg">
              {t.historyTitle}
            </h2>
            {(exports ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {(exports ?? []).map((row) => (
                  <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] ${row.status === "envoye" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}
                    >
                      {row.status === "envoye" ? (
                        <CircleCheck aria-hidden="true" className="size-[1.125rem]" />
                      ) : (
                        <CircleAlert aria-hidden="true" className="size-[1.125rem]" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">
                        {accountantRangeLabel(row.period_start, row.period_end)}
                      </span>
                      <span className="truncate text-[0.8125rem] text-muted-foreground">
                        {t.historyLine(formatDay(row.created_at), row.recipient)}
                      </span>
                      <span className="text-[0.8125rem] text-muted-foreground">
                        {[t.kinds[row.kind], t.counts(row.invoices_count, row.expenses_count)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <SheetChip tone={row.status === "envoye" ? "success" : "danger"}>
                      {t.statuses[row.status]}
                    </SheetChip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
