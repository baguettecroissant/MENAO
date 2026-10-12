"use client";

import { RESERVES_LIMITS } from "@menao/core";
import { receptionDocumentModel, type ReceptionPdfData } from "@menao/documents";
import { useActionState, useState } from "react";
import { ReceptionPaper } from "@/components/chantier/reception-paper";
import { Alert, Button, FieldError, Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { startReception } from "@/lib/project/reception-actions";

const t = fr.reception;
const links = fr.clientQuote.signature.links;
const linkClasses = "font-medium text-primary-strong underline-offset-2 hover:underline";

/**
 * Réception côté client (maquettes « Signature du PV », « PV avec réserves ») : réserves
 * éventuelles, aperçu du PV tel qu'il sera signé, cases à cocher, puis signature chez le
 * prestataire.
 */
export function ReceptionForm({
  chantierId,
  preview,
  withReserves,
  artisanName,
  balance,
  logoUrl = null,
}: {
  chantierId: string;
  /** PV sans numéro (attribué à la signature) ni réserves. */
  preview: ReceptionPdfData;
  withReserves: boolean;
  artisanName: string;
  balance: string;
  /** Logo de l'entreprise (URL signée), en tête du PV. */
  logoUrl?: string | null;
}) {
  const [step, setStep] = useState<"reserves" | "pv">(withReserves ? "reserves" : "pv");
  const [reserves, setReserves] = useState("");
  const [tooShort, setTooShort] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const next = await startReception(chantierId, withReserves, prev, formData);
      // Réserves refusées par le serveur : retour à leur saisie.
      if (next.fieldErrors?.reserves) setStep("reserves");
      return next;
    },
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  const reservesError = tooShort ? t.reservesTooShort : errors.reserves?.[0];
  const model = {
    ...receptionDocumentModel({
      ...preview,
      withReserves,
      reserves: withReserves ? reserves : null,
    }),
    numberLine: t.numberPending,
  };
  const steps = [...(withReserves ? (["reserves"] as const) : []), "pv", "solde"] as const;
  const items = [
    { name: "document", label: t.consents.document, links: [] },
    {
      name: "cgu_prestataire",
      label: t.consents.cgu_prestataire,
      links: [{ href: "https://www.docuseal.com/terms", label: links.provider, external: true }],
    },
    {
      name: "cgu_menao",
      label: t.consents.cgu_menao,
      links: [
        { href: "/cgu", label: links.terms, external: false },
        { href: "/confidentialite", label: links.privacy, external: false },
      ],
    },
    { name: "echeancier", label: t.consents.echeancier(balance), links: [] },
  ];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={t.stepsLabel} className="flex border-b border-border">
        {steps.map((s) => (
          <span
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={`flex-1 pb-3 text-center text-sm ${
              s === step
                ? "border-b-2 border-primary font-medium text-primary-strong"
                : "text-subtle-foreground"
            }`}
          >
            {t.steps[s]}
          </span>
        ))}
      </nav>

      {step === "reserves" ? (
        <section className="flex flex-col gap-3" aria-labelledby="reserves-title">
          <h2 id="reserves-title" className="text-lg font-medium">
            {t.reservesTitle}
          </h2>
          <p className="text-sm font-medium">{fr.chantier.reception.reservesQuestion}</p>
          <p className="text-sm text-muted-foreground">{t.reservesHelp(artisanName)}</p>
          <label htmlFor="reserves" className="text-sm font-medium">
            {t.reservesLabel}
          </label>
          <textarea
            id="reserves"
            rows={6}
            maxLength={RESERVES_LIMITS.max}
            value={reserves}
            onChange={(e) => {
              setReserves(e.target.value);
              setTooShort(false);
            }}
            placeholder={t.reservesPlaceholder}
            aria-invalid={reservesError ? true : undefined}
            aria-describedby={reservesError ? "reserves-error" : undefined}
            className={`${inputClasses} min-h-36 py-3`}
          />
          {reservesError && <FieldError id="reserves-error">{reservesError}</FieldError>}
          <Button
            type="button"
            size="lg"
            onClick={() => {
              if (reserves.trim().length < RESERVES_LIMITS.min) setTooShort(true);
              else setStep("pv");
            }}
          >
            {t.continue}
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-4" aria-labelledby="pv-title">
          <h2 id="pv-title" className="text-lg font-medium">
            {t.pvTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.pvIntro}</p>
          <ReceptionPaper model={model} label={t.pvLabel} logoUrl={logoUrl} />
          {withReserves && (
            <Button
              type="button"
              variant="secondary"
              block={false}
              className="self-start"
              onClick={() => setStep("reserves")}
            >
              {t.editReserves}
            </Button>
          )}
          <form action={formAction} noValidate className="flex flex-col gap-4">
            {state.error && <Alert tone="error">{state.error}</Alert>}
            <input type="hidden" name="reserves" value={withReserves ? reserves : ""} />
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                const error = errors[item.name]?.[0];
                return (
                  <div key={item.name} className="flex flex-col gap-1">
                    <label className="flex items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        name={item.name}
                        defaultChecked={state.values?.[item.name] === "on"}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${item.name}-error` : undefined}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span>
                        {item.label}
                        {item.links.map((link) => (
                          <span key={link.href}>
                            {" "}
                            <a
                              href={link.href}
                              className={linkClasses}
                              {...(link.external
                                ? { target: "_blank", rel: "noopener noreferrer" }
                                : {})}
                            >
                              {link.label}
                            </a>
                          </span>
                        ))}
                      </span>
                    </label>
                    {error && <FieldError id={`${item.name}-error`}>{error}</FieldError>}
                  </div>
                );
              })}
            </div>
            <Hint>{t.otp}</Hint>
            <Button type="submit" size="lg" disabled={pending}>
              {t.submit}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t.balanceNext}</p>
          </form>
        </section>
      )}
    </div>
  );
}
