import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders.plan;

/** Plans déposés : lien signé (1 h) pour les afficher et les ouvrir. */
export type PlanFileLink = {
  name: string;
  kind: "pdf" | "jpg" | "png";
  url: string | null;
  /** Pages d'un PDF rendues en images à l'envoi (ADR 0328) : affichées avec leurs contours. */
  pages?: { page: number; url: string | null }[];
};

export type PlanView = { file: number; page: number };

/** Contours à poser sur une image de plan (F-159, lot 2) : pixels de l'image d'origine. */
export type PlanOverlay = {
  width: number;
  height: number;
  shapes: { key: string; points: string; tone: "measured" | "estimated"; selected: boolean }[];
  anchors: { x1: number; y1: number; x2: number; y2: number }[];
};

/**
 * Les plans déposés, un onglet par fichier (lien signé), ouverts à la page demandée : visionneuse
 * du relevé des pièces (lot 35) et du relevé des ouvrages (lot 52).
 */
export function PlanViewer({
  files,
  view,
  onView,
  hint,
  note,
  overlay,
}: {
  files: PlanFileLink[];
  view: PlanView;
  onView: (view: PlanView) => void;
  hint: string;
  /** Complément du pied de la visionneuse (type de page reconnu). */
  note?: ReactNode;
  /** Contours tracés sur l'image affichée (photo seulement). */
  overlay?: PlanOverlay | null;
}) {
  const file = files[view.file];
  // PDF dont les pages ont été rendues en images : la page s'affiche comme une photo.
  const rendered = file?.kind === "pdf" ? (file.pages ?? []).filter((p) => p.url) : [];
  const pageImage = rendered.find((p) => p.page === view.page) ?? null;
  const image = file?.kind === "pdf" ? (pageImage?.url ?? null) : (file?.url ?? null);
  return (
    <section
      aria-label={t.viewerLabel}
      className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-pill border border-border bg-surface p-1">
          {files.map((f, i) => (
            <button
              key={`${i}-${f.name}`}
              type="button"
              aria-pressed={view.file === i}
              onClick={() => onView({ file: i, page: 1 })}
              className="max-w-56 truncate rounded-pill px-3.5 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-background aria-pressed:bg-foreground aria-pressed:font-semibold aria-pressed:text-surface"
            >
              {f.name}
            </button>
          ))}
        </div>
        {file?.kind === "pdf" && rendered.length === 0 && (
          <span className="ml-auto text-sm text-muted-foreground">{t.viewerPage(view.page)}</span>
        )}
        {file?.kind === "pdf" && rendered.length > 0 && (
          <span className="ml-auto flex flex-wrap items-center gap-1 text-sm">
            {rendered.map((p) => (
              <button
                key={p.page}
                type="button"
                aria-pressed={p.page === view.page}
                aria-label={t.viewerPage(p.page)}
                onClick={() => onView({ file: view.file, page: p.page })}
                className="min-w-8 rounded-pill px-2 py-1 font-medium text-muted-foreground hover:bg-background aria-pressed:bg-foreground aria-pressed:font-semibold aria-pressed:text-surface"
              >
                {p.page}
              </button>
            ))}
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-semibold text-primary-strong"
              >
                {t.viewerOpenPdf}
              </a>
            )}
          </span>
        )}
      </div>
      <div className="bg-background">
        {!file?.url ? (
          <p className="p-6 text-sm text-muted-foreground">{t.viewerMissing}</p>
        ) : file.kind === "pdf" && !image ? (
          <iframe
            key={`${view.file}-${view.page}`}
            src={`${file.url}#page=${view.page}`}
            title={t.viewerTitle(file.name)}
            className="h-[34rem] w-full border-0"
          />
        ) : overlay ? (
          // Image et contours dans le même cadre, au format de l'image : les pixels coïncident.
          <div
            className="relative mx-auto w-full"
            style={{
              aspectRatio: `${overlay.width} / ${overlay.height}`,
              maxWidth: `calc(34rem * ${overlay.width / overlay.height})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- lien signé du stockage privé. */}
            <img
              src={image ?? file.url}
              alt={t.viewerTitle(file.name)}
              className="absolute inset-0 size-full"
            />
            <svg
              viewBox={`0 0 ${overlay.width} ${overlay.height}`}
              className="absolute inset-0 size-full"
              role="img"
              aria-label={t.measure.overlayLabel}
            >
              {overlay.shapes.map((shape) => (
                <polygon
                  key={shape.key}
                  points={shape.points}
                  vectorEffect="non-scaling-stroke"
                  className={
                    shape.tone === "estimated"
                      ? `stroke-warning ${shape.selected ? "fill-warning-soft/80" : "fill-warning-soft/50"}`
                      : `stroke-primary ${shape.selected ? "fill-primary-soft/80" : "fill-primary-soft/40"}`
                  }
                  strokeWidth={shape.selected ? 3 : 2}
                  strokeDasharray={shape.tone === "estimated" ? "7 4" : undefined}
                />
              ))}
              {overlay.anchors.map((k, i) => (
                <line
                  key={i}
                  x1={k.x1}
                  y1={k.y1}
                  x2={k.x2}
                  y2={k.y2}
                  vectorEffect="non-scaling-stroke"
                  className="stroke-success"
                  strokeWidth={3}
                />
              ))}
            </svg>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- lien signé du stockage privé.
          <img
            src={image ?? file.url}
            alt={t.viewerTitle(file.name)}
            className="max-h-[34rem] w-full object-contain"
          />
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
          {hint}
        </span>
        {note}
      </p>
    </section>
  );
}
