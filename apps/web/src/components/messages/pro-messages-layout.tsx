import type { Database } from "@menao/db";
import { ArrowLeft, MessagesSquare, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { fr } from "@/i18n/fr";
import { ConversationBrowser } from "./conversation-browser";

const t = fr.messages;
type ConversationRow = Database["public"]["Functions"]["my_conversations"]["Returns"][number];

/**
 * Messages de l'artisan (F-40), refonte « Nette » (ADR 0249). Grand écran : la liste des
 * conversations à gauche et la conversation ouverte à droite, dans un même cadre. Téléphone : la
 * liste seule sur /pro/messages, la conversation seule sur /pro/messages/[id].
 */
export function ProMessagesLayout({
  rows,
  avatarUrls,
  now,
  activeId,
  empty,
  children,
  base = "/pro/messages",
}: {
  /** Pages d'exemples (ADR 0184) : /pro/decouvrir/messages. */
  base?: "/pro/messages" | "/pro/decouvrir/messages";
  rows: readonly ConversationRow[];
  avatarUrls: ReadonlyMap<string, string>;
  now: Date;
  activeId?: string;
  /** État vide (aucune conversation), à la place du cadre. */
  empty?: ReactNode;
  /** Conversation ouverte. */
  children?: ReactNode;
}) {
  const open = Boolean(activeId);
  return (
    <main className="flex-1">
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-6 sm:px-6 lg:px-10 lg:py-10 ${open ? "max-lg:px-0 max-lg:py-0" : "px-4 py-6 sm:py-10"}`}
      >
        <div className={`flex flex-col gap-1.5 ${open ? "max-lg:sr-only" : ""}`}>
          <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
          <p className="text-[0.9375rem] text-label sm:text-base">{t.subtitlePro}</p>
        </div>
        {empty ?? (
          <div className="lg:grid lg:h-[calc(100dvh-14rem)] lg:min-h-[34rem] lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden lg:rounded-card lg:border lg:border-border lg:bg-surface lg:shadow-card">
            <div
              className={`flex min-h-0 flex-col lg:border-r lg:border-border ${open ? "max-lg:hidden" : ""}`}
            >
              <ConversationBrowser
                rows={rows}
                avatarUrls={avatarUrls}
                now={now}
                activeId={activeId}
                base={base}
              />
            </div>
            <div
              className={`flex min-h-0 min-w-0 flex-col bg-background ${open ? "" : "max-lg:hidden"}`}
            >
              {children ?? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                  <MessagesSquare aria-hidden="true" className="size-8 text-subtle-foreground" />
                  {t.pick}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Conversation ouverte : en-tête (retour sur téléphone, interlocuteur, lien vers le chantier,
 * « Appeler » si le numéro est connu), puis les messages qui défilent et la zone d'écriture.
 */
export function ProConversationPane({
  backHref = "/pro/messages",
  chantierHref,
  title,
  otherName,
  avatar,
  phone,
  children,
}: {
  chantierHref: string;
  title: string;
  otherName: string;
  avatar: string | null;
  phone: string | null;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <section aria-labelledby="conversation-title" className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-3 py-3 sm:px-5">
        <Link
          href={backHref as Route}
          aria-label={t.back}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <ArtisanPhoto
          url={avatar}
          name={otherName}
          className="size-11 shrink-0 rounded-full"
          initialsClassName="text-sm"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="conversation-title" className="truncate font-sans text-base font-bold">
            {otherName}
          </h2>
          <Link
            href={chantierHref as Route}
            className="truncate text-[0.8125rem] font-semibold text-primary-strong hover:underline"
          >
            {title} ›<span className="sr-only"> — {t.seeChantier}</span>
          </Link>
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label={t.call(otherName)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <Phone aria-hidden="true" className="size-5" />
          </a>
        )}
      </header>
      <div className="min-h-0 flex-1 lg:overflow-y-auto">{children}</div>
    </section>
  );
}
