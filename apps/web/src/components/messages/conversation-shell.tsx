import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.messages;

/** Cadre commun des conversations (client et artisan) : retour, interlocuteur, chantier. */
export function ConversationShell({
  backHref,
  chantierHref,
  title,
  otherName,
  avatar,
  children,
}: {
  backHref: string;
  chantierHref: string;
  title: string;
  otherName: string;
  avatar: string | null;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-0 py-0 sm:px-6 sm:py-8">
        <Link
          href={backHref as Route}
          className="mx-4 mt-5 inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none sm:mx-0 sm:mt-0"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <section
          aria-labelledby="conversation-title"
          className="flex flex-col overflow-hidden border-y border-border bg-surface sm:rounded-card sm:border sm:shadow-card"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
            <ArtisanPhoto
              url={avatar}
              name={otherName}
              className="size-11 shrink-0 rounded-full"
              initialsClassName="text-sm"
            />
            <div className="min-w-0">
              <h1 id="conversation-title" className="truncate font-medium">
                {otherName}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {title} ·{" "}
                <TextLink href={chantierHref as Route} className="text-xs">
                  {t.seeChantier}
                </TextLink>
              </p>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
