"use client";

import { CHARTER_RULES, CHARTER_SECTIONS, CHARTER_TEXT, CHARTER_VERSION } from "@menao/core";
import { ArrowRight, Check, Hand } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import {
  CHARTER_TOTAL,
  CharterHero,
  CheerSection,
  PrincipleCard,
  PromisesSection,
  RuleContent,
  SectionExtras,
  SectionHeader,
  SectionIcon,
} from "@/components/pro/charter/charter-parts";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { acceptCharter, type CharterDestination } from "@/lib/artisan/charter-actions";
import { SignaturePad } from "./signature-pad";

const t = fr.pro.onboarding.charter;
const T = CHARTER_TEXT;
const sectionCodes = CHARTER_SECTIONS.map((s, si) =>
  s.rules.map((_, ri) => `R${si + 1}.${ri + 1}`),
);

const inputClass =
  "min-h-12 w-full min-w-0 rounded-input border-[1.5px] border-border bg-surface px-3 py-2.5 font-medium focus:border-primary focus:outline-none";

/**
 * Charte qualité à lire et signer (ADR 0104), d'après la maquette V5 : chaque règle est cochée,
 * puis l'artisan signe avec son nom, son entreprise, son SIRET et un tracé. Les erreurs sont
 * listées en une phrase avant l'envoi ; la base refait les contrôles.
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
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [name, setName] = useState(defaults.name);
  const [company, setCompany] = useState(defaults.company);
  const [siret, setSiret] = useState(defaults.siret);
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const n = CHARTER_RULES.filter((r) => checked[r.code]).length;
  const count = (si: number) => sectionCodes[si]?.filter((c) => checked[c]).length ?? 0;
  const firstUnchecked = CHARTER_SECTIONS.find((_, si) =>
    sectionCodes[si]?.some((c) => !checked[c]),
  )?.id;

  function toggle(code: string) {
    setChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    const missing: string[] = [];
    if (n < CHARTER_TOTAL) missing.push(t.missing.rules(CHARTER_TOTAL - n));
    if (!name.trim()) missing.push(t.missing.name);
    if (!company.trim()) missing.push(t.missing.company);
    const s = siret.replace(/\s/g, "");
    if (s.length !== 14 || /\D/.test(s)) missing.push(t.missing.siret);
    if (!signature) missing.push(t.missing.signature);
    if (!agree) missing.push(t.missing.agree);
    if (missing.length) {
      event.preventDefault();
      setClientError(`${t.missingPrefix}${missing.join(", ")}.`);
      if (n < CHARTER_TOTAL && firstUnchecked)
        document.getElementById(firstUnchecked)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setClientError(null);
  }

  const error = clientError ?? state.error;

  return (
    <div className="flex flex-col gap-5 pb-28">
      <CharterHero />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <nav aria-label={t.summary} className="rounded-card border border-border bg-surface p-4">
          <h3 className="font-semibold">{t.progressTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.progressCount(n, CHARTER_TOTAL)}</p>
          <ul className="mt-2.5 flex flex-col gap-0.5">
            {CHARTER_SECTIONS.map((s, si) => {
              const done = count(si) === s.rules.length;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2.5 rounded-input px-2 py-2 text-sm font-semibold hover:bg-primary-softer"
                  >
                    <Dot done={done} label={si + 1} />
                    {s.title.split(" :")[0]}
                    <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                      {count(si)}/{s.rules.length}
                    </span>
                  </a>
                </li>
              );
            })}
            {[
              ["engagement", t.navPromises],
              ["signature", t.navSignature],
            ].map(([id, label], i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2.5 rounded-input px-2 py-2 text-sm font-semibold hover:bg-primary-softer"
                >
                  <Dot done={false} label={CHARTER_SECTIONS.length + 1 + i} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <PrincipleCard />
      </div>

      {CHARTER_SECTIONS.map((section, si) => {
        const done = count(si) === section.rules.length;
        return (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`h-${section.id}`}
            className="scroll-mt-24 rounded-card border border-border bg-surface p-5"
          >
            <SectionHeader
              section={section}
              index={si}
              state={
                <span
                  className={`rounded-pill px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
                    done ? "bg-success-soft text-success" : "bg-background text-muted-foreground"
                  }`}
                >
                  {done ? t.validated : `${count(si)} / ${section.rules.length}`}
                </span>
              }
            />
            <SectionExtras section={section} />
            <ul className="mt-3.5 flex flex-col gap-2">
              {section.rules.map((rule, ri) => {
                const code = `R${si + 1}.${ri + 1}`;
                const on = !!checked[code];
                return (
                  <li key={code}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={t.ruleLabel(code, rule.title)}
                      onClick={() => toggle(code)}
                      className={`flex w-full items-start gap-3 rounded-input border-[1.5px] p-3 text-left transition-colors ${
                        on
                          ? "border-primary bg-[#f7f8ff]"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <RuleContent code={code} {...rule} checked={on} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <PromisesSection index={CHARTER_SECTIONS.length + 1} />
      <CheerSection />

      <form
        id="signature"
        action={action}
        onSubmit={validate}
        aria-labelledby="h-sig"
        className="flex scroll-mt-24 flex-col gap-3.5 rounded-card border border-border bg-surface p-5"
        noValidate
      >
        <div className="flex items-start gap-3.5">
          <SectionIcon icon={Hand} />
          <div>
            <h2 id="h-sig" className="text-xl font-bold tracking-tight">
              {CHARTER_SECTIONS.length + 2}. {T.signatureTitle}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{T.signatureWhy}</p>
          </div>
        </div>
        <input type="hidden" name="version" value={CHARTER_VERSION} />
        {CHARTER_RULES.filter((r) => checked[r.code]).map((r) => (
          <input key={r.code} type="hidden" name="rule" value={r.code} />
        ))}
        <input type="hidden" name="signature" value={signature} />
        {agree && <input type="hidden" name="agree" value="on" />}
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
        <SignaturePad onChange={setSignature} />
        <button
          type="button"
          role="checkbox"
          aria-checked={agree}
          onClick={() => setAgree((v) => !v)}
          className={`flex w-full items-start gap-3 rounded-input border-[1.5px] p-3 text-left ${
            agree
              ? "border-primary bg-[#f7f8ff]"
              : "border-border bg-surface hover:border-primary/40"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 ${
              agree ? "border-primary bg-primary" : "border-[#a9b0c6] bg-surface"
            }`}
          >
            {agree && <Check className="size-4 text-white" strokeWidth={3.2} />}
          </span>
          <span className="flex flex-col gap-1">
            <b>{T.agreeTitle}</b>
            <span className="text-sm text-muted-foreground">{T.agreeText}</span>
          </span>
        </button>
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 font-bold text-white hover:bg-primary-hover disabled:bg-[#c9cfdf]"
        >
          {t.submit}
          <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.4} />
        </button>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3.5">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            <b className="text-foreground tabular-nums">
              {n} / {CHARTER_TOTAL}
            </b>{" "}
            {t.dockSuffix}
            {n < CHARTER_TOTAL ? t.dockTodo : t.dockDone}
          </p>
          <a
            href={`#${firstUnchecked ?? "signature"}`}
            className="flex min-h-12 items-center justify-center rounded-pill bg-primary px-5 text-sm font-bold whitespace-nowrap text-white hover:bg-primary-hover"
          >
            {firstUnchecked ? t.nextRule : t.toSignature}
          </a>
        </div>
      </div>
    </div>
  );
}

function Dot({ done, label }: { done: boolean; label: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-extrabold ${
        done ? "border-primary bg-primary text-white" : "border-primary/40 text-primary-strong"
      }`}
    >
      {done ? <Check className="size-3" strokeWidth={3.4} /> : label}
    </span>
  );
}
