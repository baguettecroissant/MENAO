"use client";

import { Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { fr } from "@/i18n/fr";
import type { ShellAccount } from "@/lib/client/shell";
import { AccountMenu } from "./account-menu";
import {
  ACCOUNT_LINKS,
  MENU_COOKIE,
  SPACE_HOME,
  SPACE_MESSAGES,
  activeItem,
  type Badges,
  type Space,
} from "./nav-config";
import { SidebarContent, type Visibility } from "./sidebar";

const t = fr.appShell;

/**
 * Coque des espaces client, pro et admin (ADR 0035). Ordinateur : menu latéral fixe, repliable
 * en barre d'icônes (choix mémorisé), et barre du haut (rubrique, recherche, cloche). Mobile :
 * barre du haut (messages, cloche, compte) et le même menu latéral, en tiroir ; pas d'onglets en
 * bas d'écran, réservés aux applications iOS et Android (ADR 0043). Le contenu n'est pas enveloppé
 * dans <main> : chaque page porte le sien.
 */
export function AppFrame({
  space,
  badges,
  account,
  visibility,
  initialCollapsed,
  children,
}: {
  space: Space;
  badges: Badges;
  account: ShellAccount | null;
  visibility: Visibility | null;
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // Le tiroir mobile reste ouvert pour la page où il a été ouvert : il se referme en naviguant.
  const [drawerFor, setDrawerFor] = useState<string | null>(null);
  const drawerOpen = drawerFor === pathname;
  const drawer = useRef<HTMLDialogElement>(null);
  const current = activeItem(space, pathname);
  const CurrentIcon = current?.icon;
  const messagesHref = SPACE_MESSAGES[space];

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${MENU_COOKIE}=${next ? "reduit" : "ouvert"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.skip}
      </a>

      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:block ${
          collapsed ? "w-[4.75rem]" : "w-[17rem]"
        }`}
      >
        <SidebarContent
          space={space}
          badges={badges}
          account={account}
          visibility={visibility}
          collapsed={collapsed}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerFor(pathname)}
            aria-label={t.openMenu}
            aria-expanded={drawerOpen}
            className="inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <Link
            href={SPACE_HOME[space] as Route}
            aria-label={`MENAO, ${t.spaces[space]}`}
            className="shrink-0 rounded-md lg:hidden"
          >
            {/* Téléphones étroits : symbole seul, pour laisser la place aux icônes (ADR 0043). */}
            <LogoMark className="size-7 min-[420px]:hidden" />
            <span className="hidden min-[420px]:inline-flex">
              <Logo />
            </span>
          </Link>

          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? t.expand : t.collapse}
            aria-pressed={collapsed}
            className="hidden size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-5" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-5" />
            )}
          </button>
          <span aria-hidden="true" className="hidden h-6 w-px bg-border lg:block" />
          <p className="hidden min-w-0 items-center gap-2 text-sm font-medium lg:flex">
            {CurrentIcon && <CurrentIcon aria-hidden="true" className="size-4 text-primary" />}
            <span className="truncate">{current?.label ?? t.spaces[space]}</span>
          </p>

          {space === "client" && (
            <Link
              href="/mon-espace/nouvelle-demande"
              aria-label={fr.clientApp.searchLabel}
              className="mx-auto hidden min-h-11 w-full max-w-md items-center justify-between gap-3 rounded-pill border border-border bg-background px-4 text-sm text-subtle-foreground transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none md:flex"
            >
              {fr.clientApp.search}
              <Search aria-hidden="true" className="size-4 text-foreground" />
            </Link>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {space === "client" && (
              // Petits écrans : la barre de recherche cède la place à une icône (ADR 0043).
              <Link
                href="/mon-espace/nouvelle-demande"
                aria-label={fr.clientApp.searchLabel}
                className="inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none md:hidden"
              >
                <Search aria-hidden="true" className="size-5" />
              </Link>
            )}
            {messagesHref && (
              <Link
                href={messagesHref as Route}
                aria-label={t.messages(badges.messages ?? 0)}
                className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:hidden"
              >
                <MessageCircle aria-hidden="true" className="size-5" />
                {(badges.messages ?? 0) > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-medium text-primary-foreground"
                  >
                    {(badges.messages ?? 0) > 9 ? "9+" : badges.messages}
                  </span>
                )}
              </Link>
            )}
            {space !== "admin" && <NotificationBell />}
            {account && (
              <div className="lg:hidden">
                <AccountMenu account={account} links={ACCOUNT_LINKS[space]} />
              </div>
            )}
          </div>
        </header>

        <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </div>

      <dialog
        ref={drawer}
        aria-label={t.nav[space]}
        onClose={() => setDrawerFor(null)}
        onClick={(event) => {
          // Clic sur le fond assombri, en dehors du tiroir.
          if (event.target === event.currentTarget) setDrawerFor(null);
        }}
        className="m-0 h-dvh max-h-none w-[85vw] max-w-xs bg-surface p-0 text-foreground shadow-raised backdrop:bg-[#0b1230]/50 lg:hidden"
      >
        <div className="relative h-full">
          <button
            type="button"
            onClick={() => setDrawerFor(null)}
            aria-label={t.closeMenu}
            className="absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          {drawerOpen && (
            <SidebarContent space={space} badges={badges} account={null} visibility={visibility} />
          )}
        </div>
      </dialog>
    </div>
  );
}
