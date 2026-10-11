import { CalendarDays, SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";

const t = fr.pro.agenda;
const TABS = [
  { key: "agenda", href: "/pro/agenda", label: t.tabs.agenda, icon: CalendarDays },
  {
    key: "disponibilites",
    href: "/pro/agenda/disponibilites",
    label: t.tabs.availability,
    icon: SlidersHorizontal,
  },
] as const;

/** Onglets de l'agenda (F-44) : la semaine, et les réglages de disponibilité. */
export function AgendaTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav
      aria-label={t.tabsLabel}
      className="flex w-full gap-1 rounded-pill border border-border bg-surface p-1 shadow-card sm:w-fit"
    >
      {TABS.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href as Route}
          aria-current={current === key ? "page" : undefined}
          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-pill px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground sm:flex-none"
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
