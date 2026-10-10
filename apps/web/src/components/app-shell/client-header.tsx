import { MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/app-shell/account-menu";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { fr } from "@/i18n/fr";
import type { ShellAccount } from "@/lib/client/shell";

const t = fr.clientApp;
export const CLIENT_LINKS = [
  { href: "/mon-espace", label: t.chantiers },
  { href: "/mon-espace/documents", label: t.documents },
  { href: "/mon-espace/messages", label: t.messagesLink },
  { href: "/notifications", label: t.notifications },
  { href: "/contact", label: t.help },
] as const;

/**
 * En-tête de l'application client (maquette « Mes chantiers - Desktop », ADR 0034) : logo vers
 * « Mes chantiers », champ « Décrivez votre besoin », messages, notifications et menu du compte.
 * Aucun lien du site vitrine.
 */
export function ClientHeader({
  account,
  unreadMessages,
}: {
  account: ShellAccount | null;
  unreadMessages: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/mon-espace" aria-label={t.home} className="shrink-0 rounded-md">
          <Logo />
        </Link>
        <Link
          href="/recherche"
          aria-label={t.searchLabel}
          className="hidden min-h-11 max-w-xl flex-1 items-center justify-between gap-3 rounded-pill border border-border bg-background px-4 text-sm text-subtle-foreground transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none md:flex"
        >
          {t.search}
          <Search aria-hidden="true" className="size-4 text-foreground" />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/mon-espace/messages"
            aria-label={t.messages(unreadMessages)}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            {unreadMessages > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-medium text-primary-foreground"
              >
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Link>
          <NotificationBell />
          {account && <AccountMenu account={account} links={CLIENT_LINKS} />}
        </div>
      </div>
    </header>
  );
}
