import { Briefcase, MapPin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.request;

export type SelectedArtisan = {
  id: string;
  name: string;
  photoUrl: string | null;
  trade?: string | null;
  zone?: string | null;
  availableNow?: boolean;
};

/** « Artisan sélectionné » (maquettes) : colonne de gauche de la demande et de sa confirmation. */
export function SelectedArtisansCard({
  artisans,
  editHref,
}: {
  artisans: SelectedArtisan[];
  editHref?: string;
}) {
  const title = artisans.length > 1 ? t.selectedMany : t.selected;
  return (
    <section
      aria-label={title}
      className="rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[1.0625rem] font-medium">{title}</h2>
        {editHref && (
          <Link
            href={editHref as Route}
            className="text-xs text-foreground hover:text-primary-strong"
          >
            {t.changeSelection}
          </Link>
        )}
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {artisans.map((a) => (
          <li key={a.id} className="flex gap-3">
            <ArtisanPhoto
              url={a.photoUrl}
              name={a.name}
              className="size-16 shrink-0 rounded-lg"
              initialsClassName="text-lg"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-medium">{a.name}</p>
              {a.trade && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Briefcase aria-hidden="true" className="size-3.5 shrink-0" />
                  {a.trade}
                </p>
              )}
              {a.zone && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  {a.zone}
                </p>
              )}
              {a.availableNow && (
                <div>
                  <StatusBadge>{fr.search.results.availableNow}</StatusBadge>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
