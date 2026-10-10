import type { JournalSummary } from "@menao/core";
import { ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { formatTimeAgo } from "@/lib/format";
import { JournalMessages, PhotoMosaic } from "./journal-client";

const t = fr.chantier.journal;

/**
 * « Suivi du chantier » (maquettes F-12 et F-22) : dernière mise à jour, mosaïque des photos,
 * messages de l'artisan, et les boutons d'ajout côté artisan.
 */
export function JournalCard({
  summary,
  photoUrls,
  author,
  intro,
  emptyText,
  photoAction,
  messageAction,
  now,
}: {
  summary: JournalSummary;
  /** URL signées des photos, par chemin dans le bucket chantier-photos. */
  photoUrls: ReadonlyMap<string, string>;
  /** Auteur affiché des messages : « Vous » pour l'artisan, son prénom pour le client. */
  author: string;
  intro?: string;
  /** Texte de l'encadré vide (côté client) ; aucun encadré s'il est absent. */
  emptyText?: string;
  photoAction?: ReactNode;
  messageAction?: ReactNode;
  now: Date;
}) {
  const photos = summary.photos.flatMap((path) => {
    const url = photoUrls.get(path);
    return url ? [url] : [];
  });
  const messages = summary.messages.map((m) => ({
    id: m.id,
    message: m.message,
    ago: formatTimeAgo(m.createdAt, now),
  }));
  return (
    <section
      aria-labelledby="journal-title"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2 id="journal-title" className="text-[1.0625rem] font-medium">
          {t.title}
        </h2>
        {summary.lastUpdateAt && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {t.lastUpdate(formatTimeAgo(summary.lastUpdateAt, now))}
          </p>
        )}
      </div>
      {intro && <p className="text-sm text-muted-foreground">{intro}</p>}
      {photos.length > 0 && <PhotoMosaic urls={photos} />}
      {photoAction}
      {messages.length > 0 && <JournalMessages author={author} messages={messages} />}
      {emptyText && photos.length === 0 && messages.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-background px-6 py-10 text-center">
          <ImageIcon
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-8 text-subtle-foreground"
          />
          <p className="max-w-xs text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}
      {messageAction}
    </section>
  );
}
