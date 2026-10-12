import { Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { PAGE_SIZE } from "@/lib/admin/follow-up";

const t = fr.admin.followUp;

/** Adresse d'une liste avec ses paramètres non vides (filtre, recherche, page). */
export function listHref(path: string, params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return (qs ? `${path}?${qs}` : path) as Route;
}

/** Recherche des listes du back-office (formulaire GET : l'adresse se partage telle quelle). */
export function SearchForm({
  action,
  label,
  placeholder,
  query,
  keep,
}: {
  action: string;
  label: string;
  placeholder: string;
  query: string | null;
  /** Paramètres conservés (filtre en cours). */
  keep?: Record<string, string | null>;
}) {
  return (
    <form action={action} role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {Object.entries(keep ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label htmlFor="admin-recherche" className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground"
        />
        <input
          id="admin-recherche"
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder={placeholder}
          className={`${inputClasses} bg-surface pl-10`}
        />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className={buttonClasses({ size: "md", block: false })}>
          {t.search}
        </button>
        {query && (
          <Link
            href={listHref(action, keep ?? {})}
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t.clear}
          </Link>
        )}
      </div>
    </form>
  );
}

/** Pastilles de filtre avec leur nombre de résultats. */
export function FilterChips({
  label,
  items,
}: {
  label: string;
  items: { key: string; href: Route; label: string; count?: number; active: boolean }[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`inline-flex min-h-touch items-center gap-2 rounded-chip border px-4 text-sm ${
                item.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className={`tabular-nums ${item.active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {item.count.toLocaleString("fr-FR")}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({
  page,
  total,
  hrefFor,
}: {
  page: number;
  total: number;
  hrefFor: (page: number) => Route;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const link = "text-sm font-medium text-primary underline-offset-2 hover:underline";
  return (
    <nav aria-label={t.pagination.label} className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={link}>
          ← {t.pagination.previous}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-muted-foreground">{t.pagination.page(page, pages)}</p>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={link}>
          {t.pagination.next} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Section d'une fiche du back-office (demande, chantier). */
export function DetailSection({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}

/** Liste « libellé : valeur » des fiches ; une valeur vide s'affiche « — ». */
export function InfoList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="flex flex-col">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 border-t border-border py-2 text-sm first:border-t-0 first:pt-0 sm:flex-row sm:gap-4"
        >
          <dt className="shrink-0 text-muted-foreground sm:w-40">{item.label}</dt>
          <dd className="min-w-0 break-words">{item.value ?? t.none}</dd>
        </div>
      ))}
    </dl>
  );
}
