import { LogOut } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import { ProHeaderNav } from "./pro-nav";

const t = fr.pro.space;

/** En-tête de l'espace pro : logo, navigation, accès au dossier (photo) et déconnexion. */
export function ProHeader({
  firstName,
  avatarUrl,
}: {
  firstName: string | null;
  avatarUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/pro/tableau-de-bord"
            aria-label={`MENAO, ${t.dashboard}`}
            className="rounded-md"
          >
            <Logo />
          </Link>
          <ProHeaderNav />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/pro/onboarding"
            className="flex items-center gap-2 rounded-pill py-1 pr-1 pl-1 hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:pr-3"
          >
            <ArtisanPhoto
              url={avatarUrl}
              name={firstName ?? "MENAO"}
              className="size-9 rounded-full"
              initialsClassName="text-sm"
            />
            <span className="sr-only text-sm font-medium lg:not-sr-only">{t.file}</span>
          </Link>
          <form action={signOut} className="hidden lg:block">
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
