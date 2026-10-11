"use client";

import type { VisibilityCondition } from "@menao/core";
import { Eye, EyeOff, LifeBuoy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";
import type { ShellAccount } from "@/lib/client/shell";
import { AccountMenu } from "./account-menu";
import {
  ACCOUNT_LINKS,
  NAV,
  SPACE_HOME,
  isActive,
  type Badges,
  type NavItem,
  type Space,
} from "./nav-config";

const t = fr.appShell;

export type Visibility = { visible: boolean; missing: VisibilityCondition[] };

/** Étape de « Mon dossier » qui lève chaque condition de visibilité. */
const MISSING_HREF: Record<VisibilityCondition, string> = {
  validation: "/pro/onboarding",
  abonnement: "/pro/onboarding/formule",
  paiements: "/pro/onboarding/paiements",
};

/**
 * Contenu du menu latéral (ADR 0035) : logo et espace, rubriques avec compteurs d'éléments à
 * traiter, état de visibilité de l'artisan, aide et compte. « collapsed » : barre d'icônes.
 */
export function SidebarContent({
  space,
  badges,
  account,
  visibility,
  collapsed = false,
}: {
  space: Space;
  badges: Badges;
  account: ShellAccount | null;
  visibility: Visibility | null;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 shrink-0 items-center gap-2.5 border-b border-border ${collapsed ? "justify-center" : "px-5"}`}
      >
        <Link
          href={SPACE_HOME[space] as Route}
          aria-label={`MENAO, ${t.spaces[space]}`}
          className="rounded-md focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          {collapsed ? <LogoMark className="size-8" /> : <Logo />}
        </Link>
        {!collapsed && (
          <span className="rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium whitespace-nowrap text-primary-strong">
            {t.spaces[space]}
          </span>
        )}
      </div>

      <nav aria-label={t.nav[space]} className="flex-1 overflow-y-auto px-3 py-4">
        {NAV[space].map((section, index) => (
          <div key={section.label ?? index} className="mb-4 last:mb-0">
            {section.label &&
              (collapsed ? (
                index > 0 && <hr className="mx-3 mb-3 border-border" />
              ) : (
                <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-subtle-foreground uppercase">
                  {section.label}
                </p>
              ))}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={isActive(item, pathname)}
                    count={item.badge ? (badges[item.badge] ?? 0) : 0}
                    collapsed={collapsed}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {visibility && !collapsed && <VisibilityCard visibility={visibility} />}

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-border p-2.5">
        {space !== "admin" && (
          <Link
            href="/contact"
            title={collapsed ? t.help : undefined}
            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${collapsed ? "justify-center px-0" : ""}`}
          >
            <LifeBuoy aria-hidden="true" className="size-5 shrink-0" />
            <span className={collapsed ? "sr-only" : ""}>{t.help}</span>
          </Link>
        )}
        {account && (
          <AccountMenu
            account={account}
            links={ACCOUNT_LINKS[space]}
            variant="sidebar"
            collapsed={collapsed}
          />
        )}
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  count,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  count: number;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href as Route}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex min-h-11 items-center gap-3 rounded-xl text-[0.9375rem] lg:min-h-10 transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
        collapsed ? "justify-center" : "px-3"
      } ${
        active
          ? "bg-primary-softer font-medium text-primary-strong"
          : "text-foreground/80 hover:bg-background hover:text-foreground"
      }`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-primary"
        />
      )}
      <Icon
        aria-hidden="true"
        className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
      />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.label}</span>
      {count > 0 && (
        <>
          <span className="sr-only">, {fr.appShell.toDo(count)}</span>
          <span
            aria-hidden="true"
            className={
              collapsed
                ? "absolute top-2 right-2.5 size-2.5 rounded-full bg-primary ring-2 ring-surface"
                : "rounded-pill bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground tabular-nums"
            }
          >
            {collapsed ? null : fr.appShell.badge(count)}
          </span>
        </>
      )}
    </Link>
  );
}

function VisibilityCard({ visibility }: { visibility: Visibility }) {
  const missingLabels = fr.pro.onboarding.visibility.missing;
  if (visibility.visible) {
    return (
      <p
        title={t.visibility.visibleText}
        className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-xs font-medium text-success"
      >
        <Eye aria-hidden="true" className="size-4 shrink-0" />
        {t.visibility.visible}
      </p>
    );
  }
  return (
    <div className="mx-3 mb-3 rounded-card bg-warning-soft px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-warning">
        <EyeOff aria-hidden="true" className="size-4" />
        {t.visibility.hidden}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-foreground/75">{t.visibility.hiddenText}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {visibility.missing.map((condition) => (
          <li key={condition}>
            <Link
              href={MISSING_HREF[condition] as Route}
              className="text-xs font-medium text-warning underline underline-offset-2 hover:no-underline"
            >
              {missingLabels[condition]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
