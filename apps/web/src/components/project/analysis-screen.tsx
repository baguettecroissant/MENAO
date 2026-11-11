"use client";

import { highlightParts } from "@menao/core";
import {
  BrickWall,
  Check,
  Clock,
  Flame,
  Hammer,
  type LucideIcon,
  MapPin,
  PaintRoller,
  Siren,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.search;
const a = fr.search.analysis;

/** Ce qui a déjà été compris pendant la saisie (ADR 0179), affiché sans attendre l'analyse. */
export type AnalysisUnderstanding = {
  trade: string | null;
  city: string | null;
  timing: string | null;
};

/** Rythme des étapes et des « Le saviez-vous ? » (millisecondes). */
const STEP_MS = 1500;
const FACT_MS = 4500;
/** Les quatre étapes de l'analyse ; la dernière reste en cours jusqu'à la réponse. */
const ANALYSIS_STEPS = ["read", "trade", "place", "criteria"] as const;

/** Métiers en orbite autour du logo : plomberie, électricité, peinture, menuiserie, chauffage, maçonnerie. */
const TRADES: LucideIcon[] = [Wrench, Zap, PaintRoller, Hammer, Flame, BrickWall];

/** Logo MENAO qui se dessine : le toit, puis le sourire (mêmes tracés que LogoMark). */
function DrawnMark() {
  const id = useId();
  return (
    <svg viewBox="0 0 32 28" fill="none" aria-hidden="true" className="size-14">
      <defs>
        <linearGradient id={id} x1="16" y1="2" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#86a0fb" />
          <stop offset="1" stopColor="#4869f6" />
        </linearGradient>
      </defs>
      <path
        d="M9.5 10.5 16 5.5l6.5 5"
        pathLength={1}
        stroke={`url(#${id})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-menao-draw"
      />
      <path
        d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
        pathLength={1}
        stroke={`url(#${id})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        className="animate-menao-draw [animation-delay:450ms]"
      />
    </svg>
  );
}

/** Illustration : halo, ondes qui se propagent, métiers en orbite, logo au centre. */
function AnalysisVisual() {
  return (
    <div aria-hidden="true" className="relative size-56 shrink-0 sm:size-72">
      <span className="absolute inset-[22%] animate-menao-pulse rounded-full bg-primary/20 blur-2xl" />
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute inset-0 m-auto size-28 animate-menao-ripple rounded-full border border-primary/30 bg-primary/10"
          style={{ animationDelay: `${i * 0.8}s` }}
        />
      ))}
      <span className="absolute inset-[11%] rounded-full border border-dashed border-primary/25" />
      <div className="absolute inset-0 animate-menao-orbit">
        {TRADES.map((Icon, i) => {
          const angle = (i / TRADES.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + 39 * Math.cos(angle)}%`,
                top: `${50 + 39 * Math.sin(angle)}%`,
              }}
            >
              <span className="block animate-menao-orbit-reverse">
                <span
                  className="block animate-menao-float"
                  style={{ animationDelay: `${i * -0.9}s`, animationDuration: "3.6s" }}
                >
                  <span
                    className="flex size-11 animate-menao-pop items-center justify-center rounded-full bg-surface text-primary-strong shadow-raised ring-4 ring-primary-softer"
                    style={{ animationDelay: `${250 + i * 120}ms` }}
                  >
                    <Icon className="size-5" />
                  </span>
                </span>
              </span>
            </span>
          );
        })}
      </div>
      <span className="absolute inset-0 m-auto flex size-28 items-center justify-center rounded-full border-2 border-primary/20 bg-surface shadow-raised">
        <span className="animate-menao-pulse [animation-delay:1.4s]">
          <DrawnMark />
        </span>
      </span>
    </div>
  );
}

/** Une information comprise : pastille ronde, libellé, valeur (rouge pour l'urgence). */
function UnderstoodChip({
  icon: Icon,
  label,
  value,
  urgent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <li
      className={`inline-flex min-h-11 animate-menao-pop items-center gap-2 rounded-full border bg-surface py-1.5 pr-3.5 pl-2 ${
        urgent ? "border-danger" : "border-border"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
          urgent ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-strong"
        }`}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${urgent ? "text-danger" : "text-foreground"}`}>
        {value}
      </span>
    </li>
  );
}

/**
 * Écran « Analyse de votre projet en cours » (F-05, refonte F-128) : la description du particulier
 * avec les mots repérés, ce qui en est déjà compris, les étapes qui se cochent une à une, et des
 * faits sur MENAO qui défilent. Urgence : dite d'emblée. Sans animation pour les personnes qui ont
 * demandé moins de mouvement.
 */
export function AnalysisScreen({
  photos = false,
  text = "",
  understood = null,
  urgent = false,
  urgencyExcerpt = null,
}: {
  photos?: boolean;
  /** Description saisie, relue à l'écran avec les mots repérés. */
  text?: string;
  understood?: AnalysisUnderstanding | null;
  urgent?: boolean;
  /** Mots de la description qui disent l'urgence, surlignés en rouge. */
  urgencyExcerpt?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [fact, setFact] = useState(0);

  useEffect(() => {
    const steps = setInterval(
      () => setStep((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1)),
      STEP_MS,
    );
    const facts = setInterval(() => setFact((i) => (i + 1) % a.facts.length), FACT_MS);
    return () => {
      clearInterval(steps);
      clearInterval(facts);
    };
  }, []);

  const labels = [
    ...ANALYSIS_STEPS.map((key) => a.steps[key]),
    ...(photos ? [a.steps.photos] : []),
  ];
  // Envoi des photos : l'analyse est terminée, seule la dernière étape reste en cours.
  const current = photos ? labels.length - 1 : step;

  const quote = text.trim();
  const parts = highlightParts(quote, [
    { term: urgent ? urgencyExcerpt : null, tone: "urgent" as const },
    { term: understood?.trade, tone: "info" as const },
    { term: understood?.city, tone: "info" as const },
  ]);
  const timing = urgent ? t.urgency.button : (understood?.timing ?? null);
  const hasUnderstood = Boolean(understood?.trade || understood?.city || timing);

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-background px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_25rem] lg:content-center lg:items-center lg:gap-x-16 lg:gap-y-6">
        <div className="lg:col-start-2 lg:row-start-1 lg:justify-self-center">
          <AnalysisVisual />
        </div>

        <div className="flex w-full flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:gap-7">
          <p
            role="status"
            className="text-center text-[1.625rem] leading-[1.08] font-bold tracking-tight text-balance sm:text-[2rem] lg:text-left lg:text-[2.875rem]"
          >
            {photos ? t.uploadingPhotos : t.analyzing}
          </p>

          {quote && (
            <div className="hidden flex-col gap-2 rounded-card border border-border bg-surface px-5 py-4 shadow-card sm:flex">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {a.yourText}
              </p>
              <p className="line-clamp-5 text-[1.0625rem] leading-relaxed whitespace-pre-line text-foreground">
                {parts.map((part, i) =>
                  part.tone ? (
                    <mark
                      key={i}
                      className={`rounded-md px-1 py-px ${
                        part.tone === "urgent"
                          ? "bg-danger-soft text-danger"
                          : "bg-primary-soft text-primary-strong"
                      }`}
                    >
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
            </div>
          )}

          {hasUnderstood && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {a.understoodTitle}
              </p>
              <ul className="flex flex-wrap gap-2">
                {understood?.trade && (
                  <UnderstoodChip
                    icon={Wrench}
                    label={a.understood.trade}
                    value={understood.trade}
                  />
                )}
                {understood?.city && (
                  <UnderstoodChip
                    icon={MapPin}
                    label={a.understood.place}
                    value={understood.city}
                  />
                )}
                {timing && (
                  <UnderstoodChip
                    icon={urgent ? Siren : Clock}
                    label={a.understood.timing}
                    value={timing}
                    urgent={urgent}
                  />
                )}
                {!photos && (
                  <li
                    aria-hidden="true"
                    className="inline-flex min-h-11 animate-menao-pulse items-center rounded-full border border-dashed border-border-strong px-4 text-sm text-muted-foreground"
                  >
                    {a.pending}
                  </li>
                )}
              </ul>
            </div>
          )}

          <ol className="flex w-full flex-col gap-2.5 text-left lg:flex-row lg:gap-0">
            {labels.map((label, i) => {
              const state = i < current ? "done" : i === current ? "active" : "todo";
              return (
                <li
                  key={label}
                  className="flex items-center gap-3 text-sm lg:flex-1 lg:flex-col lg:items-stretch lg:gap-2.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 lg:size-7 ${
                        state === "done"
                          ? "bg-primary text-primary-foreground"
                          : state === "active"
                            ? "border-2 border-primary bg-primary-softer"
                            : "border border-border-strong bg-surface"
                      }`}
                    >
                      {state === "done" && <Check className="size-3.5 animate-menao-pop" />}
                      {state === "active" && (
                        <span className="size-2 animate-menao-pulse rounded-full bg-primary" />
                      )}
                    </span>
                    {i < labels.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`hidden h-[3px] flex-1 rounded-full transition-colors duration-300 lg:block ${
                          state === "done" ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}
                  </span>
                  <span
                    className={`lg:pr-3 lg:leading-snug ${
                      state === "active"
                        ? "font-semibold text-foreground"
                        : state === "done"
                          ? "text-muted-foreground"
                          : "text-subtle-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex w-full flex-col gap-3 lg:col-start-2 lg:row-start-2 lg:self-start">
          {urgent && (
            <p className="flex items-center gap-2.5 rounded-2xl bg-danger-soft px-3.5 py-3 text-sm leading-snug font-semibold text-danger">
              <Siren aria-hidden="true" className="size-[1.125rem] shrink-0" />
              {t.urgency.searching}
            </p>
          )}
          <div className="w-full rounded-card border border-border bg-surface px-5 py-4 text-left shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary-strong">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {a.factsTitle}
            </p>
            <p key={fact} className="mt-1 animate-menao-fade-up text-sm text-foreground">
              {a.facts[fact]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
