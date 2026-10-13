"use client";

import {
  BrickWall,
  Check,
  Flame,
  Hammer,
  type LucideIcon,
  PaintRoller,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { fr } from "@/i18n/fr";

const t = fr.search;
const a = fr.search.analysis;

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
    <div aria-hidden="true" className="relative size-64 shrink-0 sm:size-72">
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

/**
 * Écran « Analyse de votre projet en cours » (F-05) : le logo se dessine au milieu des métiers, les
 * étapes de l'analyse se cochent une à une, et des faits sur MENAO défilent. Sans animation pour
 * les personnes qui ont demandé moins de mouvement.
 */
export function AnalysisScreen({ photos = false }: { photos?: boolean }) {
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

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-background px-6 py-8">
      <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center gap-6 text-center">
        <AnalysisVisual />
        <p role="status" className="text-2xl font-medium text-balance">
          {photos ? t.uploadingPhotos : t.analyzing}
        </p>
        <ol className="flex w-full flex-col gap-2.5 text-left">
          {labels.map((label, i) => {
            const state = i < current ? "done" : i === current ? "active" : "todo";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                    state === "done"
                      ? "bg-primary text-primary-foreground"
                      : state === "active"
                        ? "border-2 border-primary bg-primary-softer"
                        : "border border-border-strong"
                  }`}
                >
                  {state === "done" && <Check className="size-3.5 animate-menao-pop" />}
                  {state === "active" && (
                    <span className="size-2 animate-menao-pulse rounded-full bg-primary" />
                  )}
                </span>
                <span
                  className={
                    state === "active"
                      ? "font-medium text-foreground"
                      : state === "done"
                        ? "text-muted-foreground"
                        : "text-subtle-foreground"
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="w-full rounded-card border border-border bg-surface px-5 py-4 text-left shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary-strong">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {a.factsTitle}
          </p>
          <p key={fact} className="mt-1 animate-menao-fade-up text-sm text-foreground">
            {a.facts[fact]}
          </p>
        </div>
      </div>
    </div>
  );
}
