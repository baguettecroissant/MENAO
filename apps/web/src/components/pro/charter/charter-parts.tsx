import {
  CHARTER_LADDER,
  CHARTER_RULES,
  CHARTER_SCORE_WEIGHTS,
  CHARTER_SECTIONS,
  CHARTER_TEXT,
  ENGAGEMENT_DRAFT,
  ENGAGEMENT_TEXT,
  type CharterIcon,
  type CharterSection,
} from "@menao/core";
import {
  ArrowRight,
  Check,
  Clock,
  Flag,
  Hand,
  Handshake,
  Hash,
  Heart,
  ShieldCheck,
  Star,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";

/**
 * Éléments de la charte qualité (ADR 0104), d'après la maquette V5 : introduction, en-têtes de
 * section, bandeau des 72 h, score et challenge, procédure, engagements de MENAO, encouragement.
 * Sans état : utilisés par le formulaire de signature et par la relecture de la charte signée.
 */
const T = CHARTER_TEXT;
const t = fr.pro.onboarding.charter;

const ICONS: Record<CharterIcon, LucideIcon> = {
  clock: Clock,
  heart: Heart,
  tool: Wrench,
  shield: ShieldCheck,
  star: Star,
  flag: Flag,
};

export const CHARTER_TOTAL = CHARTER_RULES.length;

export function SectionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-input bg-primary-soft">
      <Icon aria-hidden="true" className="size-6 text-primary" strokeWidth={2} />
    </span>
  );
}

