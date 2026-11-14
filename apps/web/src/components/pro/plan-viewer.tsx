import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders.plan;

/** Plans déposés : lien signé (1 h) pour les afficher et les ouvrir. */
export type PlanFileLink = { name: string; kind: "pdf" | "jpg" | "png"; url: string | null };

export type PlanView = { file: number; page: number };

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
}: {
  files: PlanFileLink[];
  view: PlanView;
  onView: (view: PlanView) => void;
  hint: string;
  /** Complément du pied de la visionneuse (type de page reconnu). */
  note?: ReactNode;
}) {
  const file = files[view.file];
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
        {file?.kind === "pdf" && (
          <span className="ml-auto text-sm text-muted-foreground">{t.viewerPage(view.page)}</span>
        )}
      </div>
      <div className="bg-background">
        {!file?.url ? (
          <p className="p-6 text-sm text-muted-foreground">{t.viewerMissing}</p>
        ) : file.kind === "pdf" ? (
          <iframe
            key={`${view.file}-${view.page}`}
            src={`${file.url}#page=${view.page}`}
            title={t.viewerTitle(file.name)}
            className="h-[34rem] w-full border-0"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- lien signé du stockage privé.
          <img
            src={file.url}
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
