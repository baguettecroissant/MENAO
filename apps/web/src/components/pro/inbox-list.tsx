import { timeLeft } from "@menao/core";
import { ChevronRight, Clock, Inbox, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ExampleBadge } from "./examples";

const t = fr.pro.onboarding.requests;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const dayShort = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

const statusTone = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
  a_verifier: "neutral",
} as const;

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

/**
 * Demandes reçues (F-16, F-17), maquette « Dashboard – Dernières demandes de devis ». Exemples
 * (ADR 0184) : pastille « Exemple », liens vers les pages d'exemples (`base`).
 */
export function InboxList({
  rows,
  now,
  base = "/pro",
  example = false,
}: {
  rows: readonly InboxItem[];
  now: Date;
  base?: string;
  example?: boolean;
}) {
  // Refonte « Nette » (ADR 0245) : une ligne par demande dans un seul cadre (ADR 0189), photo ou
  // icône à gauche, état et temps restant bien visibles.
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {rows.map((r) => {
        const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
        const start =
          r.date_mode === "date" && r.date_souhaitee
            ? t.startWish(dayShort.format(new Date(`${r.date_souhaitee}T00:00:00Z`)))
            : r.date_mode === "des_que_possible"
              ? t.startAsap
              : t.startUnknown;
        return (
          <li key={r.request_id}>
            <Link
              href={`${base}/demandes/${r.request_id}` as Route}
              className="flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
            >
              {r.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                <img src={r.thumbUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    r.urgence ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-strong"
                  }`}
                >
                  <Inbox aria-hidden="true" className="size-5" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  {example && <ExampleBadge />}
                  <StatusBadge tone={statusTone[r.status]}>{t.status[r.status]}</StatusBadge>
                  {r.urgence && <StatusBadge tone="danger">{t.urgent}</StatusBadge>}
                </span>
                <span className="text-base font-semibold">
                  {[r.trade_label, r.summary].filter(Boolean).join(" — ")}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                    {[r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
                  </span>
                  <span>
                    {r.client_first_name ? `${r.client_first_name} · ` : ""}
                    {t.received(day.format(new Date(r.created_at)))}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Tag>{start}</Tag>
                  {left && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {t.timeLeft(left.hours, left.minutes)}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="mt-3 size-5 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
