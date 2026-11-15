import { AlertTriangle, Check, CheckCircle2, LayoutGrid, Ruler, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

const g = fr.pro.tenders.plan.guide;

/**
 * Parcours guidé des appels d'offres créés depuis les plans (maquette du lot 56) : trois états
 * seulement pour une quantité, quatre chiffres clés, pastille des points à vérifier et barre du
 * bas avec un seul bouton « Continuer ».
 */
export type GuideStateKind = "ok" | "mine" | "est" | "todo";

const STATES: Record<GuideStateKind, { className: string; icon: ReactNode }> = {
  ok: {
    className: "bg-success-soft text-success",
    icon: <Check aria-hidden="true" className="size-3" strokeWidth={3} />,
  },
  mine: {
    className: "bg-success-soft text-success",
    icon: <Check aria-hidden="true" className="size-3" strokeWidth={3} />,
  },
  est: {
    className: "bg-warning-soft text-warning",
    icon: <Ruler aria-hidden="true" className="size-3" />,
  },
  todo: {
    className: "bg-danger-soft text-danger",
    icon: <AlertTriangle aria-hidden="true" className="size-3" />,
  },
};

/** Pastille d'état : lu sur le plan, votre valeur, estimé par MENAO ou à compléter. */
export function GuideState({ kind, title }: { kind: GuideStateKind; title?: string }) {
  const state = STATES[kind];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-bold whitespace-nowrap ${state.className}`}
    >
      {state.icon}
      {g.states[kind]}
    </span>
  );
}

/** Pastille « N points à vérifier » de l'en-tête. */
export function GuidePoints({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-pill bg-success-soft px-3.5 py-2 text-sm font-bold text-success">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        {g.allChecked}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-pill bg-warning-soft px-3.5 py-2 text-sm font-bold text-warning">
      <AlertTriangle aria-hidden="true" className="size-4" />
      {g.points(count)}
    </span>
  );
}

/** Quatre chiffres clés de la lecture, à la place du long résumé. */
export function GuideFigures({
  rooms,
  areaM2,
  works,
  symbols,
  points,
}: {
  rooms: number;
  areaM2: string;
  works: number;
  symbols: number;
  points: number;
}) {
  const tiles = [
    {
      icon: LayoutGrid,
      tone: "bg-primary-soft text-primary-strong",
      title: g.figures.rooms(rooms),
      text: g.figures.area(areaM2),
    },
    {
      icon: CheckCircle2,
      tone: "bg-success-soft text-success",
      title: g.figures.works(works),
      text: g.figures.worksText,
    },
    {
      icon: Sparkles,
      tone: "bg-success-soft text-success",
      title: g.figures.symbols(symbols),
      text: g.figures.symbolsText,
    },
    {
      icon: AlertTriangle,
      tone: points ? "bg-warning-soft text-warning" : "bg-success-soft text-success",
      title: g.figures.points(points),
      text: points ? g.figures.pointsText : g.figures.pointsDone,
    },
  ];
  return (
    <ul aria-label={g.figures.label} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, tone, title, text }) => (
        <li
          key={title}
          className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card"
        >
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-input ${tone}`}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="flex flex-col">
            <b className="text-lg leading-tight">{title}</b>
            <span className="text-[0.8125rem] text-muted-foreground">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Barre du bas, toujours visible : retour, ce qui reste à vérifier, et un seul « Continuer ». */
export function GuideBar({
  back,
  text,
  children,
}: {
  back?: ReactNode;
  text?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 shadow-[0_-6px_18px_rgb(0_0_0/0.06)]">
      {back}
      <span className="flex min-w-48 flex-1 items-start gap-2 text-sm text-label">
        {text && (
          <>
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>{text}</span>
          </>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-2">{children}</span>
    </div>
  );
}
