import { secretaryFigures, type VoiceGauge } from "@menao/core";
import {
  CalendarCheck,
  CalendarDays,
  MessageSquareText,
  Phone,
  SlidersHorizontal,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ListFilters, ListPanel } from "@/components/list-kit";
import { MoneyFigures } from "@/components/pro/money-figures";
import type { SecretaryMessage } from "@/components/pro/secretary-message";
import {
  SecretaryMessageToggle,
  SecretarySettingsForm,
  SecretaryTestCall,
} from "@/components/pro/secretary-forms";
import { SheetChip, SheetRow, sheetCard } from "@/components/pro/sheet";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayTimeInline, formatPhone } from "@/lib/format";

const t = fr.pro.secretaryPage;
const ts = fr.pro.onboarding.plans.secretary;
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

export type SecretaryViewName = "a-traiter" | "traites" | "reglages";

/**
 * Rubrique « Secrétaire » (ADR 0244), refonte « Nette » (ADR 0249) : chiffres clés, appels à
 * traiter ou traités (ou réglages), et à droite en grand écran la carte de la secrétaire (état,
 * minutes, réglages en bref, essai).
 */
export function SecretaryView({
  view,
  name,
  company,
  gauge,
  topUps,
  settings,
  hours,
  todo,
  done,
  month,
}: {
  view: SecretaryViewName;
  name: string;
  company: string;
  gauge: VoiceGauge;
  /** Lien « Recharger » (patron, recharges incluses). */
  topUps: boolean;
  settings: {
    display_name: string | null;
    can_book: boolean;
    visit_minutes: number;
    instructions: string | null;
  } | null;
  hours: boolean;
  todo: SecretaryMessage[];
  done: SecretaryMessage[];
  /** Appels du mois (kind, created_at). */
  month: { kind: string; created_at: string }[];
}) {
  const toHandle = todo;
  const handled = done;
  const now = new Date();
  const figures = secretaryFigures(toHandle, month, now);
  const totalMinutes = gauge.includedMinutes + gauge.topUpMinutes;
  const rows = view === "traites" ? handled : toHandle;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.lead(name)}</p>
        </div>
        <MoneyFigures
          label={t.figuresLabel}
          dense
          cells={[
            {
              label: t.toHandle,
              short: t.toHandleShort,
              value: String(figures.toHandle),
              hint: t.toHandleHint(figures.urgent),
            },
            {
              label: t.monthAppointments,
              short: t.monthAppointmentsShort,
              value: String(figures.monthAppointments),
              hint: t.monthAppointmentsHint,
            },
            {
              label: t.monthCalls,
              value: String(figures.monthCalls),
              hint:
                gauge.level === "epuise"
                  ? t.noMinutes
                  : totalMinutes
                    ? t.minutesLeftOf(gauge.remainingMinutes, totalMinutes)
                    : t.monthCallsHint,
              desktopOnly: true,
            },
            {
              label: t.minutesShort,
              short: t.minutesShort,
              value: String(gauge.remainingMinutes),
              tone: gauge.level === "epuise" ? "danger" : undefined,
              phoneOnly: true,
            },
          ]}
        />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <ListFilters
              label={t.filters}
              items={[
                {
                  href: "/pro/secretaire",
                  label: t.todo,
                  detail: toHandle.length > 0 ? String(toHandle.length) : undefined,
                  tone: toHandle.some((m) => m.urgent) ? "danger" : "primary",
                  active: view === "a-traiter",
                },
                {
                  href: "/pro/secretaire?vue=traites",
                  label: t.history,
                  active: view === "traites",
                },
                {
                  href: "/pro/secretaire?vue=reglages",
                  label: t.settings,
                  active: view === "reglages",
                },
              ]}
            />
            {view === "reglages" ? (
              <div className="flex flex-col gap-5">
                <section className={sheetCard}>
                  <h2 className="text-lg">{t.tryTitle}</h2>
                  <p className="text-sm text-muted-foreground">{ts.testText}</p>
                  <SecretaryTestCall />
                </section>
                <section className={sheetCard}>
                  <h2 className="text-lg">{ts.settingsTitle}</h2>
                  {!hours && <p className="text-sm text-warning">{ts.noHours}</p>}
                  <SecretarySettingsForm
                    displayName={settings?.display_name ?? null}
                    fallbackName={company}
                    canBook={settings?.can_book ?? true}
                    visitMinutes={settings?.visit_minutes ?? 60}
                    instructions={settings?.instructions ?? null}
                  />
                </section>
              </div>
            ) : rows.length === 0 ? (
              <>
                <EmptyState illustration="messages">
                  {view === "traites" ? t.historyEmpty : t.todoEmpty}
                </EmptyState>
                {view === "a-traiter" && <SecretaryTestCall />}
              </>
            ) : (
              <ListPanel label={view === "traites" ? t.history : t.todo}>
                {rows.map((m) => (
                  <CallRow key={m.id} message={m} />
                ))}
              </ListPanel>
            )}
          </div>
          <aside className="flex flex-col gap-4 max-lg:hidden">
            <section className={sheetCard} aria-labelledby="secretaire-carte">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary-strong">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col">
                  <h2 id="secretaire-carte" className="truncate text-lg">
                    {name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold ${gauge.level === "epuise" ? "text-danger" : "text-success"}`}
                  >
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                    {gauge.level === "epuise" ? t.paused : t.answering}
                  </span>
                </div>
              </div>
              {totalMinutes > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-[0.8125rem]">
                    <span className="font-semibold text-label">{t.minutesLabel}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {t.minutesOf(gauge.remainingMinutes, totalMinutes)}
                    </span>
                  </div>
                  <span
                    role="meter"
                    aria-label={t.minutes(gauge.remainingMinutes)}
                    aria-valuemin={0}
                    aria-valuemax={totalMinutes}
                    aria-valuenow={gauge.remainingMinutes}
                    className="h-2 overflow-hidden rounded-pill bg-background"
                  >
                    <span
                      className={`block h-full rounded-pill ${gauge.level === "ok" ? "bg-primary" : gauge.level === "alerte" ? "bg-warning" : "bg-danger"}`}
                      style={{
                        width: `${Math.round(Math.min(1, gauge.remainingMinutes / totalMinutes) * 100)}%`,
                      }}
                    />
                  </span>
                  {topUps && (
                    <TextLink href="/pro/onboarding/formule" className="self-start text-sm">
                      {t.recharge}
                    </TextLink>
                  )}
                </div>
              )}
              <dl>
                <SheetRow label={t.booking}>
                  {(settings?.can_book ?? true)
                    ? t.bookingYes(
                        (ts.visitChoices[settings?.visit_minutes ?? 60] ?? "").replace(
                          /^1 heure$/,
                          "1 h",
                        ),
                      )
                    : t.bookingNo}
                </SheetRow>
                <SheetRow label={t.hoursRow}>
                  {hours ? (
                    t.hoursSet
                  ) : (
                    <TextLink href="/pro/agenda/disponibilites#horaires">{t.hoursMissing}</TextLink>
                  )}
                </SheetRow>
                <SheetRow label={t.instructionsRow}>
                  <span className="line-clamp-2">
                    {settings?.instructions?.trim() || t.noInstructions}
                  </span>
                </SheetRow>
              </dl>
              <SecretaryTestCall />
              <Link
                href="/pro/secretaire?vue=reglages"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                {t.settingsLink}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

/** Un appel : qui, pourquoi, quand, puis « Appeler », « Voir dans l'agenda » et « Traité ». */
function CallRow({ message: m }: { message: SecretaryMessage }) {
  const appointment = m.kind === "rendez_vous" && m.appointment_at ? m.appointment_at : null;
  const Icon = appointment ? CalendarCheck : MessageSquareText;
  return (
    <li
      className={`flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5 ${m.done_at ? "opacity-75" : ""}`}
    >
      <div className="flex gap-3.5">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${appointment ? "bg-success-soft text-success" : "bg-primary-soft text-primary-strong"}`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-base font-bold">{m.caller_name}</span>
            {m.city && <span className="text-sm text-muted-foreground">{m.city}</span>}
            {m.urgent && (
              <SheetChip tone="danger" dot>
                {ts.urgent}
              </SheetChip>
            )}
            <span className="text-[0.8125rem] text-muted-foreground max-sm:basis-full sm:ml-auto">
              {formatDayTimeInline(m.created_at)}
            </span>
          </div>
          <p className={`text-sm font-semibold ${appointment ? "text-success" : "text-label"}`}>
            {appointment ? t.rdvTaken(formatDayTimeInline(appointment)) : t.toCallBack}
          </p>
          <p className="text-[0.9375rem] leading-relaxed text-label">« {m.reason} »</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:pl-[3.625rem]">
        <a
          href={`tel:${m.caller_phone}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <Phone aria-hidden="true" className="size-4" />
          {ts.call} {formatPhone(m.caller_phone)}
        </a>
        {appointment && (
          <Link
            href={`/pro/agenda?semaine=${parisDay.format(new Date(appointment))}` as Route}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {t.seeAgenda}
          </Link>
        )}
        <SecretaryMessageToggle id={m.id} done={Boolean(m.done_at)} />
      </div>
    </li>
  );
}
