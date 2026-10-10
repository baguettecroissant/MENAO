import { Calendar, Camera, MapPin, User, Wrench } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import type { ProjectSummary } from "@/lib/project/summary";

const t = fr.search.summary;

/** « Résumé de mon besoin » (maquettes) : colonne de gauche des résultats et de la demande. */
export function ProjectSummaryCard({
  summary,
  editable = true,
}: {
  summary: ProjectSummary;
  editable?: boolean;
}) {
  return (
    <section
      aria-label={t.title}
      className="rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[1.0625rem] font-medium">{t.title}</h2>
        {editable && (
          <Link
            href={`/recherche/${summary.id}` as Route}
            className="text-xs text-foreground hover:text-primary-strong"
          >
            {t.edit}
          </Link>
        )}
      </div>
      <dl className="mt-4 flex flex-col gap-4">
        <Row icon={<User />} label={t.trade} value={summary.trade ?? fr.search.review.notSet} />
        {summary.site && <Row icon={<Wrench />} label={t.site} value={summary.site} />}
        {summary.address && <Row icon={<MapPin />} label={t.address} value={summary.address} />}
        <Row icon={<Calendar />} label={t.date} value={summary.date} />
        {summary.photos.length > 0 && (
          <Row
            icon={<Camera />}
            label={t.photos}
            value={
              <span className="mt-1 flex gap-1.5">
                {summary.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire
                  <img
                    key={url}
                    src={url}
                    alt={fr.search.review.photos.alt(i + 1)}
                    className="size-10 rounded-md object-cover"
                  />
                ))}
              </span>
            }
          />
        )}
      </dl>
    </section>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-primary [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm">{value}</dd>
      </div>
    </div>
  );
}