export function CharterHero() {
  return (
    <section className="flex flex-col gap-4 rounded-hero border border-border bg-surface p-6 sm:p-7">
      <span className="text-xs font-bold tracking-[0.06em] text-primary-strong uppercase">
        {T.eyebrow}
      </span>
      <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance">
        {T.title}
        <span className="text-primary">{T.titleAccent}</span>
      </h2>
      <p className="max-w-[62ch] text-muted-foreground">{T.lead}</p>
      <ol className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {T.journey.map((step, i) => (
          <li key={step.title} className="contents">
            {i > 0 && (
              <span aria-hidden="true" className="flex items-center justify-center text-primary">
                <ArrowRight className="size-5 rotate-90 md:rotate-0" strokeWidth={2.4} />
              </span>
            )}
            <div
              className={`relative flex flex-col gap-2 overflow-hidden rounded-card border p-4 ${
                i === 2
                  ? "border-transparent bg-[linear-gradient(160deg,#4869f6_0%,#7a93fa_100%)] text-white"
                  : i === 1
                    ? "border-primary-soft bg-[linear-gradient(160deg,#e7eeff_0%,#f3f6ff_100%)]"
                    : "border-primary-soft bg-[linear-gradient(160deg,#eef1fe_0%,#f8f9ff_100%)]"
              }`}
            >
              <span className="absolute top-3 right-3 rounded-pill bg-surface px-2 py-0.5 text-xs font-bold text-primary-strong shadow-card">
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-input bg-surface text-2xl shadow-card"
              >
                {step.emoji}
              </span>
              <b className="leading-snug">{step.title}</b>
              <span className={`text-sm ${i === 2 ? "text-white/90" : "text-muted-foreground"}`}>
                {step.text}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-2.5 rounded-input bg-primary-softer px-4 py-3 text-sm">
        <Hash aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <span>
          <b>{T.codeHintStrong}</b>
          {T.codeHintBefore}
          <b>{CHARTER_RULES[0]?.code}</b>
          {T.codeHintAfter}
        </span>
      </p>
      <p className="flex items-start gap-2.5 rounded-input bg-background px-4 py-3 text-sm text-muted-foreground">
        <Hand aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{T.howTo(CHARTER_TOTAL)}</span>
      </p>
    </section>
  );
}

export function PrincipleCard() {
  return (
    <div className="rounded-card border border-primary-soft bg-primary-softer p-4">
      <h3 className="font-semibold">{T.principleTitle}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{T.principle}</p>
    </div>
  );
}

export function SectionHeader({
  section,
  index,
  state,
}: {
  section: CharterSection;
  index: number;
  state?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3.5 sm:flex-nowrap">
      <SectionIcon icon={ICONS[section.icon]} />
      <div className="min-w-0 flex-1">
        <h2 id={`h-${section.id}`} className="text-xl font-bold tracking-tight">
          {index + 1}. {section.title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{section.why}</p>
      </div>
      {state}
    </div>
  );
}

export function KeyBanner() {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-card bg-[linear-gradient(135deg,#4869f6,#6f8bff)] p-5 text-white sm:flex-row sm:items-center sm:gap-4">
      <span className="text-5xl leading-none font-bold tracking-tight whitespace-nowrap">
        {T.keyBig}
      </span>
      <p className="text-sm text-white/95">{T.keyText}</p>
    </div>
  );
}

export function ScoreBlock() {
  return (
    <>
      <div aria-label={t.scoreLabel} className="mt-4 flex flex-col gap-2">
        <p className="text-sm font-bold">{T.scoreTitle}</p>
        {CHARTER_SCORE_WEIGHTS.map((w) => (
          <div
            key={w.key}
            className="grid grid-cols-[minmax(0,1fr)_120px_40px] items-center gap-2.5 text-sm"
          >
            <span>{w.label}</span>
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-primary-soft">
              <span className="block h-full bg-primary" style={{ width: `${w.weight * 2}%` }} />
            </span>
            <em className="text-right font-bold not-italic tabular-nums">{w.weight} %</em>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">
          {T.scoreNote}
          <b className="text-foreground">{T.scoreElite}</b>.
        </p>
      </div>
      <div className="mt-4 flex items-center gap-4 overflow-hidden rounded-card bg-[linear-gradient(135deg,#141a33_0%,#2b3a8c_100%)] p-5 text-white">
        <span aria-hidden="true" className="shrink-0 text-5xl leading-none">
          🏆
        </span>
        <div>
          <b className="text-lg">{T.challengeTitle}</b>
          <p className="mt-1 text-sm text-[#d8deff]">{T.challengeText}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {T.challengeChips.map((chip) => (
              <span key={chip} className="rounded-pill bg-white/15 px-2.5 py-1 text-xs font-bold">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const LADDER_TONES = {
  info: "bg-primary-softer",
  warning: "bg-warning-soft",
  orange: "bg-[#ffe3cc]",
  danger: "bg-danger-soft",
} as const;

export function Ladder() {
  return (
    <ol className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
      {CHARTER_LADDER.map((step) => (
        <li
          key={step.title}
          className={`flex flex-col gap-1 rounded-input p-3 text-sm ${LADDER_TONES[step.tone]}`}
        >
          <b>{step.title}</b>
          <span className="text-muted-foreground">{step.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Contenu propre à une section : bandeau des 72 h, score et challenge, procédure. */
export function SectionExtras({ section }: { section: CharterSection }) {
  return (
    <>
      {section.key && <KeyBanner />}
      {section.score && <ScoreBlock />}
      {section.ladder && <Ladder />}
    </>
  );
}

export function RuleContent({
  code,
  title,
  text,
  tag,
  checked,
}: {
  code: string;
  title: string;
  text: string;
  tag?: string;
  checked: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 ${
          checked ? "border-primary bg-primary" : "border-[#a9b0c6] bg-surface"
        }`}
      >
        {checked && <Check className="size-4 text-white" strokeWidth={3.2} />}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={`flex h-6 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-extrabold tabular-nums ${
              checked ? "bg-primary text-white" : "bg-primary-soft text-primary-strong"
            }`}
          >
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
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </>
  );
}

export function PromisesSection({ index }: { index: number }) {
  return (
    <section
      id="engagement"
      aria-labelledby="h-eng"
      className="scroll-mt-24 rounded-card border border-border bg-surface p-5"
    >
      <div className="flex items-start gap-3.5">
        <SectionIcon icon={Handshake} />
        <div>
          <h2 id="h-eng" className="text-xl font-bold tracking-tight">
            {index}. {T.promisesTitle}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{T.promisesWhy}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {T.promises.map((p) => (
          <li
            key={p.title}
            className="flex items-start gap-2.5 rounded-input bg-background p-3 text-sm"
          >
            <span aria-hidden="true" className="shrink-0 text-xl leading-tight">
              {p.emoji}
            </span>
            <span>
              <b>{p.title}</b>
              <br />
              {p.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Engagement de l'artisan (ADR 0117), signé avec la charte. `children` : la case à cocher du
 * formulaire de signature ; sans, la relecture de l'engagement signé.
 */
export function EngagementBlock({ children }: { children?: ReactNode }) {
  const E = ENGAGEMENT_TEXT;
  return (
    <div
      id="engagement-artisan"
      role="group"
      aria-labelledby="h-eng-artisan"
      className="flex scroll-mt-24 flex-col gap-3 rounded-input border-[1.5px] border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck aria-hidden="true" className="size-5 text-primary" strokeWidth={2.2} />
        <h3 id="h-eng-artisan" className="text-lg font-bold tracking-tight">
          {E.title}
        </h3>
        {ENGAGEMENT_DRAFT && (
          <span className="rounded-pill bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
            {E.draft}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{E.why}</p>
      <p className="text-sm font-semibold">{E.intro}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {E.items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={3}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export function CheerSection() {
  return (
    <section
      aria-labelledby="h-cheer"
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-hero bg-[linear-gradient(150deg,#4869f6_0%,#6c86fa_55%,#8ea2fc_100%)] p-6 text-white sm:p-7"
    >
      <span
        aria-hidden="true"
        className="absolute -top-28 -right-24 size-64 rounded-full bg-white/10"
      />
      <h2 id="h-cheer" className="relative text-2xl leading-tight font-bold">
        {T.cheerTitle}
      </h2>
      {T.cheer.map((p) => (
        <p key={p} className="relative max-w-[64ch] text-[#eef1ff]">
          {p}
        </p>
      ))}
      <div className="relative grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {T.cheerTrio.map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-2.5 rounded-card bg-white/15 px-3.5 py-3 font-bold"
          >
            <span aria-hidden="true" className="text-xl">
              {item.emoji}
            </span>
            {item.text}
          </div>
        ))}
      </div>
      <p className="relative font-bold">{T.cheerSign}</p>
    </section>
  );
}

export function HexBadge() {
  return (
    <svg width="120" height="132" viewBox="0 0 120 132" aria-hidden="true">
      <path d="M60 4l50 28v68l-50 28-50-28V32z" fill="#4869f6" />
      <path d="M60 16l40 22.5v55L60 116l-40-22.5v-55z" fill="#7d95fb" />
      <path
        d="M60 92s-22-13-22-29a12 12 0 0 1 22-7 12 12 0 0 1 22 7c0 16-22 29-22 29z"
        fill="#fff"
      />
      <path d="M60 56a12 12 0 0 1 22 7c0 16-22 29-22 29z" fill="#e4e9ff" />
    </svg>
  );
}

export { CHARTER_SECTIONS };
