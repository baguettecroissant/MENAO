import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Briques des listes de l'espace pro (ADR 0189), façon iPhone : un en-tête court (titre, un seul
 * bouton principal, le reste dans « … »), des filtres avec leur montant, puis des lignes fines
 * dans un seul cadre. Les mêmes partout : dépenses, factures, devis, chantiers, demandes.
 */

export type ListTone = "success" | "danger" | "warning" | "neutral" | "primary" | "example";

const TONES: Record<ListTone, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  neutral: "text-muted-foreground",
  primary: "text-primary-strong",
  example: "text-example-strong",
};

/** En-tête d'une liste : titre à gauche, actions à droite (bouton principal en dernier). */
export function ListHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-xl font-medium tracking-tight sm:text-2xl">{title}</h1>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Filtres soulignés, avec leur nombre ou leur montant (« À payer · 1 528 € »). */
export function ListFilters({
  label,
  items,
}: {
  label: string;
  items: readonly {
    href: string;
    label: string;
    detail?: string;
    active: boolean;
    tone?: ListTone;
  }[];
}) {
  return (
    <nav
      aria-label={label}
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          aria-current={item.active ? "page" : undefined}
          className="-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {item.label}
          {item.detail && (
            <span className={item.tone ? TONES[item.tone] : "text-subtle-foreground"}>
              · {item.detail}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Cadre des lignes, séparées par un trait fin. */
export function ListPanel({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card"
    >
      {children}
    </ul>
  );
}

/**
 * Une ligne : titre (deux lignes au plus) et détail à gauche ; une colonne de contexte (chantier) sur ordinateur ;
 * montant et état à droite, état en un mot et une couleur. Lien vers la fiche si `href`.
 */
export function ListRow({
  href,
  external = false,
  label,
  title,
  detail,
  context,
  value,
  status,
  badge,
}: {
  href?: string;
  /** Fichier ouvert dans un nouvel onglet (PDF), pas une page. */
  external?: boolean;
  /** Nom accessible du lien (« Ouvrir la dépense … »). */
  label?: string;
  title: ReactNode;
  detail?: ReactNode;
  /** Colonne du milieu, sur ordinateur seulement (repris dans `detail` sur téléphone). */
  context?: ReactNode;
  value?: ReactNode;
  status?: { text: string; tone: ListTone };
  /** Pastille après le titre (« Exemple »). */
  badge?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="line-clamp-2 text-[0.9375rem] font-medium">{title}</span>
          {badge}
        </span>
        {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      {context !== undefined && (
        <span className="hidden w-44 shrink-0 truncate text-sm text-muted-foreground md:block">
          {context}
        </span>
      )}
      {(value !== undefined || status) && (
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          {value !== undefined && (
            <span className="text-[0.9375rem] font-medium tabular-nums">{value}</span>
          )}
          {status && <span className={`text-xs ${TONES[status.tone]}`}>{status.text}</span>}
        </span>
      )}
      {href && (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
      )}
    </>
  );
  const row = "flex min-h-16 items-center gap-4 px-4 py-3 sm:px-5";
  const linkRow =
    "transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none";
  return (
    <li>
      {href && external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={label}
          className={`${row} ${linkRow}`}
        >
          {body}
        </a>
      ) : href ? (
        <Link href={href as Route} aria-label={label} className={`${row} ${linkRow}`}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}
