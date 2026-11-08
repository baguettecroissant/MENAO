import { timeLeft } from "@menao/core";
import { ChevronRight, Clock, Inbox, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { ExampleBadge } from "./examples";
import { SheetChip } from "./sheet";

const t = fr.pro.onboarding.requests;
const l = fr.pro.worklists;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const dayShort = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });
const dayBrief = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
});

const statusTone = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "neutral",
  expiree: "neutral",
  annulee: "neutral",
  a_verifier: "neutral",
} as const;

/** Délai de réponse d'une demande (72 h) : la barre du temps restant se mesure sur ce total. */
const ANSWER_HOURS = 72;

/** Demande de la liste (ligne de artisan_inbox), avec la vignette déjà signée. */
export type InboxItem = {
  request_id: string;
  status: keyof typeof statusTone;
  urgence: boolean;
  trade_label: string | null;
  summary: string | null;
  code_postal: string | null;
  ville_nom: string | null;
  date_mode: string;
  date_souhaitee: string | null;
  expires_at: string;
  created_at: string;
  client_first_name: string | null;
  thumbUrl: string | null;
};

const rowLink =
  "grid items-start gap-x-3.5 gap-y-2.5 px-4 py-4 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:items-center sm:px-5";

/**
 * Demandes reçues (F-16, F-17), refonte « Nette » (ADR 0248) : une ligne par demande dans un seul
 * cadre. `open` : demandes à traiter, avec le temps restant pour répondre (à droite en grand
 * écran, en bas de la ligne sur téléphone) ; `done` : lignes courtes, état en pastille.
 * Exemples (ADR 0184) : pastille « Exemple », liens vers les pages d'exemples (`base`).
 */
export function InboxList({
  rows,
  now,
  variant = "open",
  label,
  base = "/pro",
  example = false,
}: {
  rows: readonly InboxItem[];
  now: Date;
  variant?: "open" | "done";
  label?: string;
  base?: string;
  example?: boolean;
}) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card"
    >
      {rows.map((r) => (
        <li key={r.request_id}>
          {variant === "open" ? (
            <OpenRow r={r} now={now} base={base} example={example} />
          ) : (
            <DoneRow r={r} base={base} example={example} />
          )}
        </li>
      ))}
    </ul>
  );
}

function OpenRow({
  r,
  now,
  base,
  example,
}: {
  r: InboxItem;
  now: Date;
  base: string;
  example: boolean;
}) {
  const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
  const pressing = r.urgence || (left !== null && left.hours < 24);
  const start =
    r.date_mode === "date" && r.date_souhaitee
      ? t.startWish(dayShort.format(new Date(`${r.date_souhaitee}T00:00:00Z`)))
      : r.date_mode === "des_que_possible"
        ? t.startAsap
        : t.startUnknown;
  return (
    <Link
      href={`${base}/demandes/${r.request_id}` as Route}
      className={`${rowLink} grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]`}
    >
      {r.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
        <img src={r.thumbUrl} alt="" className="size-14 rounded-xl object-cover sm:size-16" />
      ) : (
        <span
          className={`flex size-14 items-center justify-center rounded-xl sm:size-16 ${
            r.urgence ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-strong"
          }`}
        >
          <Inbox aria-hidden="true" className="size-6" />
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          {example && <ExampleBadge />}
          {r.trade_label && <SheetChip>{r.trade_label}</SheetChip>}
          {r.urgence && (
            <SheetChip tone="danger" dot>
              {t.urgent}
            </SheetChip>
          )}
        </span>
        <span className="text-base leading-snug font-semibold sm:text-[1.0625rem]">
          {r.summary || r.trade_label}
        </span>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          {[r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
          <span aria-hidden="true">·</span>
          <span>
            {r.client_first_name ? `${r.client_first_name} · ` : ""}
            {fr.pro.sheet.received(day.format(new Date(r.created_at)))}
          </span>
        </span>
        <span className="text-[0.8125rem] font-semibold text-label">{start}</span>
      </span>
      {left ? (
        <span className="flex items-center gap-2.5 max-sm:col-start-2 sm:flex-col sm:items-end sm:gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 font-display text-lg leading-none font-bold tracking-[-0.02em] tabular-nums sm:text-2xl ${
              pressing ? "text-danger" : ""
            }`}
          >
            <Clock aria-hidden="true" className="size-4" />
            {fr.pro.sheet.hoursLeft(left.hours)}
          </span>
          <span
            role="meter"
            aria-label={t.timeLeft(left.hours, left.minutes)}
            aria-valuemin={0}
            aria-valuemax={ANSWER_HOURS * 60}
            aria-valuenow={left.hours * 60 + left.minutes}
            className="h-1.5 flex-1 overflow-hidden rounded-pill bg-background sm:w-24 sm:flex-none"
          >
            <span
              className={`block h-full rounded-pill ${pressing ? "bg-danger" : "bg-primary"}`}
              style={{
                width: `${Math.round(
                  Math.min(1, (left.hours + left.minutes / 60) / ANSWER_HOURS) * 100,
                )}%`,
              }}
            />
          </span>
          <span className="text-xs text-muted-foreground">{l.leftShort}</span>
        </span>
      ) : (
        <span className="max-sm:col-start-2">
          <SheetChip tone={statusTone[r.status]} dot>
            {t.status[r.status]}
          </SheetChip>
        </span>
      )}
      <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground max-sm:hidden" />
    </Link>
  );
}

function DoneRow({ r, base, example }: { r: InboxItem; base: string; example: boolean }) {
  return (
    <Link
      href={`${base}/demandes/${r.request_id}` as Route}
      className={`${rowLink} grid-cols-[auto_minmax(0,1fr)_auto] py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]`}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-border/70 text-label">
        <Inbox aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-base font-semibold sm:truncate">{r.summary || r.trade_label}</span>
          {example && <ExampleBadge />}
        </span>
        <span className="text-sm text-muted-foreground">
          {[
            r.trade_label,
            [r.code_postal, r.ville_nom].filter(Boolean).join(" "),
            r.client_first_name,
            dayBrief.format(new Date(r.created_at)),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="max-sm:col-start-2 max-sm:row-start-2">
        <SheetChip tone={statusTone[r.status]}>{t.status[r.status]}</SheetChip>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 text-muted-foreground max-sm:col-start-3 max-sm:row-start-1 max-sm:self-center"
      />
    </Link>
  );
}
