"use client";

import {
  CHARTER_RULES,
  CHARTER_SECTIONS,
  CHARTER_TEXT,
  CHARTER_VERSION,
  ENGAGEMENT_TEXT,
  ENGAGEMENT_VERSION,
} from "@menao/core";
import { ArrowDown, ArrowLeft, ArrowRight, Check, Hand, ListChecks, Pencil } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CHARTER_TOTAL,
  CharterHero,
  CheerSection,
  EngagementBlock,
  PrincipleCard,
  PromisesSection,
  SectionExtras,
  SectionHeader,
  SectionIcon,
} from "@/components/pro/charter/charter-parts";
import { GuideBar, GuideBarSpace } from "@/components/pro/guide-bar";
import { HelpVideo } from "@/components/pro/help-video";
import { Button, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { acceptCharter, type CharterDestination } from "@/lib/artisan/charter-actions";
import { SignaturePad } from "./signature-pad";

const t = fr.pro.onboarding.charter;
const T = CHARTER_TEXT;
const PARTS = CHARTER_SECTIONS.length;
// Après les parties de la charte : ce que MENAO promet, l'engagement, la signature.
const PROMISES = PARTS;
const ENGAGEMENT = PARTS + 1;
const SIGNATURE = PARTS + 2;
const SCREENS = PARTS + 3;
const shortTitle = (title: string) => title.split(" :")[0] ?? title;
const SCREEN_NAMES = [
  ...CHARTER_SECTIONS.map((section) => shortTitle(section.title)),
  t.promisesShort,
  t.engagementShort,
  t.signatureShort,
];
const siretDigits = (value: string) => value.replace(/\s/g, "");
const siretValid = (value: string) => /^\d{14}$/.test(siretDigits(value));

const inputClass =
  "min-h-12 w-full min-w-0 rounded-input border-[1.5px] border-border bg-surface px-3 py-2.5 font-medium focus:border-primary focus:outline-none";

/**
 * Charte qualité à lire et signer (ADR 0104), une partie par écran (ADR 0373) : le texte de la
 * charte V5 est inchangé, l'artisan accepte chaque partie avec le bouton du bas, qui fait d'abord
 * défiler jusqu'à la dernière règle. Suivent ce que MENAO promet, l'engagement de l'artisan
 * (ADR 0117), puis la signature avec son nom, son entreprise, son SIRET et un tracé. Les
 * 25 numéros de règles sont envoyés avec la signature ; la base refait les contrôles.
 */
export function CharterForm({
  defaults,
  destination = "onboarding",
}: {
  defaults: { name: string; company: string; siret: string };
  /** Inscription pro, ou espace pro pour un artisan déjà inscrit (ADR 0109). */
  destination?: CharterDestination;
}) {
  const [state, action, pending] = useActionState(
    acceptCharter.bind(null, destination),
    initialFormState,
  );
  const [screen, setScreen] = useState(0);
  // Parties acceptées, dans l'ordre : les règles des `accepted` premières parties.
  const [accepted, setAccepted] = useState(0);
  const [engagement, setEngagement] = useState(false);
  const [name, setName] = useState(defaults.name);
  const [company, setCompany] = useState(defaults.company);
  const [siret, setSiret] = useState(defaults.siret);
  // Nom, entreprise et SIRET déjà connus : un récapitulatif, « Modifier » rouvre les champs.
  const [editing, setEditing] = useState(
    !defaults.name.trim() || !defaults.company.trim() || !siretValid(defaults.siret),
  );
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  // Fin de l'écran atteinte : « Lire la suite » devient le bouton qui accepte.
  const [atEnd, setAtEnd] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = end.current;
    if (!target) return;
    // La barre du bas couvre le pied de l'écran : la fin doit en dépasser pour compter.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setAtEnd(true);
      },
      { rootMargin: "0px 0px -140px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [screen]);

  function go(next: number) {
    setAtEnd(false);
    setClientError(null);
    // Le tracé ne survit pas au changement d'écran : il sera refait.
    if (screen === SIGNATURE) setSignature("");
    setScreen(next);
    window.scrollTo({ top: 0 });
    top.current?.focus({ preventScroll: true });
  }

  const section = CHARTER_SECTIONS[screen];
  const sectionAccepted = screen < accepted;
  const nextName = SCREEN_NAMES[screen + 1];
  const reading = screen <= ENGAGEMENT && !atEnd && !sectionAccepted;

  function advance() {
    if (reading) {
      window.scrollBy({ top: window.innerHeight * 0.7, behavior: "smooth" });
      return;
    }
    if (screen < PARTS) setAccepted((n) => Math.max(n, screen + 1));
    if (screen === ENGAGEMENT) setEngagement(true);
    go(screen + 1);
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    const missing: string[] = [];
    if (accepted < PARTS)
      missing.push(
        t.missing.rules(CHARTER_SECTIONS.slice(accepted).flatMap((s) => s.rules).length),
      );
    if (!name.trim()) missing.push(t.missing.name);
    if (!company.trim()) missing.push(t.missing.company);
    if (!siretValid(siret)) missing.push(t.missing.siret);
    if (!signature) missing.push(t.missing.signature);
    if (!engagement) missing.push(t.missing.engagement);
    if (!agree) missing.push(t.missing.agree);
    if (missing.length) {
      event.preventDefault();
      setClientError(`${t.missingPrefix}${missing.join(", ")}.`);
      if (!name.trim() || !company.trim() || !siretValid(siret)) setEditing(true);
      return;
    }
    setClientError(null);
  }

  const error = clientError ?? state.error;
  const back =
    screen > 0 ? (
      <Button type="button" variant="secondary" block={false} onClick={() => go(screen - 1)}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Button>
    ) : undefined;

  const header = (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        {screen > 0 ? (
          <button
            type="button"
            onClick={() => go(screen - 1)}
            aria-label={t.previousPart}
            className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-colors hover:bg-primary-soft/70 ${focusRing}`}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
        ) : (
          destination === "onboarding" && (
            <Link
              href="/pro/onboarding"
              aria-label={fr.pro.onboarding.guide.dossier}
              className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong transition-colors hover:bg-primary-soft/70 ${focusRing}`}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
          )
        )}
        <div
          role="progressbar"
          aria-label={t.partsLabel}
          aria-valuemin={1}
          aria-valuemax={SCREENS}
          aria-valuenow={screen + 1}
          className="flex min-w-0 flex-1 gap-1.5"
        >
          {SCREEN_NAMES.map((label, i) => (
            <span
              key={label}
              className={`h-1.5 flex-1 rounded-pill ${
                i <= screen ? "bg-foreground" : "bg-border-strong/60"
              }`}
            />
          ))}
        </div>
        {destination === "onboarding" && screen > 0 && (
          <Link
            href="/pro/onboarding"
            className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-sm text-sm font-semibold text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
          >
            <ListChecks aria-hidden="true" className="size-4" />
            {fr.pro.onboarding.guide.dossier}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 text-[0.8125rem] font-semibold text-muted-foreground">
        <span>{t.part(screen + 1, SCREENS, SCREEN_NAMES[screen] ?? "")}</span>
        <span>{t.partTag}</span>
      </div>
    </div>
  );

  const nextNote = nextName ? t.nextPart(nextName) : undefined;

  return (
    <div ref={top} tabIndex={-1} className="flex flex-col gap-5 outline-none">
      {header}

      {section && (
        <>
          {screen === 0 && (
            <>
              <CharterHero howTo={t.howToParts} />
              {destination === "onboarding" && (
                <div className="max-w-md">
                  <HelpVideo id="v04-charte" />
                </div>
              )}
              <PrincipleCard />
            </>
          )}
          <section
            id={section.id}
            aria-labelledby={`h-${section.id}`}
            className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
          >
            <SectionHeader
              section={section}
              index={screen}
              state={
                sectionAccepted ? (
                  <span className="rounded-pill bg-success-soft px-2.5 py-1 text-xs font-bold whitespace-nowrap text-success">
                    {t.validated}
                  </span>
                ) : undefined
              }
            />
            <SectionExtras section={section} />
            <ul className="mt-3.5 flex flex-col gap-2">
              {section.rules.map((rule, ri) => (
                <li
                  key={rule.title}
                  className={`flex flex-col gap-1 rounded-input border-[1.5px] p-3 ${
                    sectionAccepted ? "border-foreground bg-background" : "border-border bg-surface"
                  }`}
                >
                  <RuleLine
                    code={`R${screen + 1}.${ri + 1}`}
                    title={rule.title}
                    tag={rule.tag}
                    accepted={sectionAccepted}
                  />
                  <span className="text-sm text-muted-foreground">{rule.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {screen === PROMISES && (
        <>
          <PromisesSection index={PARTS + 1} />
          <CheerSection />
        </>
      )}

      {screen === ENGAGEMENT && <EngagementBlock />}

      {screen < SIGNATURE && (
        <>
          <div ref={end} aria-hidden="true" className="h-px" />
          <GuideBar back={back} note={reading ? undefined : nextNote}>
            <Button
              type="button"
              size="lg"
              variant={reading ? "outline" : "primary"}
              onClick={advance}
              className="h-auto py-2.5 text-balance"
            >
              {reading ? (
                <>
                  {t.readMore}
                  <ArrowDown aria-hidden="true" className="size-5" />
                </>
              ) : (
                <>
                  {screen === ENGAGEMENT
                    ? ENGAGEMENT_TEXT.agreeTitle
                    : section && !sectionAccepted
                      ? t.acceptRules(section.rules.length)
                      : t.continueReading}
                  {screen !== ENGAGEMENT && <ArrowRight aria-hidden="true" className="size-5" />}
                </>
              )}
            </Button>
          </GuideBar>
        </>
      )}

      {screen === SIGNATURE && (
        <form
          id="signature"
          action={action}
          onSubmit={validate}
          aria-labelledby="h-sig"
          className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
          noValidate
        >
          <div className="flex items-start gap-3.5">
            <SectionIcon icon={Hand} />
            <div>
              <h2 id="h-sig" className="text-xl font-bold tracking-tight">
                {T.signatureTitle}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{T.signatureWhy}</p>
            </div>
          </div>
          <input type="hidden" name="version" value={CHARTER_VERSION} />
          {CHARTER_RULES.filter((rule) => Number(rule.code.slice(1).split(".")[0]) <= accepted).map(
            (rule) => (
              <input key={rule.code} type="hidden" name="rule" value={rule.code} />
            ),
          )}
          <input type="hidden" name="signature" value={signature} />
          {agree && <input type="hidden" name="agree" value="on" />}
          <input type="hidden" name="engagementVersion" value={ENGAGEMENT_VERSION} />
          {engagement && <input type="hidden" name="engagement" value="on" />}
          {editing ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                {t.name}
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                {t.company}
                <input
                  name="company"
                  type="text"
                  autoComplete="organization"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t.companyPlaceholder}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                {t.siret}
                <input
                  name="siret"
                  type="text"
                  inputMode="numeric"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder={t.siretPlaceholder}
                  className={inputClass}
                />
              </label>
            </div>
          ) : (
            <div
              role="group"
              aria-label={t.signer}
              className="flex items-center gap-3 rounded-input border-[1.5px] border-border bg-background px-3.5 py-3"
            >
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="company" value={company} />
              <input type="hidden" name="siret" value={siret} />
              <span className="flex min-w-0 flex-1 flex-col">
                <b>{name}</b>
                <span className="text-sm text-muted-foreground">
                  {company} · {t.recap.siret} {siretDigits(siret)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-sm text-sm font-bold text-primary-strong hover:underline ${focusRing}`}
              >
                <Pencil aria-hidden="true" className="size-4" />
                {t.edit}
              </button>
            </div>
          )}
          <SignaturePad onChange={setSignature} />
          <CheckButton checked={agree} onToggle={() => setAgree((v) => !v)}>
            <b>{T.agreeTitle}</b>
            <span className="text-sm text-muted-foreground">{T.agreeText}</span>
          </CheckButton>
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
          <GuideBar back={back}>
            <Button type="submit" size="lg" disabled={pending}>
              {t.submit}
              <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.4} />
            </Button>
          </GuideBar>
        </form>
      )}

      <GuideBarSpace />
      <p className="sr-only" aria-live="polite">
        {t.progressCount(
          CHARTER_SECTIONS.slice(0, accepted).flatMap((s) => s.rules).length,
          CHARTER_TOTAL,
        )}
      </p>
    </div>
  );
}

/** Numéro, titre et étiquette d'une règle ; le numéro passe au sombre une fois la partie acceptée. */
function RuleLine({
  code,
  title,
  tag,
  accepted,
}: {
  code: string;
  title: string;
  tag?: string;
  accepted: boolean;
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span
        className={`flex h-6 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-xs font-extrabold tabular-nums ${
          accepted ? "bg-foreground text-white" : "bg-primary-soft text-primary-strong"
        }`}
      >
        {accepted && <Check aria-hidden="true" className="size-3" strokeWidth={3.4} />}
        {code}
      </span>
      <b className="leading-snug">
        {title}
        {tag && (
          <span className="ml-1.5 inline-block rounded-md bg-warning-soft px-2 py-0.5 align-[1px] text-xs font-bold text-warning">
            {tag}
          </span>
        )}
      </b>
    </span>
  );
}

/** Case à cocher de la signature (acceptation de la charte). */
function CheckButton({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-input border-[1.5px] p-3 text-left ${
        checked
          ? "border-foreground bg-background"
          : "border-border bg-surface hover:border-primary/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 ${
          checked ? "border-foreground bg-foreground" : "border-[#a9b0c6] bg-surface"
        }`}
      >
        {checked && <Check className="size-4 text-white" strokeWidth={3.2} />}
      </span>
      <span className="flex flex-col gap-1">{children}</span>
    </button>
  );
}
