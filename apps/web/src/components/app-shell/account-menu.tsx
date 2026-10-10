"use client";

import { ChevronDown, LogOut } from "lucide-react";
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
 * Menu du compte (maquette « Mes chantiers » : avatar et chevron) : nom, type de compte, liens de
 * l'espace et déconnexion. Se ferme en naviguant, avec Échap ou au clic en dehors.
 */
export function AccountMenu({
  account,
  links,
}: {
  account: ShellAccount;
  links: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  // Le menu reste ouvert pour la page où il a été ouvert : il se referme en naviguant.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const name = [account.firstName, account.lastName].filter(Boolean).join(" ") || t.account;

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t.account}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenFor(open ? null : pathname)}
        className="flex items-center gap-1 rounded-pill p-1 hover:bg-background focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ArtisanPhoto
          url={account.avatarUrl}
          name={name}
          className="size-9 rounded-full"
          initialsClassName="text-sm"
        />
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <div
          id={id}
          className="absolute right-0 z-40 mt-2 flex w-64 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{fr.roles[account.role]}</p>
          </div>
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
