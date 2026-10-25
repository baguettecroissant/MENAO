import {
  accountantPeriodRange,
  accountantRangeLabel,
  nextAccountantSendLabel,
  parisToday,
  type AccountantPeriod,
} from "@menao/core";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccountantSettingsForm } from "@/components/pro/accountant-settings";
import { Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { formatDay } from "@/lib/format";

const t = fr.pro.accountant;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Envoi au comptable (F-63) : réglages de l'envoi automatique, « Envoyer maintenant » et derniers
 * envois. L'adresse du comptable n'est lue que par l'artisan.
 */
export default async function AccountantPage() {
  const { supabase } = await requireProSpace();
  const [{ data: settings }, { data: exports }] = await Promise.all([
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
  ]);
  const today = parisToday();
  const period: AccountantPeriod = settings?.period ?? "mensuel";

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/pro/factures"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary-strong hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {fr.pro.invoices.title}
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
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
          nextSend={settings?.enabled ? nextAccountantSendLabel(period, today) : null}
        />
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.historyTitle}</h2>
          {(exports ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {(exports ?? []).map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium">
                      {accountantRangeLabel(row.period_start, row.period_end)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {t.historyLine(formatDay(row.created_at), row.recipient)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[t.kinds[row.kind], t.counts(row.invoices_count, row.expenses_count)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <StatusBadge tone={row.status === "envoye" ? "success" : "danger"}>
                    {t.statuses[row.status]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
