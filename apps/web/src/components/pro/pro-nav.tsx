"use client";

import { ClipboardList, FileText, Inbox, LayoutGrid, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/i18n/fr";

const t = fr.pro.space;

const ITEMS = [
  { href: "/pro/tableau-de-bord", label: t.dashboard, icon: LayoutGrid },
  { href: "/pro/demandes", label: t.requests, icon: Inbox },
  { href: "/pro/chantiers", label: t.chantiers, icon: ClipboardList },
  { href: "/pro/devis", label: t.quotes, icon: FileText },
  { href: "/pro/messages", label: t.messages, icon: MessageCircle },
] as const;

const active = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * Barre de navigation mobile des maquettes (Dashboard, Chantiers…), sur les écrans principaux
 * seulement : les fiches (opportunité, rendez-vous) ont leur propre barre d'actions.
 */
export function ProBottomNav() {
  const pathname = usePathname();
  if (!ITEMS.some((item) => item.href === pathname)) return null;
  return (
    <nav
      aria-label={t.nav}
      className="sticky bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href as Route}
              aria-current={active(pathname, href) ? "page" : undefined}
              className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[0.6875rem] leading-tight text-muted-foreground aria-[current=page]:text-primary"
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
