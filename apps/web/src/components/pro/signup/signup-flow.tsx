"use client";

import {
  ARTISAN_SIGNUP_STEPS,
  firstOpenSignupStep,
  signupStepDone,
  type ArtisanSignupStep,
  type OAuthProvider,
} from "@menao/core";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { useSignupDraft } from "@/lib/artisan/signup-draft";
import { AccountStep, type OAuthIdentity } from "./account-step";
import { CodeStep } from "./code-step";
import { CompanyStep } from "./company-step";
import { TradesStep, type SignupTrade } from "./trades-step";
import { ZoneStep } from "./zone-step";

const t = fr.pro.signUp;

type Screen = "intro" | ArtisanSignupStep | "code";

const noSubscribe = () => () => {};

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
  // Arrivée depuis la page d'atterrissage des campagnes, métier déjà choisi (`?reprendre=1`,
  // ADR 0266) : le parcours reprend à la première étape non terminée, sans l'écran d'accueil.
  const resume = useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).has("reprendre"),
    () => false,
  );
  const screen: Screen =
    chosen ??
    (oauth || (resume && ready && signupStepDone("metiers", draft))
      ? firstOpenSignupStep(draft)
      : "intro");
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

  return (
    <div className="flex flex-1">
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Refonte « Nette » (ADR 0254) : accueil sur deux colonnes ; étapes en colonne, avec à
            droite (grand écran) la confiance et l'avancement. */}
        <div
          className={`mx-auto flex w-full flex-1 gap-12 px-4 pt-4 sm:px-6 ${
            screen === "intro" ? "max-w-6xl" : "max-w-5xl"
          }`}
        >
          <div className={`flex min-w-0 flex-1 flex-col ${screen === "intro" ? "" : "max-w-xl"}`}>
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
                      className="flex gap-1.5"
                    >
                      {steps.map((step, i) => (
                        <span
                          key={step}
                          className={`h-1.5 flex-1 rounded-pill transition-colors duration-300 ${
                            i <= index ? "bg-foreground" : "bg-border"
                          }`}
                        />
                      ))}
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
          {screen !== "intro" && (
            <aside className="sticky top-6 mt-16 hidden w-72 shrink-0 flex-col gap-4 self-start rounded-card border border-border bg-surface p-5 shadow-card lg:flex">
              <span className="flex size-10 items-center justify-center rounded-input bg-success-soft text-success">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <p className="text-sm leading-relaxed text-label">{t.intro.trust}</p>
              <ol className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                {ARTISAN_SIGNUP_STEPS.map((step) => {
                  const done = signupStepDone(step, draft);
                  return (
                    <li
                      key={step}
                      aria-current={screen === step ? "step" : undefined}
                      className={`flex items-center gap-2 ${
                        screen === step ? "font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      <Check
                        aria-hidden="true"
                        className={`size-4 shrink-0 ${done ? "text-success" : "text-border-strong"}`}
                      />
                      {t.asideSteps[step]}
                    </li>
                  );
                })}
              </ol>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

function Intro({ started, onStart }: { started: boolean; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-x-16 lg:gap-y-8 lg:pt-10 lg:[grid-template-areas:'head_card'_'body_card']">
      <div className="flex flex-col gap-4 lg:[grid-area:head]">
        <p className="self-start rounded-chip bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary-strong">
          {t.intro.eyebrow}
        </p>
        <h1 className="max-w-xl text-[2rem] leading-[1.05] sm:text-[2.75rem] lg:text-[3.25rem]">
          {t.intro.title}
        </h1>
      </div>
      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card lg:self-start lg:p-7 lg:[grid-area:card]">
        <h2 className="text-xl">{t.title}</h2>
        <p className="text-[0.9375rem] leading-relaxed text-label">{t.intro.lead}</p>
        <Button size="lg" onClick={onStart}>
          {started ? t.intro.resume : t.intro.start}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
        <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
          <p>
            {t.intro.haveAccount} <TextLink href="/connexion">{t.intro.signIn}</TextLink>
          </p>
          <p className="text-muted-foreground">
            {t.intro.isParticulier}{" "}
            <TextLink href="/inscription">{t.intro.particulierLink}</TextLink>
          </p>
        </div>
      </section>
      <div className="flex flex-col gap-6 lg:[grid-area:body]">
        <Phases current={0} />
        <p className="flex max-w-xl items-start gap-3 rounded-card border border-border bg-surface p-4 text-[0.9375rem] leading-relaxed text-label">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-success-soft text-success">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          {t.intro.trust}
        </p>
      </div>
    </div>
  );
}

/** Les trois temps de l'inscription, numérotés ; `current` : 0 avant de commencer. */
function Phases({ current }: { current: number }) {
  return (
    <ol className="flex flex-col gap-5">
      {t.intro.phases.map((phase, i) => {
        const n = i + 1;
        const first = i === 0;
        return (
          <li
            key={phase.title}
            aria-current={n === current ? "step" : undefined}
            className="flex items-start gap-4"
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full border font-display font-bold ${
                first
                  ? "border-foreground bg-foreground text-white"
                  : "border-border-strong bg-surface text-foreground"
              }`}
            >
              {n}
            </span>
            <span className="flex flex-col gap-0.5 pt-1.5">
              <span className="text-[1.0625rem] font-bold">{phase.title}</span>
              <span className="text-[0.9375rem] text-label">{phase.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
