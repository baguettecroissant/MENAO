import { timeLeft } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { requireArtisan } from "@/lib/artisan/requests";

const t = fr.pro.onboarding.requests;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/** Demandes reçues (F-16, F-17) : à traiter en premier, avec le temps restant (48 h). */
export default async function ArtisanRequestsPage() {
  const { supabase } = await requireArtisan();
  const { data } = await supabase.rpc("artisan_inbox");
  const rows = data ?? [];
  const now = new Date();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Link href="/pro/onboarding" className="font-medium text-primary hover:underline">
        ← {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      {rows.length === 0 && <p className="text-muted-foreground">{t.empty}</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
          return (
            <li key={r.request_id}>
              <Link
                href={`/pro/demandes/${r.request_id}` as Route}
                className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {[r.trade_label, r.ville_nom].filter(Boolean).join(" · ")}
                  </span>
                  {r.urgence && (
                    <span className="rounded-full bg-danger-soft px-3 py-0.5 text-sm font-medium text-danger">
                      {t.urgent}
                    </span>
                  )}
                  <span className="rounded-full bg-background px-3 py-0.5 text-sm">
                    {t.status[r.status]}
                  </span>
                </div>
                {r.summary && <p className="text-muted-foreground">{r.summary}</p>}
                <p className="text-sm text-muted-foreground">
                  {r.client_first_name ? `${r.client_first_name} · ` : ""}
                  {t.received(day.format(new Date(r.created_at)))}
                  {left ? ` · ${t.timeLeft(left.hours, left.minutes)}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
