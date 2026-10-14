import { timeLeft } from "@menao/core";
import { Clock, MapPin } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";
import { EmptyState } from "@/components/empty-state";

const t = fr.pro.onboarding.requests;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
const dayShort = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: "UTC" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

const statusTone = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
} as const;

/** Demandes reçues (F-16, F-17), maquette « Dashboard – Dernières demandes de devis ». */
export default async function ArtisanRequestsPage() {
  const { supabase } = await requireProSpace();
  const { data } = await supabase.rpc("artisan_inbox");
  const rows = data ?? [];
  const now = new Date();
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const photo = (path: string | null) =>
    path ? (signed?.find((s) => s.path === path)?.signedUrl ?? null) : null;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {rows.length === 0 && <EmptyState illustration="demandes">{t.empty}</EmptyState>}
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
            const thumb = photo(r.photo_path);
            const start =
              r.date_mode === "date" && r.date_souhaitee
                ? t.startWish(dayShort.format(new Date(`${r.date_souhaitee}T00:00:00Z`)))
                : r.date_mode === "des_que_possible"
                  ? t.startAsap
                  : t.startUnknown;
            return (
              <li key={r.request_id}>
                <Link
                  href={`/pro/demandes/${r.request_id}` as Route}
                  className="flex gap-4 rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:p-5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                    <img
                      src={thumb}
                      alt=""
                      className="size-16 shrink-0 rounded-lg object-cover sm:size-20"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
