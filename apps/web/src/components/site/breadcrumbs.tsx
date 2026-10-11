import type { Route } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fr } from "@/i18n/fr";

export type Crumb = { label: string; href?: string };

/** Fil d'Ariane des pages du site ; le dernier élément est la page courante. */
export function Breadcrumbs({
  items,
  tone = "default",
}: {
  items: readonly Crumb[];
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  return (
    <nav aria-label={fr.site.breadcrumb}>
      <ol
        className={`flex flex-wrap items-center gap-1 text-xs ${inverse ? "text-white/70" : "text-muted-foreground"}`}
      >
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href as Route}
                  className={`rounded-sm underline-offset-2 hover:underline ${inverse ? "hover:text-white" : "hover:text-foreground"}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={inverse ? "text-white" : "text-foreground"}
                >
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden="true" className="size-3.5 opacity-70" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
