import { timeLeft } from "@menao/core";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanAvatar } from "@/components/project/artisan-avatar";
import { fr } from "@/i18n/fr";
import type { createClient } from "@/lib/supabase/server";

const t = fr.myRequests;
type Client = Awaited<ReturnType<typeof createClient>>;

const tone: Record<string, string> = {
  envoyee: "bg-primary-soft text-primary",
  acceptee: "bg-success-soft text-success",
  refusee: "bg-danger-soft text-danger",
  expiree: "bg-background text-muted-foreground",
  annulee: "bg-background text-muted-foreground",
};

/** Suivi des demandes du particulier (F-11, F-12) : coordonnées de l'artisan après acceptation. */
export async function MyRequests({ supabase }: { supabase: Client }) {
  const { data } = await supabase.rpc("particulier_requests");
  const rows = data ?? [];
  const now = new Date();
  const projects = [...new Set(rows.map((r) => r.project_id))];

  return (
    <section aria-label={t.title} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      {projects.length === 0 && (
        <p className="text-muted-foreground">
          {t.empty}{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            {t.newSearch}
          </Link>
        </p>
      )}
      {projects.map((projectId) => {
        const items = rows.filter((r) => r.project_id === projectId);
        const head = items[0];
        if (!head) return null;
        const canChoose = items.some((r) => r.status === "refusee" || r.status === "expiree");
        return (
          <article
            key={projectId}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <h3 className="font-semibold">
              {[head.trade_label, head.ville_nom].filter(Boolean).join(" · ")}
            </h3>
            {head.summary && <p className="text-sm text-muted-foreground">{head.summary}</p>}
            <ul className="flex flex-col gap-3">
              {items.map((r) => {
                const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
                return (
                  <li key={r.request_id} className="flex flex-wrap items-center gap-3">
                    <ArtisanAvatar
                      url={
                        r.artisan_avatar_path
                          ? supabase.storage.from("avatars").getPublicUrl(r.artisan_avatar_path)
                              .data.publicUrl
                          : null
                      }
                      name={r.artisan_name}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="font-medium">{r.artisan_name}</p>
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className={`rounded-full px-3 py-0.5 font-medium ${tone[r.status] ?? ""}`}
                        >
                          {t.status[r.status]}
                        </span>
                        {left && (
                          <span className="text-muted-foreground">
                            {t.timeLeft(left.hours, left.minutes)}
                          </span>
                        )}
                      </p>
                      {r.status === "acceptee" && (r.artisan_phone || r.artisan_email) && (
                        <p className="text-sm">
                          {t.contact} :{" "}
                          {r.artisan_phone && (
                            <a
                              href={`tel:${r.artisan_phone}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {r.artisan_phone}
                            </a>
                          )}
                          {r.artisan_phone && r.artisan_email ? " · " : ""}
                          {r.artisan_email && (
                            <a
                              href={`mailto:${r.artisan_email}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {r.artisan_email}
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {canChoose && (
              <Link
                href={`/recherche/${projectId}/artisans` as Route}
                className="self-start font-medium text-primary hover:underline"
              >
                {t.chooseAnother}
              </Link>
            )}
          </article>
        );
      })}
    </section>
  );
}
