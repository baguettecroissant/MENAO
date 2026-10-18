import type { ClientTodo, ClientTodoKind } from "@menao/core";
import {
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FilePen,
  PartyPopper,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";

const t = fr.myChantiers;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export type ClientTodoRow = {
  chantier_id: string;
  title: string;
  artisan_name: string;
  quote_total_ttc_cents: number | null;
};

const ICONS: Record<ClientTodoKind, LucideIcon> = {
  signer_devis: FilePen,
  payer_acompte: CreditCard,
  valider_reception: ClipboardCheck,
  confirmer_levee: ShieldCheck,
  payer_solde: CreditCard,
  donner_avis: Star,
};

/** Même page que depuis « Mes chantiers » : devis, paiement, réception, avis, ou le chantier. */
function hrefOf(todo: ClientTodo<ClientTodoRow>): string {
  const id = todo.row.chantier_id;
  switch (todo.kind) {
    case "signer_devis":
      return `/mon-espace/devis/${todo.quoteId}`;
    case "payer_acompte":
      return `/mon-espace/devis/${todo.quoteId}/acompte`;
    case "payer_solde":
      return `/mon-espace/chantiers/${id}/solde`;
    case "valider_reception":
      return `/mon-espace/chantiers/${id}/reception`;
    case "donner_avis":
      return `/mon-espace/chantiers/${id}/avis`;
    case "confirmer_levee":
      return `/mon-espace/chantiers/${id}`;
  }
}

/** Montant affiché : total TTC du devis à signer, acompte ou solde à payer. */
function amountOf(todo: ClientTodo<ClientTodoRow>): number | null {
  if (todo.kind === "payer_acompte" || todo.kind === "payer_solde") return todo.amountCents;
  if (todo.kind === "signer_devis") return todo.row.quote_total_ttc_cents;
  return null;
}

/**
 * « À faire maintenant » du client (ADR 0132), comme l'accueil de l'application : ce qui l'attend
 * sur ses chantiers (`clientTodos`, @menao/core) ; « Tout est à jour » s'il a des chantiers en
 * cours sans rien à faire de son côté.
 */
export function ClientTodoList({
  todos,
  hasActive,
}: {
  todos: ClientTodo<ClientTodoRow>[];
  hasActive: boolean;
}) {
  if (todos.length === 0) {
    if (!hasActive) return null;
    return (
      <div className="flex items-center gap-4 rounded-card bg-success-soft p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface text-success">
          <PartyPopper aria-hidden="true" className="size-6" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-success">{t.allDone}</span>
          <span className="text-sm">{t.allDoneHint}</span>
        </span>
      </div>
    );
  }
  return (
    <section aria-labelledby="a-faire" className="flex flex-col gap-3">
      <h2 id="a-faire" className="text-lg font-medium">
        {t.todoTitle}
      </h2>
      <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {todos.map((todo) => {
          const Icon = ICONS[todo.kind];
          const label =
            todo.kind === "donner_avis"
              ? t.todo.donner_avis(todo.row.artisan_name)
              : t.todo[todo.kind];
          const detail = t.todoDetail(todo.row.title, todo.row.artisan_name);
          const amount = amountOf(todo);
          return (
            <li
              key={`${todo.kind}-${todo.row.chantier_id}`}
              className="border-t border-border first:border-t-0"
            >
              <Link
                href={hrefOf(todo) as Route}
                aria-label={[label, detail, amount !== null ? euros.format(amount / 100) : null]
                  .filter(Boolean)
                  .join(", ")}
                className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-strong">
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium">{label}</span>
                  <span className="truncate text-sm text-muted-foreground">{detail}</span>
                </span>
                {amount !== null && (
                  <span className="shrink-0 text-sm font-medium">{euros.format(amount / 100)}</span>
                )}
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-subtle-foreground"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
