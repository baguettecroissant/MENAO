import { Check, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.commercialDemo.training;

/**
 * Entraînement de la démo (ADR 0344) : un échange d'exemple déjà noté remplace le simulateur, pour
 * ne faire aucun appel payant à l'IA depuis un lien partagé.
 */
export function DemoTraining({ aside }: { aside: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-5 lg:flex-row">
      <section className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-sm font-bold text-warning">
            LM
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b>{t.persona}</b>
            <span className="text-[0.8125rem] text-muted-foreground">{t.personaDetail}</span>
          </span>
          <StatusBadge tone="success">{t.done}</StatusBadge>
        </div>
        <ol aria-label={t.persona} className="flex flex-col gap-2.5 bg-background px-5 py-4">
          {t.exchange.map(([who, text], i) => (
            <li
              key={i}
              className={`max-w-[32rem] rounded-[1.125rem] px-4 py-2.5 text-[0.9063rem] leading-relaxed ${
                who === "moi"
                  ? "self-end rounded-br-md bg-foreground text-surface"
                  : "self-start rounded-bl-md border border-border bg-surface"
              }`}
            >
              {text}
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2.5 border-t border-border px-4 py-3 text-[0.8438rem] text-muted-foreground">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t.locked}
        </p>
      </section>
      <div className="flex w-full flex-col gap-4 lg:w-[21rem] lg:shrink-0">
        <section
          aria-label={t.noteTitle}
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
        >
          <h2 className="text-lg font-semibold">{t.noteTitle}</h2>
          <p className="flex items-baseline gap-1.5">
            <span className="text-[2.75rem] leading-none font-extrabold tracking-tight">
              {t.score}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">/ 20</span>
          </p>
          <ul className="flex flex-col">
            {t.criteria.map(([label, score]) => (
              <li key={label} className="flex flex-col gap-1.5 border-t border-border py-2.5">
                <span className="flex justify-between text-sm">
                  <span className="font-semibold">{label}</span>
                  <span className="text-muted-foreground">{score} / 5</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-pill bg-background">
                  <span
                    className={`block h-full rounded-pill ${score >= 4 ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${score * 20}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <b className="text-sm">{t.tipsTitle}</b>
            {t.tips.map((tip) => (
              <p key={tip} className="flex gap-2 text-[0.8438rem] leading-snug text-label">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                {tip}
              </p>
            ))}
          </div>
        </section>
        {aside}
      </div>
    </div>
  );
}
