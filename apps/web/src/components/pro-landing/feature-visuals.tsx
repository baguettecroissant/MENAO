import { CalendarDays, Camera, CircleCheck, MapPin, Mic, Sparkles } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.features;
// Hauteurs (en %) des barres de l'onde sonore de l'illustration.
const WAVE = [35, 60, 85, 50, 95, 65, 40, 75, 90, 55, 30, 70, 88, 45, 25, 60];
const REQUEST_ICONS = [Sparkles, Camera, MapPin, CalendarDays];

/**
 * Illustration de la dictée du devis (F-19, valeurs d'exemple) : la phrase dictée, puis les lignes
 * de devis qu'en tire MENAO. Décorative : le texte de la carte décrit la fonctionnalité.
 */
export function VoiceQuoteVisual() {
  const v = t.voice;
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="rounded-card bg-[linear-gradient(150deg,#0b1438_0%,#1a2b85_100%)] p-4 text-white shadow-raised">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 animate-menao-pulse items-center justify-center rounded-full bg-danger">
            <Mic className="size-4" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">
            {v.recording}
          </span>
          <span className="ml-auto flex h-7 items-center gap-[3px]">
            {WAVE.map((height, i) => (
              <span
                key={i}
                className="w-[3px] animate-menao-wave rounded-full bg-white/80"
                style={{ height: `${height}%`, animationDelay: `${-i * 0.11}s` }}
              />
            ))}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/90">{v.transcript}</p>
      </div>
      <span className="flex size-8 items-center justify-center self-center rounded-full bg-primary text-primary-foreground shadow-raised">
        <Sparkles className="size-4" />
      </span>
      <div className="rounded-card border border-border bg-surface p-4 shadow-card">
        <ul className="flex flex-col gap-2.5 text-sm">
          {v.lines.map((line) => (
            <li key={line.label} className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1">{line.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{line.qty}</span>
              <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                {line.amount}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{v.totalLabel}</span>
          <span className="text-base font-medium tabular-nums">{v.total}</span>
        </p>
      </div>
    </div>
  );
}

/** Ce que l'artisan voit d'une demande avant de l'accepter (liste lisible, icônes décoratives). */
export function RequestChecklist() {
  return (
    <ul className="flex flex-col gap-2">
      {t.request.checks.map((check, i) => {
        const Icon = REQUEST_ICONS[i] ?? Sparkles;
        return (
          <li
            key={check}
            className="flex items-center gap-3 rounded-input bg-surface px-3 py-2.5 text-sm font-medium shadow-card"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            {check}
            <CircleCheck aria-hidden="true" className="ml-auto size-4 shrink-0 text-success" />
          </li>
        );
      })}
    </ul>
  );
}
