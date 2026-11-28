"use client";

import {
  prospectTradeCodes,
  preparedSignupMessage,
  ZONE_RADIUS_OPTIONS_KM,
  type ArtisanSignupCompany,
} from "@menao/core";
import {
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Copy,
  LoaderCircle,
  Mail,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { Route } from "next";
import { useMemo, useState, useTransition } from "react";
import { CompanyFinder, toDraftCompany } from "@/components/pro/signup/company-step";
import { QrSvg } from "@/components/pro/share-card";
import { Alert, Button, ButtonLink, Field, Select } from "@/components/ui";
import { PhoneField } from "@/components/form-fields";
import { fr } from "@/i18n/fr";
import { isSiretRegistered } from "@/lib/auth/artisan-signup-actions";
import { prepareSignup } from "@/lib/commercial/prepared-signup-actions";
import { qrSvg } from "@/lib/qr";

const t = fr.commercialField.prepare;

export type PrepareTrade = { code: string; label: string };

function Steps({ index }: { index: number }) {
  return (
    <ol className="flex gap-1.5" aria-label={t.steps[index]}>
      {t.steps.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-1.5">
          <span
            className={`h-1.5 rounded-full ${i < index ? "bg-success" : i === index ? "bg-primary" : "bg-border"}`}
          />
          <span
            className={`text-[0.6875rem] ${i === index ? "font-bold text-foreground" : "text-muted-foreground"}`}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

const formatSiret = (siret: string) =>
  siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");

function CompanySummary({ company }: { company: ArtisanSignupCompany }) {
  return (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[1.0625rem] font-semibold">
            {company.name ?? formatSiret(company.siret)}
          </span>
          <span className="text-[0.8125rem] text-muted-foreground">
            {[`SIRET ${formatSiret(company.siret)}`, company.creationYear]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </div>
      {(company.address || company.city) && (
        <p className="text-sm text-label">{company.address ?? company.city}</p>
      )}
      <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-success">
        <CircleCheck aria-hidden="true" className="size-4" />
        {t.found}
      </p>
    </section>
  );
}

/**
 * Inscrire un artisan (F-195, lot 84, ADR 0395) : l'entreprise, ses métiers, sa zone et son contact,
 * avec son accord, puis son lien personnel (QR code sur place, SMS ou e-mail depuis le téléphone du
 * conseiller). L'artisan finit lui-même : le conseiller ne voit ni mot de passe ni code.
 */
export function PrepareSignupWizard({
  trades,
  advisor,
  initialQuery = "",
  maxTrades = null,
}: {
  trades: PrepareTrade[];
  advisor: string;
  initialQuery?: string;
  /** Métiers au plus avec la formule de Base (ADR 0290). */
  maxTrades?: number | null;
}) {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<ArtisanSignupCompany | null>(null);
  const [taken, setTaken] = useState(false);
  const [tradeCodes, setTradeCodes] = useState<string[]>([]);
  const [radius, setRadius] = useState(20);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [result, setResult] = useState<{
    link: string;
    firstName: string;
    phone: string;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const manager = company?.managers[0];
  const qr = useMemo(() => (result ? qrSvg(result.link) : null), [result]);

  function pick(picked: ArtisanSignupCompany) {
    setCompany(picked);
    setTradeCodes(
      prospectTradeCodes(picked.apeCode).filter((c) => trades.some((x) => x.code === c)),
    );
    setTaken(false);
    isSiretRegistered(picked.siret)
      .then((registered) => setTaken(registered))
      .catch(() => null);
  }

  function submit(form: FormData) {
    if (!company) return;
    setError(null);
    const firstName = String(form.get("firstName") ?? "");
    const phone = String(form.get("phone") ?? "");
    const email = String(form.get("email") ?? "");
    startTransition(async () => {
      const res = await prepareSignup({
        company,
        tradeCodes,
        radiusKm: radius,
        firstName,
        lastName: String(form.get("lastName") ?? ""),
        email,
        phone,
        consent,
      });
      if (res.status === "error") {
        setError({ message: res.message, field: res.field });
        return;
      }
      setResult({ link: res.link, firstName: firstName.trim(), phone, email });
      setStep(2);
      window.scrollTo({ top: 0 });
    });
  }

  if (step === 2 && result && qr) {
    const message = preparedSignupMessage(result.link, result.firstName, advisor);
    return (
      <div className="flex flex-col gap-4">
        <Steps index={2} />
        <h2 className="text-[1.5rem] leading-tight font-semibold">
          {t.linkTitle(result.firstName)}
        </h2>
        <section className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-5 text-center">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.onSite}
          </p>
          <div className="w-full max-w-60 rounded-input border border-border bg-white p-3">
            <QrSvg qr={qr} label={t.onSiteText} className="aspect-square w-full" />
          </div>
          <p className="font-semibold">{t.onSiteText}</p>
          <p className="text-[0.8125rem] text-muted-foreground">{t.onSiteHint}</p>
          <p className="text-xs break-all text-muted-foreground" data-testid="lien-prepare">
            {result.link}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {t.remote}
          </p>
          <a
            href={`sms:${result.phone.replace(/\s/g, "")}?&body=${encodeURIComponent(message)}`}
            className="flex items-center gap-3 rounded-input bg-primary p-4 text-primary-foreground"
          >
            <Send aria-hidden="true" className="size-5" />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{t.sms}</span>
              <span className="text-[0.8125rem] opacity-85">{t.smsHint}</span>
            </span>
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          <a
            href={`mailto:${result.email}?subject=${encodeURIComponent(t.emailSubject)}&body=${encodeURIComponent(message)}`}
            className="flex items-center gap-3 rounded-input border border-border-strong bg-surface p-4"
          >
            <Mail aria-hidden="true" className="size-5" />
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{t.emailSend}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{t.emailSendHint}</span>
            </span>
          </a>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                ?.writeText(result.link)
                .then(() => setCopied(true))
                .catch(() => null)
            }
            className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary-strong"
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? t.copied : t.copy}
          </button>
        </section>
        <p className="flex items-start gap-2.5 rounded-input bg-warning-soft p-3 text-sm">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          {t.rules}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={"/commercial/inscriptions" as Route} variant="secondary">
            {t.follow}
          </ButtonLink>
          <Button
            type="button"
            variant="ghost"
            block={false}
            onClick={() => {
              setStep(0);
              setCompany(null);
              setResult(null);
              setConsent(false);
              setCopied(false);
            }}
          >
            {t.another}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 1 && company) {
    const err = (field: string) => (error?.field === field ? [error.message] : undefined);
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        <Steps index={1} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">{t.trades}</legend>
          <div className="flex flex-wrap gap-2">
            {trades.map((trade) => {
              const on = tradeCodes.includes(trade.code);
              const full = !on && maxTrades !== null && tradeCodes.length >= maxTrades;
              return (
                <button
                  key={trade.code}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() =>
                    setTradeCodes(
                      on ? tradeCodes.filter((c) => c !== trade.code) : [...tradeCodes, trade.code],
                    )
                  }
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3.5 text-[0.8125rem] font-semibold disabled:opacity-40 ${on ? "bg-foreground text-surface" : "border border-border bg-surface"}`}
                >
                  {on && <Check aria-hidden="true" className="size-3.5" />}
                  {trade.label}
                </button>
              );
            })}
          </div>
          <p className="text-[0.8125rem] text-muted-foreground">{t.tradesHint}</p>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t.zone}</span>
          <Select value={String(radius)} onChange={(e) => setRadius(Number(e.target.value))}>
            {ZONE_RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {t.zoneValue(km, company.city)}
              </option>
            ))}
          </Select>
          <span className="text-[0.8125rem] text-muted-foreground">{t.zoneHint}</span>
        </label>
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-[1.0625rem] font-semibold">{t.contactTitle}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t.firstName}
              name="firstName"
              defaultValue={manager?.firstName ?? ""}
              errors={err("firstName")}
            />
            <Field
              label={t.lastName}
              name="lastName"
              defaultValue={manager?.lastName ?? ""}
              errors={err("lastName")}
            />
          </div>
          <Field
            label={t.email}
            name="email"
            type="email"
            autoComplete="off"
            hint={t.emailHint}
            errors={err("email")}
          />
          <PhoneField label={t.phone} name="phone" errors={err("phone")} />
        </fieldset>
        <label
          className={`flex items-start gap-3 rounded-input border-2 bg-surface p-4 text-sm ${consent ? "border-primary" : "border-border"}`}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            {t.consent(manager?.firstName || "L'artisan")}{" "}
            <span className="text-muted-foreground">{t.consentHint}</span>
          </span>
        </label>
        {error && !["firstName", "lastName", "email", "phone"].includes(error.field ?? "") && (
          <Alert tone="error">{error.message}</Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            block={false}
            data-demo-block="save"
            disabled={pending || !tradeCodes.length || !consent}
          >
            {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {pending ? t.creating : t.create}
          </Button>
          <Button type="button" variant="secondary" block={false} onClick={() => setStep(0)}>
            {t.back}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Steps index={0} />
      {company ? (
        <>
          <CompanySummary company={company} />
          {taken && <Alert tone="error">{t.taken}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" block={false} disabled={taken} onClick={() => setStep(1)}>
              {t.continue}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              block={false}
              onClick={() => setCompany(null)}
            >
              {t.change}
            </Button>
          </div>
        </>
      ) : (
        <CompanyFinder
          initialQuery={initialQuery}
          onPick={(c) => pick(toDraftCompany(c))}
          onManual={(siret) =>
            pick({
              siret,
              name: null,
              legalFormCode: null,
              apeCode: null,
              creationYear: null,
              address: null,
              postcode: null,
              city: null,
              citycode: null,
              lon: null,
              lat: null,
              managers: [],
            })
          }
        />
      )}
    </div>
  );
}
