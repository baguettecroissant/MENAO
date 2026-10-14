import { Calendar, Camera, MapPin, Pencil, User, Wrench } from "lucide-react";
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

/**
 * Version téléphone (maquettes mobiles « in app » et « Envoyez votre demande ») : bande compacte
 * en haut de l'écran, métier, lieu, date et photos en icônes, crayon pour modifier.
 */
export function ProjectSummaryBand({
  summary,
  className = "",
}: {
  summary: ProjectSummary;
  className?: string;
}) {
  const items = [
    { icon: <Wrench />, text: summary.trade ?? fr.search.review.notSet },
    ...(summary.address ? [{ icon: <MapPin />, text: summary.address }] : []),
    { icon: <Calendar />, text: summary.date },
    ...(summary.photos.length
      ? [{ icon: <Camera />, text: t.photoCount(summary.photos.length) }]
      : []),
  ];
  return (
    <section
      aria-label={t.title}
      className={`flex items-start gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-card lg:hidden ${className}`}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium">{t.title}</h2>
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {items.map((item) => (
            <li
              key={item.text}
              className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground"
            >
              <span aria-hidden="true" className="text-primary [&>svg]:size-3.5">
                {item.icon}
              </span>
              <span className="truncate">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/recherche/${summary.id}` as Route}
        aria-label={t.editLabel}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-background hover:text-primary-strong"
      >
        <Pencil aria-hidden="true" className="size-4" />
      </Link>
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
