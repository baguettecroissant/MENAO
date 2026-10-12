import { MapPin } from "lucide-react";
import type { Route } from "next";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { deleteDraftProject } from "@/lib/project/space-actions";

const t = fr.myChantiers.drafts;

export type DraftSearch = {
  id: string;
  status: string;
  summary: string | null;
  description: string;
  ville_nom: string | null;
  created_at: string;
  trades: { label: string } | null;
};

/** Titre lisible d'une recherche : résumé de l'analyse, sinon début de la description. */
function titleOf(draft: DraftSearch): string {
  const text = (draft.summary ?? draft.description).trim();
  if (!text) return t.untitled;
  return text.length > 90 ? `${text.slice(0, 88).trimEnd()}…` : text;
}

/**
 * Recherches commencées sans demande envoyée (F-12, ADR 0040) : reprise à la bonne étape
 * (critères à valider, ou choix des artisans), ou suppression avec les photos.
 */
export function DraftSearches({ drafts }: { drafts: readonly DraftSearch[] }) {
  return (
    <section aria-labelledby="recherches" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="recherches" className="text-lg font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {drafts.map((draft) => {
          const title = titleOf(draft);
          const href =
            draft.status === "criteres_valides"
              ? `/recherche/${draft.id}/artisans`
              : `/recherche/${draft.id}`;
          return (
            <li
              key={draft.id}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card"
            >
              <div className="flex flex-col gap-1">
                {draft.trades?.label && (
                  <p className="text-xs font-medium text-primary-strong">{draft.trades.label}</p>
                )}
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {draft.ville_nom && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3.5" />
                      {draft.ville_nom}
                    </span>
                  )}
                  <span>{t.started(formatDay(draft.created_at))}</span>
                </p>
              </div>
              <div className="mt-auto flex items-center gap-3">
                <ButtonLink href={href as Route} size="sm">
                  {t.resume}
                </ButtonLink>
                <form action={deleteDraftProject}>
                  <input type="hidden" name="projectId" value={draft.id} />
                  <button
                    type="submit"
                    aria-label={t.deleteLabel(title)}
                    className="min-h-touch text-sm font-medium text-danger underline-offset-2 hover:underline"
                  >
                    {t.delete}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
