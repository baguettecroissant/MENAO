"use client";

import type { Database } from "@menao/db";
import { Search } from "lucide-react";
import { useState } from "react";
import { fr } from "@/i18n/fr";
import { ConversationList } from "./conversation-list";

const t = fr.messages;
type ConversationRow = Database["public"]["Functions"]["my_conversations"]["Returns"][number];

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Liste des conversations de l'artisan avec recherche (client, chantier) et filtre « Non lus »
 * (refonte « Nette », ADR 0249). Filtrage dans le navigateur, sur la liste déjà lue.
 */
export function ConversationBrowser({
  rows,
  avatarUrls,
  now,
  activeId,
  base = "/pro/messages",
}: {
  base?: "/pro/messages" | "/pro/decouvrir/messages" | "/mon-espace/messages";
  rows: readonly ConversationRow[];
  avatarUrls: ReadonlyMap<string, string>;
  now: Date;
  activeId?: string;
}) {
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const needle = normalize(query.trim());
  const unreadCount = rows.filter((r) => r.unread > 0).length;
  const shown = rows.filter(
    (r) =>
      (!unreadOnly || r.unread > 0) &&
      (!needle || normalize(`${r.other_name} ${r.title}`).includes(needle)),
  );
  const chip =
    "inline-flex min-h-8 items-center gap-1 rounded-chip px-2.5 text-xs font-bold aria-pressed:bg-foreground aria-pressed:text-surface bg-border/70 text-label focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Téléphone : liste en carte ; grand écran : colonne de gauche, sans cadre. */}
      <div className="flex flex-col gap-2.5 lg:border-b lg:border-border lg:px-4 lg:pt-4 lg:pb-3">
        <label className="flex h-11 items-center gap-2 rounded-input border border-border bg-surface px-3.5 text-muted-foreground focus-within:ring-4 focus-within:ring-primary/20">
          <Search aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">{t.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </label>
        <div role="group" aria-label={t.filtersLabel} className="flex gap-2">
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
            className={chip}
          >
            {t.all} · {rows.length}
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
            className={chip}
          >
            {t.unreadFilter} · {unreadCount}
          </button>
        </div>
      </div>
      <div className="overflow-hidden max-lg:rounded-card max-lg:border max-lg:border-border max-lg:shadow-card lg:-mt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t.noMatch}</p>
        ) : (
          <ConversationList
            rows={shown}
            basePath={base}
            avatarUrls={avatarUrls}
            now={now}
            activeId={activeId}
            framed={false}
          />
        )}
      </div>
    </div>
  );
}
