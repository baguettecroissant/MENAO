"use client";

import { ChevronDown, ChevronsUpDown, LogOut } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import type { ShellAccount } from "@/lib/client/shell";

const t = fr.clientApp;

/**
 * Menu du compte : nom, type de compte, liens de l'espace et déconnexion. « sidebar » : carte en
 * bas du menu latéral (ordinateur), menu ouvert vers le haut ; « compact » : avatar de la barre du
 * haut (mobile). Se ferme en naviguant, avec Échap ou au clic en dehors.
 */
export function AccountMenu({
  account,
  links,
  variant = "compact",
  collapsed = false,
}: {
  account: ShellAccount;
  links: readonly { href: string; label: string }[];
  variant?: "compact" | "sidebar";
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Le menu reste ouvert pour la page où il a été ouvert : il se referme en naviguant.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || t.account;
  const sidebar = variant === "sidebar";

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpenFor(null);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const avatar = (size: string) => (
    <ArtisanPhoto
      url={account.avatarUrl}
      name={name}
      className={`${size} shrink-0 rounded-full`}
      initialsClassName="text-sm"
    />
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.account}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenFor(open ? null : pathname)}
        className={`flex items-center rounded-pill hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-expanded:bg-background ${
          sidebar
            ? `w-full gap-3 rounded-xl p-2 text-left ${collapsed ? "justify-center" : ""}`
            : "gap-1 p-1"
        }`}
      >
        {avatar(sidebar ? "size-10" : "size-9")}
        {sidebar && !collapsed && (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{fr.roles[account.role]}</span>
          </span>
        )}
        {sidebar ? (
          !collapsed && (
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div
          id={id}
          className={`absolute z-40 flex w-64 flex-col overflow-hidden rounded-card border border-border bg-surface text-foreground shadow-raised ${
            sidebar ? "bottom-full left-0 mb-2" : "right-0 mt-2"
          }`}
        >
          {/* Sur la carte du menu latéral, nom et type de compte sont déjà affichés. */}
          {(!sidebar || collapsed) && (
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              {avatar("size-9")}
              <div className="min-w-0">
                <p className="truncate font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{fr.roles[account.role]}</p>
              </div>
            </div>
          )}
          {links.length > 0 && (
            <ul className="flex flex-col py-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href as Route}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className="flex min-h-11 items-center px-4 text-sm hover:bg-background aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form action={signOut} className="border-t border-border">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 px-4 text-sm text-danger hover:bg-danger-soft"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
