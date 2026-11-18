import {
  attestationsProgress,
  guideSendSteps,
  guideStepPath,
  nextGuideStep,
  type GuideStep,
  type GuideStepKey,
} from "@menao/core";
import { ArrowRight, Check, ChevronDown, ChevronRight, Eye, Lock, Plus, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { GuideBar, GuideBarSpace } from "@/components/pro/guide-bar";
import { HelpVideo } from "@/components/pro/help-video";
import { Alert, ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { OnboardingContext } from "@/lib/artisan/context";
import { guideFromContext, suiteHref } from "@/lib/artisan/guide";
import { SubmitOnboarding } from "./submit-onboarding";

const t = fr.pro.onboarding;
const g = t.guide;
const p = g.path;

/**
 * « Mon inscription » (lot 73, ADR 0376) : un seul parcours jusqu'à la mise en ligne. Une liste
 * dans l'ordre des étapes (faites, prochaine en avant, à venir), un seul compteur, et en bas le
 * même bouton que dans les étapes. Le dossier part à l'équipe tout seul dès la charte, la pièce
 * d'identité et la fiche faites ; « Renvoyer » n'apparaît qu'après un refus ou une demande de
 * compléments.
 */
export function InscriptionPath({ context }: { context: OnboardingContext }) {
  const { artisan, snapshot, documents, canSubmit } = context;
  const guide = guideFromContext(context);
  const steps = guide.steps;
  const next = nextGuideStep(steps);
  const done = steps.filter((step) => step.done).length;
  const left = steps.length - done;
  const sent = artisan.status === "en_verification";
  // Après la dernière étape de l'envoi : la ligne « Dossier transmis ».
  const lastSendKey = guideSendSteps(steps).at(-1)?.key;
  const attestations = attestationsProgress(snapshot);
  const kbisFromRegistry = documents.some(
    (doc) => doc.type === "kbis" && doc.source === "registre" && doc.status === "valide",
  );
  const editable = artisan.status === "brouillon" || artisan.status === "refuse";
  const companyName = artisan.nom_commercial ?? artisan.raison_sociale;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      {artisan.status === "refuse" && (
        <Alert tone="error">{t.status.refuse(artisan.refusal_reason)}</Alert>
      )}
      {/* Après un refus ou une demande de compléments, ou pour un dossier déjà prêt : l'artisan
          renvoie lui-même son dossier. */}
      {editable && canSubmit && (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">{p.resendTitle}</p>
          <SubmitOnboarding label={p.resend} />
        </section>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
          <b>{p.counter(done, steps.length)}</b>
          {guide.minutesLeft > 0 && (
            <span className="font-semibold text-muted-foreground">{p.left(guide.minutesLeft)}</span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={g.progressLabel}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          className="flex gap-1.5"
        >
          {steps.map((step, i) => (
            <span
              key={step.key}
              className={`h-1.5 flex-1 rounded-pill ${i < done ? "bg-success" : "bg-border-strong/60"}`}
            />
          ))}
        </div>
      </div>

      <ol className="flex flex-col rounded-card border border-border bg-surface px-4 py-1.5 shadow-card sm:px-6">
        {/* Entreprise, métiers et zone faits à l'inscription : une ligne, pour les modifier. */}
        {!steps.some((step) => step.key === "entreprise") && (
          <li className="border-b border-border">
            <DoneRow
              href="/pro/onboarding/entreprise"
              title={p.company}
              hint={[companyName, kbisFromRegistry ? p.kbisRegistry : null]
                .filter(Boolean)
                .join(" · ")}
              action={p.modify}
            />
          </li>
        )}
        {steps.map((step, i) => {
          const texts = p.steps[step.key];
          const title = `${i + 1} · ${texts.title}`;
          const hint =
            step.key === "attestations" && !step.done && attestations.done > 0
              ? p.count(attestations.done, attestations.total)
              : step.done
                ? texts.done
                : texts.todo;
          return (
            <li key={step.key} className="border-b border-border last:border-b-0">
              {step.done ? (
                <DoneRow
                  href={guideStepPath(step.key)}
                  title={title}
                  hint={hint}
                  action={step.key === "charte" ? p.reread : p.modify}
                />
              ) : step.key === next ? (
                <CurrentRow step={step} index={i + 1} title={texts.title} hint={hint} />
              ) : (
                <TodoRow step={step} index={i + 1} title={texts.title} hint={hint} />
              )}
              {sent && step.key === lastSendKey && (
                <p className="mb-2 flex items-center gap-2.5 rounded-input bg-success-soft px-3.5 py-2.5 text-sm font-semibold text-success">
                  <Send aria-hidden="true" className="size-4 shrink-0" />
                  {p.sent}
                </p>
              )}
            </li>
          );
        })}
        <li className="flex items-center gap-3.5 py-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
            <Eye aria-hidden="true" className="size-3.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-muted-foreground">
            <span className="font-semibold">{p.online}</span>
            <span className="text-sm">{p.onlineHint}</span>
          </span>
          <Lock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </li>
      </ol>

      {/* Dossier envoyé : l'espace rempli d'exemples, en attendant la validation (ADR 0184). */}
      {sent && next && (
        <section className="flex flex-col gap-3 rounded-card border border-example/25 bg-example-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1 text-example-strong">
            <h2 className="font-semibold">{fr.pro.examples.onboardingCard.title}</h2>
            <p className="text-sm">{fr.pro.examples.onboardingCard.text}</p>
          </div>
          <Link
            href="/pro/decouvrir/tableau-de-bord"
            className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-pill bg-example px-5 text-[0.9375rem] font-semibold text-primary-foreground hover:bg-example-strong focus-visible:ring-4 focus-visible:ring-example/30 focus-visible:outline-none"
          >
            {fr.pro.examples.onboardingCard.open}
          </Link>
        </section>
      )}

      {/* Facultatif, replié : rien ici ne retarde l'inscription (ADR 0354). */}
      <details className="group rounded-card border border-border bg-surface">
        <summary
          className={`flex min-h-touch cursor-pointer list-none items-center gap-2.5 rounded-card px-4 py-3 [&::-webkit-details-marker]:hidden ${focusRing}`}
        >
          <Plus aria-hidden="true" className="size-4 shrink-0 text-primary-strong" />
          <span className="min-w-0 flex-1 text-[0.9375rem]">
            <b className="font-semibold">{p.extras}</b>{" "}
            <span className="text-muted-foreground">· {p.extrasHint}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {(
            [
              ["/pro/onboarding/profil#image", t.dossier.extras.logoTitle],
              ["/pro/onboarding/metiers", t.dossier.extras.skillsTitle],
              ["/pro/onboarding/metiers#certif-titre", t.dossier.extras.certsTitle],
              ["/pro/onboarding/metiers", t.dossier.extras.budgetTitle],
            ] as const
          ).map(([href, label]) => (
            <li key={label}>
              <Link
                href={href as Route}
                className={`flex min-h-touch items-center justify-between gap-3 px-4 py-2.5 text-[0.9375rem] font-semibold hover:bg-background ${focusRing}`}
              >
                {label}
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </details>

      {/* Tant qu'aucune pièce n'est déposée : la vidéo de présentation (ADR 0349). */}
      {editable && documents.every((doc) => doc.source === "registre") && (
        <HelpVideo id="v01-inscription" />
      )}
      <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t.dossier.privacy} {t.dossier.nextHint}
      </p>

      <GuideBarSpace />
      <GuideBar note={next ? p.barLeft(left) : p.barDone}>
        {next ? (
          <ButtonLink href={suiteHref()} size="lg" block>
            {p.continueWith(g.nextNames[next])}
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
        ) : (
          // Tout est fait de son côté : l'espace rempli d'exemples, en attendant (ADR 0184).
          <ButtonLink href="/pro/decouvrir/tableau-de-bord" size="lg" block>
            {fr.pro.examples.onboardingCard.open}
            <ArrowRight aria-hidden="true" className="size-5" />
          </ButtonLink>
        )}
      </GuideBar>
    </div>
  );
}

function DoneRow({
  href,
  title,
  hint,
  action,
}: {
  href: string;
  title: string;
  hint: string;
  action: string;
}) {
  return (
    <Link
      href={href as Route}
      className={`-mx-2 flex items-center gap-3.5 rounded-input px-2 py-3 hover:bg-background ${focusRing}`}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check aria-hidden="true" className="size-4" strokeWidth={3} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-primary-strong">{action}</span>
    </Link>
  );
}

function TodoRow({
  step,
  index,
  title,
  hint,
}: {
  step: GuideStep;
  index: number;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={guideStepPath(step.key) as Route}
      className={`-mx-2 flex items-center gap-3.5 rounded-input px-2 py-3 hover:bg-background ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong text-[0.8125rem] font-bold text-muted-foreground"
      >
        {index}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
      <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:block">
        {t.dossier.minutes(Math.ceil(step.seconds / 60))}
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** La prochaine étape, mise en avant : c'est elle que le bouton du bas ouvre. */
function CurrentRow({
  step,
  index,
  title,
  hint,
}: {
  step: GuideStep;
  index: number;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={guideStepPath(step.key satisfies GuideStepKey) as Route}
      aria-current="step"
      className={`-mx-2 my-1.5 flex items-center gap-3.5 rounded-card border-[1.5px] border-primary/40 bg-primary-soft px-3 py-3.5 sm:-mx-3 ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[0.8125rem] font-bold text-primary-foreground"
      >
        {index}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.6875rem] font-bold tracking-wider text-primary-strong uppercase">
          {p.current(Math.ceil(step.seconds / 60))}
        </span>
        <span className="text-base font-bold">{title}</span>
        <span className="text-sm text-label">{hint}</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
    </Link>
  );
}
