import type { TodoItem } from "@menao/core";
import {
  CalendarCheck,
  ChevronRight,
  Clock,
  FileClock,
  FilePen,
  Gift,
  Inbox,
  PartyPopper,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { formatTime } from "@/lib/format";

const t = fr.pro.dashboard;

type Tone = "danger" | "warning" | "primary";
type Line = {
  key: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail: string;
  accessory: string;
  accessoryLabel?: string;
  clock?: boolean;
  urgent?: boolean;
  href: string;
};

const ICON_TONE: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  primary: "bg-primary-soft text-primary-strong",
};

const place = (...parts: string[]) => parts.filter(Boolean).join(" · ");

/** Ligne affichée pour chaque élément de `artisanTodo` (@menao/core), comme dans l'application. */
function line(item: TodoItem, base: string): Line {
  switch (item.kind) {
    case "demande":
      return {
        key: `demande-${item.id}`,
        icon: Inbox,
        tone: item.urgent ? "danger" : "primary",
        title: t.todo.demande,
        detail: place(item.title, item.place),
        accessory: t.todo.hoursLeft(item.hoursLeft),
        accessoryLabel: t.todo.hoursLeftLabel(item.hoursLeft),
        clock: true,
        urgent: item.urgent,
        href: `${base}/demandes/${item.id}`,
      };
    case "rdv":
      return {
        key: `rdv-${item.appointment}-${item.chantierId}`,
        icon: CalendarCheck,
        tone: "primary",
        title:
          item.appointment === "visite"
            ? t.todo.visite(formatTime(item.at))
            : t.todo.demarrage(formatTime(item.at)),
        detail: place(item.title, item.place),
        accessory: t.todo.today,
        href: `${base}/chantiers/${item.chantierId}`,
      };
    case "devis":
      return {
        key: `devis-${item.chantierId}`,
        icon: FilePen,
        tone: "primary",
        title: t.todo.devis,
        detail: place(item.title, item.place),
        accessory: t.todo.devisAction,
        href: `${base}/chantiers/${item.chantierId}/devis`,
      };
    case "documents":
      return {
        key: "documents",
        icon: FileClock,
        tone: "warning",
        title: t.todo.documents,
        detail: item.types.map((type) => fr.pro.onboarding.documents.types[type]).join(", "),
        accessory: t.todo.renew,
        href: "/pro/onboarding/documents",
      };
    case "urssaf":
      return {
        key: "urssaf",
        icon: FileClock,
        tone: "warning",
        title: t.todo.urssaf,
        detail: t.todo.urssafHint,
        accessory: t.todo.add,
        href: "/pro/onboarding/documents",
      };
    case "paiements":
      return {
        key: "paiements",
        icon: Wallet,
        tone: "warning",
        title: t.todo.paiements,
        detail: t.todo.paiementsHint,
        accessory: t.todo.activate,
        href: "/pro/onboarding/paiements",
      };
    case "avis":
      return {
        key: "avis",
        icon: Star,
        tone: "primary",
        title: t.todo.avis(item.count),
        detail: t.todo.avisHint,
        accessory: t.todo.respond,
        href: "/pro/avis",
      };
    case "cadeau":
      return {
        key: "cadeau",
        icon: Gift,
        tone: "primary",
        title: t.todo.cadeau,
        detail: t.todo.cadeauHint,
        accessory: t.todo.choose,
        href: "/pro/mon-profil#cadeau",
      };
  }
}

/**
 * « À faire maintenant » (ADR 0131), comme l'accueil de l'application (ADR 0130) : une liste par
 * urgence, chaque ligne mène à l'action ; « Tout est à jour » quand il ne reste rien.
 */
export function TodoList({
  items,
  base = "/pro",
}: {
  items: TodoItem[];
  /** Début des liens vers les demandes et chantiers (pages d'exemples, ADR 0184). */
  base?: string;
}) {
  if (items.length === 0) {
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
  // Refonte « Nette » (ADR 0245) : titre et nombre en pastille, grandes lignes ; en grand écran,
  // l'action en bouton (le premier en bleu), sur téléphone une flèche.
  return (
    <section aria-labelledby="todo-title" className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 id="todo-title" className="text-xl">
          {t.todoTitle}
        </h2>
        <span
          aria-hidden="true"
          className="rounded-pill bg-foreground px-2.5 py-0.5 text-[0.8125rem] font-bold text-surface tabular-nums"
        >
          {items.length}
        </span>
      </div>
      <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {items.map((item, index) => {
          const l = line(item, base);
          const button = !l.clock;
          return (
            <li key={l.key} className="border-t border-border first:border-t-0">
              <Link
                href={l.href as Route}
                aria-label={[l.title, l.detail, l.accessoryLabel ?? l.accessory]
                  .filter(Boolean)
                  .join(", ")}
                className="group flex min-h-[4.5rem] items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[l.tone]}`}
                >
                  <l.icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{l.title}</span>
                  {l.detail && (
                    <span className="truncate text-sm text-muted-foreground">{l.detail}</span>
                  )}
                </span>
                {button ? (
                  <span
                    aria-hidden="true"
                    className={`hidden h-9 shrink-0 items-center rounded-pill px-4 text-sm font-semibold sm:inline-flex ${
                      index === 0
                        ? "bg-primary text-primary-foreground group-hover:bg-primary-hover"
                        : "border border-border-strong bg-surface text-foreground"
                    }`}
                  >
                    {l.accessory}
                  </span>
                ) : (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${
                      l.urgent ? "text-danger" : "text-muted-foreground"
                    }`}
                  >
                    <Clock aria-hidden="true" className="size-3.5" />
                    {l.accessory}
                  </span>
                )}
                <ChevronRight
                  aria-hidden="true"
                  className={`size-5 shrink-0 text-muted-foreground ${button ? "sm:hidden" : ""}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
