import { Check } from "lucide-react";
import { StripeExplainerLink } from "@/components/pro/stripe-explainer";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.connect.ahead;

export type StripeAheadSent = { company: boolean; identity: boolean; piece: boolean };

/**
 * Avant Stripe (F-181, ADR 0378, maquette du lot 75) : ce que MENAO transmet à la place de
 * l'artisan, puis ce que Stripe va lui demander, dont la protection du compte par SMS, pour qu'il
 * ne la découvre pas en route.
 */
export function StripeAhead({ sent }: { sent: StripeAheadSent }) {
  const items = [
    sent.company ? t.company : null,
    sent.identity ? t.identity : null,
    sent.piece ? t.piece : null,
  ].filter((item) => item !== null);
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <section
          aria-labelledby="transmis-pour-vous"
          className="flex flex-col rounded-card border border-border bg-surface px-3.5 py-2"
        >
          <h3
            id="transmis-pour-vous"
            className="py-2 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase"
          >
            {t.sentTitle}
          </h3>
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.title} className="flex items-start gap-3 py-2">
                <span className="flex size-[1.625rem] shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={3.2} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.90625rem] font-semibold">{item.title}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{item.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section
        aria-labelledby="stripe-demande"
        className="flex flex-col rounded-card border-[1.5px] border-primary/35 bg-primary-softer px-3.5 py-2"
      >
        <h3
          id="stripe-demande"
          className="py-2 text-xs font-bold tracking-[0.06em] text-primary-strong uppercase"
        >
          {t.askedTitle}
        </h3>
        <ol className="flex flex-col">
          {t.asked.map((item, index) => (
            <li key={item.title} className="flex items-start gap-3 py-2">
              <span
                aria-hidden="true"
                className="flex size-[1.625rem] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.8125rem] font-extrabold text-primary-strong"
              >
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="flex items-center gap-2 text-[0.90625rem] font-semibold">
                  {item.title}
                  {/* Le code par SMS surprend : le mémo s'ouvre sur cette question (ADR 0384). */}
                  {index === 0 && <StripeExplainerLink focus="sms" asIcon />}
                </span>
                <span className="text-[0.8125rem] text-muted-foreground">{item.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
