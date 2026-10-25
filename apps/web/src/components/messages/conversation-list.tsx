import type { Database } from "@menao/db";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { fr } from "@/i18n/fr";
import { formatDateNumeric, formatTime } from "@/lib/format";

const t = fr.messages;
type ConversationRow = Database["public"]["Functions"]["my_conversations"]["Returns"][number];
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

/** Liste « Messages » (F-40) : interlocuteur, chantier, dernier message, heure, non lus. */
export function ConversationList({
  rows,
  basePath,
  avatarUrls,
  now,
}: {
  rows: ConversationRow[];
  basePath: "/mon-espace/messages" | "/pro/messages" | "/pro/decouvrir/messages";
  avatarUrls: ReadonlyMap<string, string>;
  now: Date;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {rows.map((row) => {
        const preview = row.last_hidden
          ? t.hiddenPreview
          : row.last_kind === "photo"
            ? t.photo
            : row.last_kind === "fichier"
              ? t.file
              : row.last_body;
        const today = parisDay.format(new Date(row.last_at)) === parisDay.format(now);
        return (
          <li key={row.chantier_id}>
            <Link
              href={`${basePath}/${row.chantier_id}` as Route}
              className="flex items-center gap-3 px-4 py-4 hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
            >
              <ArtisanPhoto
                url={row.other_avatar_path ? (avatarUrls.get(row.other_avatar_path) ?? null) : null}
                name={row.other_name}
                className="size-11 shrink-0 rounded-full"
                initialsClassName="text-sm"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`truncate ${row.unread ? "font-semibold" : "font-medium"}`}>
                    {row.other_name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {today ? formatTime(row.last_at) : formatDateNumeric(row.last_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {row.title}
                  {row.closed && ` · ${t.closedTag}`}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={`truncate text-sm ${row.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    {row.last_mine && t.you}
                    {preview}
                  </p>
                  {row.unread > 0 && (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {row.unread}
                      <span className="sr-only"> — {t.unread(row.unread)}</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
