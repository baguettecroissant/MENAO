import { timeLeft } from "@menao/core";
import { Clock, MapPin } from "lucide-react";
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
  return (
    <ul className="flex flex-col gap-3">
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
              className="flex gap-4 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {example && <ExampleBadge />}
                  <StatusBadge tone={statusTone[r.status]}>{t.status[r.status]}</StatusBadge>
                  {r.urgence && <StatusBadge tone="danger">{t.urgent}</StatusBadge>}
                </div>
                <p className="font-medium">
                  {[r.trade_label, r.summary].filter(Boolean).join(" — ")}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {[r.code_postal, r.ville_nom].filter(Boolean).join(" ")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Tag>{start}</Tag>
                  {left && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock aria-hidden="true" className="size-3.5" />
                      {t.timeLeft(left.hours, left.minutes)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.client_first_name ? `${r.client_first_name} · ` : ""}
                  {t.received(day.format(new Date(r.created_at)))}
                </p>
              </div>
              {r.thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                <img
                  src={r.thumbUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-lg object-cover sm:size-20"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
