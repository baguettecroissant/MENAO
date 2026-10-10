import { timeLeft } from "@menao/core";
import type { Database } from "@menao/db";
import { CalendarDays, CalendarPlus, Mail, MapPin, Phone, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatTime } from "@/lib/format";
import type { createClient } from "@/lib/supabase/server";

const t = fr.myRequests;
type Client = Awaited<ReturnType<typeof createClient>>;
type Row = Database["public"]["Functions"]["particulier_requests"]["Returns"];

const tone = {
  envoyee: "primary",
  acceptee: "success",
  refusee: "danger",
  expiree: "neutral",
  annulee: "neutral",
} as const;

/** Projets et demandes du particulier (maquette « Mes chantiers ») : coordonnées après acceptation. */
export async function MyRequests({ supabase }: { supabase: Client }) {
  const { data } = await supabase.rpc("particulier_requests");
  const rows = data ?? [];
  const projectIds = [...new Set(rows.map((r) => r.project_id))];
  const { data: photoRows } = projectIds.length
    ? await supabase
        .from("project_photos")
        .select("project_id, storage_path")
        .in("project_id", projectIds)
        .order("sort_order")
    : { data: [] };
  const firstPhoto = new Map<string, string>();
  for (const p of photoRows ?? [])
    if (!firstPhoto.has(p.project_id)) firstPhoto.set(p.project_id, p.storage_path);
  const paths = [...firstPhoto.values()];
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const photoUrl = (projectId: string) => {
    const path = firstPhoto.get(projectId);
    return signed?.find((s) => s.path === path)?.signedUrl ?? null;
  };
  const now = new Date();
  const active = rows.filter((r) => r.status === "envoyee" || r.status === "acceptee");

  if (projectIds.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
        <p className="text-lg font-medium">{t.empty}</p>
        <p className="max-w-md text-sm text-muted-foreground">{t.emptyHint}</p>
      </section>
    );
  }

  return (
    <section aria-label={t.title} className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-2">
        <li>
          <StatusBadge tone="primary">{t.countActive(active.length)}</StatusBadge>
        </li>
        {rows.some((r) => r.status === "acceptee") && (
          <li>
            <StatusBadge>
              {t.countAccepted(rows.filter((r) => r.status === "acceptee").length)}
            </StatusBadge>
          </li>
        )}
      </ul>
      <h2 className="text-lg font-medium">{t.inProgress}</h2>
      {projectIds.map((projectId) => {
        const items = rows.filter((r) => r.project_id === projectId);
        const head = items[0];
        if (!head) return null;
        return (
          <ProjectCard
            key={projectId}
            items={items}
            head={head}
            photo={photoUrl(projectId)}
            supabase={supabase}
            now={now}
          />
        );
      })}
    </section>
  );
}

function ProjectCard({
  items,
  head,
  photo,
  supabase,
  now,
}: {
  items: Row;
  head: Row[number];
  photo: string | null;
  supabase: Client;
  now: Date;
}) {
  const canChoose = items.some(
    (r) => r.status === "refusee" || r.status === "expiree" || r.status === "annulee",
  );
  const lead = items.find((r) => r.status === "acceptee") ?? items[0];
  return (
    <article className="grid overflow-hidden rounded-card border border-border bg-surface shadow-card md:grid-cols-[14rem_1fr_17rem]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
        <img src={photo} alt="" className="h-44 w-full object-cover md:h-full" />
      ) : (
        <div className="relative h-32 bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] md:h-full">
          <Wrench
            aria-hidden="true"
            strokeWidth={1.25}
            className="absolute right-4 bottom-4 size-16 text-white/70"
          />
        </div>
      )}
      <div className="flex flex-col gap-3 p-5">
        {lead && <StatusBadge tone={tone[lead.status]}>{t.status[lead.status]}</StatusBadge>}
        <h3 className="text-lg font-medium">{head.trade_label}</h3>
        {head.ville_nom && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5" />
            {head.ville_nom}
          </p>
        )}
        {head.summary && <p className="text-sm text-muted-foreground">{head.summary}</p>}
        <div className="mt-auto flex flex-wrap gap-4 pt-1 text-sm">
          {canChoose && (
            <TextLink href={`/recherche/${head.project_id}/artisans` as Route}>
              {t.chooseAnother}
            </TextLink>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-border bg-background/60 p-5 md:border-t-0 md:border-l">
        <p className="text-xs text-muted-foreground">{t.yourArtisans}</p>
        <ul className="flex flex-col gap-3">
          {items.map((r) => {
            const left = r.status === "envoyee" ? timeLeft(new Date(r.expires_at), now) : null;
            return (
              <li
                key={r.request_id}
                className="flex flex-col gap-2 rounded-input border border-border bg-surface p-3"
              >
                <div className="flex items-center gap-3">
                  <ArtisanPhoto
                    url={
                      r.artisan_avatar_path
                        ? supabase.storage.from("avatars").getPublicUrl(r.artisan_avatar_path).data
                            .publicUrl
                        : null
                    }
                    name={r.artisan_name}
                    className="size-10 shrink-0 rounded-full"
                    initialsClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.artisan_name}</p>
                    <p
                      className={`text-xs ${r.status === "acceptee" ? "text-success" : r.status === "refusee" ? "text-danger" : "text-muted-foreground"}`}
                    >
                      {t.status[r.status]}
                    </p>
                  </div>
                </div>
                {left && (
                  <p className="text-xs text-muted-foreground">
                    {t.timeLeft(left.hours, left.minutes)}
                  </p>
                )}
                {r.status === "acceptee" && r.appointment_at && r.chantier_id && (
                  <div className="flex flex-col gap-1.5 rounded-input bg-primary-softer px-3 py-2 text-xs text-primary-strong">
                    <p className="inline-flex items-center gap-1.5 font-medium">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {t.appointment(
                        formatDayInline(r.appointment_at),
                        formatTime(r.appointment_at),
                      )}
                    </p>
                    <a
                      href={`/agenda/${r.chantier_id}`}
                      className="inline-flex items-center gap-1.5 self-start font-medium underline-offset-2 hover:underline"
                    >
                      <CalendarPlus aria-hidden="true" className="size-3.5" />
                      {t.addToCalendar}
                    </a>
                  </div>
                )}
                {r.status === "annulee" && r.chantier_status === "annule" && (
                  <p className="text-xs text-muted-foreground">{t.cancelledByArtisan}</p>
                )}
                {r.status === "acceptee" && (r.artisan_phone || r.artisan_email) && (
                  <div className="flex flex-col gap-1 text-xs">
                    {r.artisan_phone && (
                      <a
                        href={`tel:${r.artisan_phone}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline"
                      >
                        <Phone aria-hidden="true" className="size-3.5" />
                        {r.artisan_phone}
                      </a>
                    )}
                    {r.artisan_email && (
                      <a
                        href={`mailto:${r.artisan_email}`}
                        className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline"
                      >
                        <Mail aria-hidden="true" className="size-3.5" />
                        {r.artisan_email}
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          href={`/recherche/${head.project_id}/artisans` as Route}
          className="text-xs font-medium text-primary-strong hover:underline"
        >
          {t.seeArtisans}
        </Link>
      </div>
    </article>
  );
}
