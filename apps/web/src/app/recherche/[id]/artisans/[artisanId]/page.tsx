import { availability, parisToday } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArtisanAvatar, AvailabilityBadge } from "@/components/project/artisan-avatar";
import { fr } from "@/i18n/fr";
import { getArtisanProfile, publicUrl } from "@/lib/project/artisans";
import { sendPagePath } from "@/lib/project/paths";
import { createClient } from "@/lib/supabase/server";
import { PhotoGallery } from "./photo-gallery";

const t = fr.search.profile;
const r = fr.search.results;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDay = (iso: string) => dayFormat.format(new Date(`${iso}T00:00:00Z`));

export const metadata: Metadata = { robots: { index: false } };

/** Fiche artisan dans le contexte d'une recherche (F-10). Jamais de téléphone ni d'e-mail. */
export default async function ArtisanProfilePage({
  params,
}: PageProps<"/recherche/[id]/artisans/[artisanId]">) {
  const { id, artisanId } = await params;
  if (!UUID.test(id) || !UUID.test(artisanId)) notFound();
  const supabase = await createClient();
  const [{ data: project }, profile] = await Promise.all([
    supabase.from("projects").select("id, trade_code").eq("id", id).maybeSingle(),
    getArtisanProfile(supabase, artisanId),
  ]);
  if (!project || !profile) notFound();

  const today = parisToday();
  const avail = availability(
    { paused: profile.paused, availableFrom: profile.available_from },
    today,
  );
  const trade =
    profile.trades.find((tr) => tr.code === project.trade_code)?.label ??
    profile.trades[0]?.label ??
    "";
  const zone =
    profile.zone.mode === "rayon" && profile.zone.radius_km
      ? r.zoneRadius(profile.zone.radius_km, profile.zone.city)
      : r.zoneCommunes(profile.zone.communes);
  const photos = profile.photos.map((p) => publicUrl(supabase, "portfolio", p));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <nav aria-label="Fil d'Ariane" className="text-sm">
        <ol className="flex flex-wrap gap-1 text-muted-foreground">
          <li>
            <Link href={`/recherche/${id}` as Route} className="text-primary hover:underline">
              {t.breadcrumb.criteria}
            </Link>{" "}
            ›
          </li>
          <li>
            <Link
              href={`/recherche/${id}/artisans` as Route}
              className="text-primary hover:underline"
            >
              {t.breadcrumb.selection}
            </Link>{" "}
            ›
          </li>
          <li aria-current="page">{profile.display_name}</li>
        </ol>
      </nav>

      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
        <ArtisanAvatar
          url={profile.avatar_path ? publicUrl(supabase, "avatars", profile.avatar_path) : null}
          name={profile.display_name}
          size="lg"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-muted-foreground">
            {trade}
            {profile.experience_years !== null
              ? ` · ${r.experience(profile.experience_years)}`
              : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AvailabilityBadge
              label={
                avail.kind === "paused"
                  ? r.paused
                  : avail.kind === "from"
                    ? r.availableFrom(formatDay(avail.date))
                    : r.availableNow
              }
              tone={avail.kind === "immediate" ? "success" : "muted"}
            />
            <span>{zone}</span>
          </div>
        </div>
        <Link
          href={sendPagePath(id, [profile.id]) as Route}
          className="inline-flex min-h-touch w-full items-center justify-center rounded-button bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto"
        >
          {t.request}
        </Link>
      </header>

      {profile.presentation && (
        <Section title={t.about}>
          <p className="whitespace-pre-line">{profile.presentation}</p>
          {profile.company_name && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t.company} : {profile.company_name}
            </p>
          )}
        </Section>
      )}

      {profile.work_types.length > 0 && (
        <Section title={t.expertise}>
          <ul className="flex flex-wrap gap-2">
            {profile.work_types.map((w) => (
              <li
                key={w.code}
                className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary"
              >
                {w.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={t.guarantees}>
        <ul className="flex flex-col gap-2">
          <li>
            ✓{" "}
            {profile.decennale?.valid_until
              ? t.decennale(formatDay(profile.decennale.valid_until), profile.decennale.insurer)
              : t.noDecennale}
          </li>
          {profile.certifications.map((c) => (
            <li key={`${c.type}-${c.numero}`}>
              ✓{" "}
              {t.certification(
                fr.certificationTypes[c.type as keyof typeof fr.certificationTypes] ?? c.type,
                c.numero,
                formatDay(c.valid_until),
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.score}>
        <p className="text-muted-foreground">{t.scoreEmpty}</p>
      </Section>

      <Section title={t.recent}>
        {photos.length ? (
          <PhotoGallery urls={photos} name={profile.display_name} />
        ) : (
          <p className="text-muted-foreground">{t.recentEmpty}</p>
        )}
      </Section>

      <Section title={t.reviews}>
        <p className="text-muted-foreground">{t.reviewsEmpty}</p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
