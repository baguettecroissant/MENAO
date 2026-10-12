"use client";

import { CircleHelp, ClipboardList, FileText, MessageCircle, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.clientApp;
const ITEMS = [
  { href: "/mon-espace", label: t.tabs.chantiers, icon: ClipboardList },
  { href: "/mon-espace/documents", label: t.tabs.documents, icon: FileText },
  { href: "/mon-espace/messages", label: t.tabs.messages, icon: MessageCircle },
  { href: "/contact", label: t.tabs.help, icon: CircleHelp },
] as const;
/** Écrans principaux : les fiches (chantier, devis) ont leur propre barre d'actions. */
const MAIN = ["/mon-espace", "/mon-espace/documents", "/mon-espace/messages", "/notifications"];

/**
 * Barre d'onglets mobile de l'application client (maquette « Mes chantiers - Mobile ») : deux
 * onglets de chaque côté du bouton central « Démarrer un chantier ».
 */
export function ClientBottomNav() {
  const pathname = usePathname();
  if (!MAIN.includes(pathname)) return null;
  const tab = ({ href, label, icon: Icon }: (typeof ITEMS)[number]) => (
    <li key={href}>
      <Link
        href={href as Route}
        aria-current={pathname === href ? "page" : undefined}
        className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[0.6875rem] leading-tight text-muted-foreground aria-[current=page]:text-primary"
      >
        <Icon aria-hidden="true" className="size-5" />
        {label}
      </Link>
    </li>
  );
  return (
    <nav
      aria-label={t.nav}
      className="sticky bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center">
        {ITEMS.slice(0, 2).map(tab)}
        <li className="flex justify-center">
          <Link
            href="/mon-espace/nouvelle-demande"
            aria-label={t.tabs.start}
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <Search aria-hidden="true" className="size-6" />
          </Link>
        </li>
        {ITEMS.slice(2).map(tab)}
      </ul>
    </nav>
  );
}
