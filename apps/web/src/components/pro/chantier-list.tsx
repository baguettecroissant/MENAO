import { CHANTIER_STEPS, chantierStepIndex, type ChantierStatus } from "@menao/core";
import { CalendarDays, ChevronRight, Clock, HardHat } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatTime } from "@/lib/format";
import { ExampleBadge } from "./examples";
import { SheetChip } from "./sheet";

const t = fr.pro.chantiers;
const l = fr.pro.worklists;

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

export const chantierTone = (status: ChantierStatus): Tone =>
  status === "annule" || status === "devis_refuse" || status === "cloture"
    ? "neutral"
    : status === "devis_signe"
      ? "warning"
      : status === "rdv_planifie" ||
          status === "demande_envoyee" ||
          status === "devis_envoye" ||
          status === "devis_en_revision"
        ? "primary"
        : status === "en_litige"
          ? "danger"
          : "success";

const ICON: Record<Tone, string> = {
  neutral: "bg-border/70 text-label",
  primary: "bg-primary-soft text-primary-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Chantier de la liste (ligne de artisan_chantiers). */
export type ChantierListItem = {
  chantier_id: string;
  status: ChantierStatus;
  title: string;
  code_postal: string | null;
  ville_nom: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  appointment_at: string | null;
  start_at: string | null;
};

/** Prochaine étape d'un chantier : la date du rendez-vous ou du démarrage, sinon ce qui est attendu. */
function nextStep(r: ChantierListItem): { text: string; dated: boolean } {
  if (r.status === "rdv_planifie" && r.appointment_at)
    return {
      text: t.appointmentOn(formatDayInline(r.appointment_at), formatTime(r.appointment_at)),
      dated: true,
    };
  if (r.status === "planifie" && r.start_at)
    return { text: t.startOn(formatDayInline(r.start_at), formatTime(r.start_at)), dated: true };
  return { text: l.next[r.status], dated: false };
}

/** Avancement en cinq segments (signature → réception), comme la frise de la fiche (ADR 0246). */
function Progress({ status }: { status: ChantierStatus }) {
  const step = chantierStepIndex(status);
  if (step === null) return <span />;
  const total = CHANTIER_STEPS.length;
  const label = step >= total ? l.stepsDone : l.stepOf(l.steps[step] ?? "", step + 1, total);
  return (
    <span className="flex flex-col gap-1.5 [grid-area:prog]">
      <span aria-hidden="true" className="flex gap-[3px]">
        {CHANTIER_STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 w-5 rounded-pill @3xl:w-6 ${
              i < step ? "bg-success" : i === step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </span>
      <span className="text-[0.8125rem] font-semibold text-label">
        <span className="sr-only">{l.progressLabel}</span>
        {label}
      </span>
    </span>
  );
}

const grid =
  "grid grid-cols-[minmax(0,1fr)_auto_auto] [grid-template-areas:'main_main_chev'_'next_next_next'_'prog_stat_stat'] @3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_10.5rem_11rem_1.25rem] @3xl:[grid-template-areas:'main_next_prog_stat_chev'] gap-x-5";

/**
 * Chantiers de l'artisan (F-18), refonte « Nette » (ADR 0248) : une ligne par chantier dans un
 * seul cadre — prochaine étape, avancement en cinq segments, état en pastille. En tableau quand
 * la liste est large (requête de conteneur), en cartes sinon (téléphone, accueil). Exemples
 * (ADR 0184) : pastille « Exemple », liens vers les pages d'exemples (`base`).
 */
export function ChantierList({
  rows,
  label,
  base = "/pro",
  example = false,
}: {
  rows: readonly ChantierListItem[];
  label?: string;
  base?: string;
  example?: boolean;
}) {
  return (
    <div className="@container overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div
        aria-hidden="true"
        className={`${grid} hidden border-b border-border bg-background px-5 py-3 text-[0.8125rem] font-semibold text-muted-foreground @3xl:grid`}
      >
        <span className="[grid-area:main]">{l.columns.chantier}</span>
        <span className="[grid-area:next]">{l.columns.next}</span>
        <span className="[grid-area:prog]">{l.columns.progress}</span>
        <span className="[grid-area:stat]">{l.columns.status}</span>
      </div>
      <ul aria-label={label} className="divide-y divide-border">
        {rows.map((r) => {
          const client = [r.client_first_name, r.client_last_name].filter(Boolean).join(" ");
          const next = nextStep(r);
          const tone = chantierTone(r.status);
          const NextIcon = next.dated ? CalendarDays : Clock;
          return (
            <li key={r.chantier_id}>
              <Link
                href={`${base}/chantiers/${r.chantier_id}` as Route}
                className={`${grid} items-center gap-y-3 px-4 py-4 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none @3xl:px-5`}
              >
                <span className="flex min-w-0 items-center gap-3.5 [grid-area:main]">
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${ICON[tone]}`}
                  >
                    <HardHat aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-base leading-snug font-semibold @3xl:truncate">
                        {r.title}
                      </span>
                      {example && <ExampleBadge />}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {[[r.code_postal, r.ville_nom].filter(Boolean).join(" "), client]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold text-label [grid-area:next]">
                  <NextIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  {next.text}
                </span>
                <Progress status={r.status} />
                <span className="self-end justify-self-end [grid-area:stat] @3xl:self-center @3xl:justify-self-start">
                  <SheetChip tone={tone} dot>
                    {t.status[r.status]}
                  </SheetChip>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground [grid-area:chev]"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
