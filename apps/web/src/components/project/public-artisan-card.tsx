import { availability, specialtiesPreview } from "@menao/core";
import { ArtisanAvatar, AvailabilityBadge } from "@/components/project/artisan-avatar";
import { fr } from "@/i18n/fr";

const t = fr.search.results;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export type PublicArtisan = {
  artisan_id: string;
  display_name: string;
  avatarUrl: string | null;
  experience_years: number | null;
  zone_mode: "rayon" | "communes" | null;
  zone_radius_km: number | null;
  zone_city: string | null;
  zone_communes: string[];
  available_from: string | null;
  specialties: { code: string; label: string }[];
};

/** Carte artisan des pages publiques (F-02) : jamais de coordonnées. */
export function PublicArtisanCard({
  artisan: a,
  tradeLabel,
  today,
}: {
  artisan: PublicArtisan;
  tradeLabel: string;
  today: string;
}) {
  const avail = availability({ paused: false, availableFrom: a.available_from }, today);
  const specs = specialtiesPreview(a.specialties, []);
  const zone =
    a.zone_mode === "rayon" && a.zone_radius_km
      ? t.zoneRadius(a.zone_radius_km, a.zone_city)
      : t.zoneCommunes(a.zone_communes);
  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ArtisanAvatar url={a.avatarUrl} name={a.display_name} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{a.display_name}</h3>
          <p className="text-muted-foreground">
            {tradeLabel}
            {a.experience_years !== null ? ` · ${t.experience(a.experience_years)}` : ""}
          </p>
        </div>
      </div>
      <AvailabilityBadge
        label={
          avail.kind === "from"
            ? t.availableFrom(dayFormat.format(new Date(`${avail.date}T00:00:00Z`)))
            : t.availableNow
        }
        tone={avail.kind === "immediate" ? "success" : "muted"}
      />
      <p className="text-sm">{zone}</p>
      {specs.shown.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {specs.shown.map((label) => (
            <li key={label} className="rounded-full bg-primary-soft px-3 py-1 text-sm text-primary">
              {label}
            </li>
          ))}
          {specs.more > 0 && (
            <li className="rounded-full bg-background px-3 py-1 text-sm text-muted-foreground">
              {t.more(specs.more)}
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
