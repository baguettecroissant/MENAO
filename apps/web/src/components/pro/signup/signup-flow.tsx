"use client";

import {
  firstOpenSignupStep,
  signupStepDone,
  type ArtisanSignupStep,
  type OAuthProvider,
} from "@menao/core";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { useSignupDraft } from "@/lib/artisan/signup-draft";
import { AccountStep, type OAuthIdentity } from "./account-step";
import { CodeStep } from "./code-step";
import { CompanyStep } from "./company-step";
import { StepFooter } from "./signup-ui";
import { TradesStep, type SignupTrade } from "./trades-step";
import { ZoneStep } from "./zone-step";

const t = fr.pro.signUp;

type Screen = "intro" | ArtisanSignupStep | "code";

/**
 * Inscription artisan en un seul parcours (ADR 0110) : une question par écran, bouton principal
 * toujours visible, choix gardés dans le navigateur. Depuis Google ou Apple (`oauth`), le parcours
 * reprend à la première étape non terminée et se termine par la finalisation du compte.
 */
export function ArtisanSignupFlow({
  trades,
  providers,
  oauth,
}: {
  trades: SignupTrade[];
  providers: readonly OAuthProvider[];
  oauth?: OAuthIdentity;
}) {
  const { draft, update, ready } = useSignupDraft();
  const [chosen, setChosen] = useState<Screen | null>(null);
  const [codeEmail, setCodeEmail] = useState<string | null>(null);
  const focusTarget = useRef<HTMLDivElement>(null);
  const screen: Screen = chosen ?? (oauth ? firstOpenSignupStep(draft) : "intro");
  const steps: Screen[] = oauth
    ? ["metiers", "entreprise", "zone", "compte"]
    : ["metiers", "entreprise", "zone", "compte", "code"];
  const index = steps.indexOf(screen);
  const previous: Screen | null =
    screen === "intro" ? null : index > 0 ? (steps[index - 1] ?? null) : oauth ? null : "intro";

  // Nouvel écran : le lecteur d'écran et le clavier repartent du titre.
  useEffect(() => {
    if (chosen === null) return;
    window.scrollTo({ top: 0 });
    focusTarget.current?.focus({ preventScroll: true });
  }, [chosen]);

  const go = (next: Screen) => setChosen(next);
  const goNext = () => {
    const next = steps[index + 1];
    if (next) go(next);
  };

  // Depuis Google ou Apple, le brouillon n'est connu qu'une fois la page chargée.
  if (oauth && !ready) return <main className="flex-1" />;

  const started = signupStepDone("metiers", draft);
  const phase = screen === "intro" ? 0 : 1;

  return (
    <div className="flex flex-1">
      <aside className="hidden w-[26rem] shrink-0 flex-col gap-10 bg-primary px-11 py-12 text-primary-foreground lg:flex">
        <div className="flex flex-col gap-3">
          <p className="text-[1.75rem] leading-tight font-semibold tracking-tight">
            {t.intro.title}
          </p>
          <p className="leading-relaxed">{t.intro.lead}</p>
        </div>
        <Phases current={phase} inverse />
        <p className="mt-auto flex items-start gap-2.5 rounded-card bg-primary-strong p-4 text-sm leading-relaxed">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          {t.intro.trust}
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4">
          {screen !== "intro" && (
            <div className="flex flex-col gap-3">
              <div className="flex min-h-11 items-center">
                {previous && (
                  <button
                    type="button"
                    onClick={() => go(previous)}
                    aria-label={t.back}
                    className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-colors hover:bg-primary-soft/70 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                  >
                    <ArrowLeft aria-hidden="true" className="size-5" />
                  </button>
                )}
              </div>
              {index >= 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[0.8125rem] font-medium text-muted-foreground">
                    <span>{t.progressLabel}</span>
                    <span>{t.progress(index + 1, steps.length)}</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={t.progressLabel}
                    aria-valuemin={1}
                    aria-valuemax={steps.length}
                    aria-valuenow={index + 1}
                    className="h-1.5 overflow-hidden rounded-pill bg-primary-soft"
                  >
                    <div
                      className="h-full rounded-pill bg-primary transition-[width] duration-300"
                      style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            ref={focusTarget}
            tabIndex={-1}
            className="flex flex-1 flex-col gap-6 py-6 outline-none"
          >
            {screen === "intro" && (
              <Intro
                started={ready && started}
                onStart={() => go(started ? firstOpenSignupStep(draft) : "metiers")}
              />
            )}
            {screen === "metiers" && (
              <TradesStep
                trades={trades}
                selected={draft.tradeCodes}
                onChange={(tradeCodes) => update({ tradeCodes })}
                onNext={goNext}
              />
            )}
            {screen === "entreprise" && (
              <CompanyStep draft={draft} update={update} onNext={goNext} />
            )}
            {screen === "zone" && <ZoneStep draft={draft} update={update} onNext={goNext} />}
            {screen === "compte" && (
              <AccountStep
                draft={draft}
                providers={providers}
                oauth={oauth}
                onCodeSent={(email) => {
                  setCodeEmail(email);
                  go("code");
                }}
                onProfileInvalid={() => go(firstOpenSignupStep(draft))}
              />
            )}
            {screen === "code" && codeEmail && (
              <CodeStep email={codeEmail} onChangeEmail={() => go("compte")} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Intro({ started, onStart }: { started: boolean; onStart: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem] font-semibold tracking-wider text-primary-strong uppercase">
          {t.intro.eyebrow}
        </p>
        <h1 className="text-[1.875rem] leading-tight font-semibold tracking-tight">
          {t.intro.title}
        </h1>
        <p className="leading-relaxed text-muted-foreground">{t.intro.lead}</p>
      </div>
      <Phases current={0} />
      <p className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
        {t.intro.trust}
      </p>
      <div className="flex flex-col items-center gap-1 text-center text-sm">
        <p>
          {t.intro.haveAccount} <TextLink href="/connexion">{t.intro.signIn}</TextLink>
        </p>
        <p>
          {t.intro.isParticulier} <TextLink href="/inscription">{t.intro.particulierLink}</TextLink>
        </p>
      </div>
      <StepFooter>
        <Button size="lg" onClick={onStart}>
          {started ? t.intro.resume : t.intro.start}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}

/** Les trois temps de l'inscription ; `current` : 0 avant de commencer, puis 1, 2 ou 3. */
function Phases({ current, inverse = false }: { current: number; inverse?: boolean }) {
  return (
    <ol className="flex flex-col gap-3">
      {t.intro.phases.map((phase, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        const badge = inverse
          ? done || active
            ? "bg-surface text-primary-strong"
            : "bg-primary-foreground/20 text-primary-foreground"
          : "bg-primary-soft text-primary-strong";
        return (
          <li
            key={phase.title}
            aria-current={active ? "step" : undefined}
            className={`flex items-start gap-3.5 ${
              inverse ? "" : "rounded-card border border-border bg-surface p-4"
            }`}
          >
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${badge}`}
            >
              {done ? <Check aria-hidden="true" className="size-4" /> : n}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{phase.title}</span>
              <span
                className={`text-sm leading-snug ${inverse ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                {phase.text}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
