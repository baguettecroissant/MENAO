import type { JournalEntry } from "@menao/core";
import { Camera } from "lucide-react";
import { fr } from "@/i18n/fr";
import { formatDayInline, formatTime } from "@/lib/format";
import { JournalComposer } from "./chantier-journal-forms";
import { DetailBlock } from "./detail";

const t = fr.pro.followUp;

/**
 * Journal du chantier (F-22) : messages et photos de l'artisan, du plus récent au plus ancien.
 * Formulaires d'ajout tant que le journal est ouvert.
 */
export function ChantierJournal({
  chantierId,
  entries,
  photoUrls,
  open,
}: {
  chantierId: string;
  entries: JournalEntry[];
  /** URL signées des photos, par chemin dans le bucket chantier-photos. */
  photoUrls: ReadonlyMap<string, string>;
  open: boolean;
}) {
  return (
    <DetailBlock icon={<Camera />} title={t.journal}>
      {open && (
        <>
          <p className="text-sm text-muted-foreground">{t.journalHint}</p>
          <JournalComposer chantierId={chantierId} />
        </>
      )}
      <JournalList entries={entries} photoUrls={photoUrls} />
    </DetailBlock>
  );
}

export function JournalList({
  entries,
  photoUrls,
}: {
  entries: JournalEntry[];
  photoUrls: ReadonlyMap<string, string>;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.journalEmpty}</p>;
  }
  return (
    <ol className="flex flex-col gap-4 border-t border-border pt-4">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col gap-2 border-l-2 border-primary-soft pl-4">
          <p className="text-xs text-muted-foreground">
            <time dateTime={e.createdAt}>
              {t.postedAt(formatDayInline(e.createdAt), formatTime(e.createdAt))}
            </time>
            {e.kind === "photos" && ` · ${t.photoCount(e.paths.length)}`}
          </p>
          {e.kind === "message" ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{e.message}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {e.paths.map((path, i) => {
                const url = photoUrls.get(path);
                return url ? (
                  <li key={path}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire */}
                      <img
                        src={url}
                        alt={t.photoAlt(i + 1, e.paths.length)}
                        loading="lazy"
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </a>
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
