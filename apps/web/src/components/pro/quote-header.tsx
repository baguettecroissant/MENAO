import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { formatDayInline } from "@/lib/format";

const t = fr.pro.quote;
const st = fr.pro.sheet;

type QuoteStep = "lignes" | "apercu" | "envoi";

/**
 * En-tête des écrans du devis (refonte « Nette », ADR 0247) : retour, grand titre « Devis · … »,
 * client, ville et date de visite, et les étapes 1 Lignes · 2 Aperçu · 3 Envoi (liens vers les
 * étapes déjà ouvertes). `wide` : largeur de l'éditeur, sur deux colonnes.
 */
export function QuoteHeader({
  backHref,
  backLabel,
  chantierTitle,
  appointmentAt,
  step = "lignes",
  chantierId,
  client = null,
  place = null,
  wide = false,
}: {
  backHref: string;
  backLabel: string;
  /** Ancien titre (« Envoyer un devis ») : remplacé par « Devis · titre du chantier ». */
  title?: string;
  chantierTitle: string;
  /** Rendez-vous planifié, s'il y en a un. */
  appointmentAt: string | null;
  step?: QuoteStep;
  /** Pour les liens entre étapes (aperçu, envoi). */
  chantierId?: string;
  client?: string | null;
  place?: string | null;
  wide?: boolean;
}) {
  const meta = [
    client,
    place,
    appointmentAt ? st.visitOn(formatDayInline(appointmentAt)) : null,
  ].filter(Boolean);
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-8 ${
        wide ? "max-w-6xl lg:px-10" : "max-w-3xl"
      }`}
    >
      <Link
        href={backHref as Route}
        className="inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 max-w-2xl flex-col gap-2">
          <h1 className="text-[1.875rem] leading-[1.08] sm:text-[2.5rem] sm:leading-[1.05]">
            {st.quoteHeading(chantierTitle)}
          </h1>
          {meta.length > 0 && (
            <p className="text-[0.9375rem] text-label sm:text-base">{meta.join(" · ")}</p>
          )}
        </div>
        <QuoteSteps step={step} chantierId={chantierId} editorHref={backHref} />
      </header>
    </div>
  );
}

/** Étapes du devis : la courante en pastille bleu nuit, les autres en lien quand c'est possible. */
function QuoteSteps({
  step,
  chantierId,
  editorHref,
}: {
  step: QuoteStep;
  chantierId?: string;
  editorHref: string;
}) {
  const steps: { key: QuoteStep; label: string; href: string | null }[] = [
    { key: "lignes", label: st.steps.lignes, href: step === "lignes" ? null : editorHref },
    {
      key: "apercu",
      label: st.steps.apercu,
      href: chantierId && step === "envoi" ? `/pro/chantiers/${chantierId}/devis/apercu` : null,
    },
    { key: "envoi", label: st.steps.envoi, href: null },
  ];
  const current = steps.findIndex((s) => s.key === step);
  return (
    <nav
      aria-label={t.tabs.label}
      className="flex w-full items-center gap-2.5 rounded-card border border-border bg-surface px-4 py-3 shadow-card sm:w-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
    >
      {steps.map((s, i) => {
        const body = (
          <>
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold ${
                i === current
                  ? "bg-foreground text-surface"
                  : "border-2 border-border-strong text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            {s.label}
          </>
        );
        const cls = `inline-flex items-center gap-2 text-sm whitespace-nowrap ${
          i === current ? "font-bold text-foreground" : "font-semibold text-muted-foreground"
        }`;
        return (
          <span key={s.key} className="flex flex-1 items-center gap-2.5 sm:flex-none">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="h-0.5 flex-1 bg-border-strong sm:w-7 sm:flex-none"
              />
            )}
            {s.href ? (
              <Link href={s.href as Route} className={`${cls} hover:text-foreground`}>
                {body}
              </Link>
            ) : (
              <span aria-current={i === current ? "step" : undefined} className={cls}>
                {body}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
