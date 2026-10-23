import { Briefcase, Check, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { StatusBadge, Tag, VerifiedBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.results;

/**
 * Carte artisan des résultats (maquettes « Cartes alignées ») : photo, prénom, métier et
 * expérience, zone, Score MENAO (ADR 0155), badge « Assuré et vérifié », disponibilité,
 * spécialités, puis sélection pour la demande (F-11).
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
  known = false,
  preselected = known,
  outsideZone = false,
  verified = false,
  score = null,
  lotId,
  recommendedBy,
  headingLevel = 2,
  className = "",
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
  /** Artisan d'un chantier précédent (« Redemander un devis ») : mention « Déjà venu chez vous ». */
  known?: boolean;
  /** Coché d'office : artisan d'un chantier précédent ou de la fiche d'où part la recherche. */
  preselected?: boolean;
  /** Artisan de la zone élargie (ADR 0165). */
  outsideZone?: boolean;
  /** Badge « Assuré et vérifié » (ADR 0119). */
  verified?: boolean;
  /** Score MENAO sur 100 (ADR 0155). */
  score?: number | null;
  /** Artisan d'un autre métier du chantier, coché pour le même envoi (ADR 0170). */
  lotId?: string;
  /** Partenaire recommandé par un artisan du chantier (ADR 0174) : son nom, null s'il est inconnu. */
  recommendedBy?: string | null;
  headingLevel?: 2 | 3 | 4;
  /** Largeur dans le carrousel des résultats sur téléphone. */
  className?: string;
}) {
  const Heading = headingLevel === 4 ? "h4" : headingLevel === 3 ? "h3" : "h2";
  return (
    <li
      className={`group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:shadow-raised has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/30 ${className}`}
    >
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
        <div className="flex flex-wrap gap-1.5">
          {known && <StatusBadge tone="primary">{t.knownArtisan}</StatusBadge>}
          {recommendedBy !== undefined && (
            <StatusBadge tone="primary">
              {t.recommended.by(recommendedBy ?? t.recommended.someone)}
            </StatusBadge>
          )}
          {outsideZone && <StatusBadge tone="neutral">{t.wider.badge}</StatusBadge>}
          {score !== null && <StatusBadge tone="primary">{t.score(score)}</StatusBadge>}
          {verified && <VerifiedBadge>{t.verified}</VerifiedBadge>}
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
                name={lotId ? "lot" : "artisan"}
                value={lotId ? `${lotId}.${artisanId}` : artisanId}
                form="selection"
                defaultChecked={preselected}
                // Case invisible couvrant tout le bouton : cible tactile complète, toujours accessible.
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-button opacity-0 disabled:cursor-not-allowed"
              />
              <Check aria-hidden="true" className="hidden size-4 peer-checked:block" />
              <span className="peer-checked:hidden">
                {fr.search.selection.selectShort}
                <span className="sr-only"> {lotId ? `${name}, ${tradeLabel}` : name}</span>
              </span>
              <span className="hidden peer-checked:inline">
                {fr.search.selection.selected}
                <span className="sr-only"> {lotId ? `${name}, ${tradeLabel}` : name}</span>
              </span>
            </label>
          )}
        </div>
      </div>
    </li>
  );
}
