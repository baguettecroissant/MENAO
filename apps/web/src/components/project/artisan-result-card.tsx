import { Briefcase, Check, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.results;

/**
 * Carte artisan des résultats (maquettes « Cartes alignées ») : photo, prénom, métier et
 * expérience, zone, disponibilité, spécialités, puis sélection pour la demande (F-11).
 */
export function ArtisanResultCard({
  href = null,
  artisanId,
  name,
  photoUrl,
  tradeLabel,
  experienceYears,
  zone,
  distanceKm,
  availableFrom,
  specialties,
  moreSpecialties,
  selection,
  headingLevel = 2,
}: {
  /** Fiche de l'artisan ; sans lien sur les pages publiques. */
  href?: string | null;
  artisanId: string;
  name: string;
  photoUrl: string | null;
  tradeLabel: string;
  experienceYears: number | null;
  zone: string;
  distanceKm: number | null;
  /** Date formatée si l'artisan n'est pas disponible tout de suite. */
  availableFrom: string | null;
  specialties: string[];
  moreSpecialties: number;
  selection: "selectable" | "sent" | "none";
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-raised has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30">
      <ArtisanPhoto url={photoUrl} name={name} className="aspect-[16/10] w-full" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <Heading className="text-lg font-medium">
            {href ? (
              <Link
                href={href as Route}
                aria-label={t.viewProfile(name)}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </Heading>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase aria-hidden="true" className="size-3.5 shrink-0" />
            {tradeLabel}
            {experienceYears !== null ? ` · ${t.experience(experienceYears)}` : ""}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {zone}
            {distanceKm !== null ? ` · ${t.distance(distanceKm)}` : ""}
          </p>
        </div>
        <div>
          {availableFrom ? (
            <StatusBadge tone="neutral">{t.availableFrom(availableFrom)}</StatusBadge>
          ) : (
            <StatusBadge>{t.availableNow}</StatusBadge>
          )}
        </div>
        {specialties.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <li key={s}>
                <Tag tone="neutral">{s}</Tag>
              </li>
            ))}
            {moreSpecialties > 0 && (
              <li>
                <Tag tone="neutral">{t.more(moreSpecialties)}</Tag>
              </li>
            )}
          </ul>
        )}
        <div className="relative z-10 mt-auto pt-1">
          {selection === "sent" && (
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <Check aria-hidden="true" className="size-4" />
              {fr.search.selection.alreadySent}
            </p>
          )}
          {selection === "selectable" && (
            <label className="relative inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-button border border-primary text-sm font-medium text-primary-strong transition-colors hover:bg-primary-softer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/25">
              <input
                type="checkbox"
                name="artisan"
                value={artisanId}
                form="selection"
                // Case invisible couvrant tout le bouton : cible tactile complète, toujours accessible.
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-button opacity-0 disabled:cursor-not-allowed"
              />
              <Check aria-hidden="true" className="hidden size-4 peer-checked:block" />
              <span className="peer-checked:hidden">
                {fr.search.selection.selectShort}
                <span className="sr-only"> {name}</span>
              </span>
              <span className="hidden peer-checked:inline">
                {fr.search.selection.selected}
                <span className="sr-only"> {name}</span>
              </span>
            </label>
          )}
        </div>
      </div>
    </li>
  );
}
