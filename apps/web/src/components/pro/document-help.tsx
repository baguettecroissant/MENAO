"use client";

import { DOCUMENT_HELP, DOCUMENT_HELP_VIDEO, type RequiredDocumentType } from "@menao/core";
import { AlertTriangle, ChevronDown, ExternalLink, Info, Mail } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { ButtonLink, buttonClasses, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { HelpVideo } from "./help-video";

const t = fr.pro.onboarding.help;

/**
 * « Où trouver ce document ? » (lot 60, ADR 0347) : un cas à choisir quand il y en a plusieurs
 * (URSSAF), trois étapes, le lien officiel, et pour les assurances le message prêt pour l'assureur.
 */
export function DocumentHelpSteps({ type }: { type: RequiredDocumentType }) {
  const help = DOCUMENT_HELP[type];
  const [index, setIndex] = useState(0);
  const variant = help.variants[index] ?? help.variants[0];
  if (!variant) return null;
  // L'URSSAF ne délivre pas l'attestation à un compte en retard : avertissement plutôt qu'info.
  const warn = type === "urssaf";
  const video = DOCUMENT_HELP_VIDEO[type];
  return (
    <div className="flex flex-col gap-4">
      {video && <HelpVideo id={video} />}
      {help.variants.length > 1 && (
        <div
          role="group"
          aria-label={help.title}
          className="flex gap-1 rounded-pill border border-border bg-surface p-1"
        >
          {help.variants.map((v, i) => (
            <button
              key={v.label}
              type="button"
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={`min-h-10 flex-1 rounded-pill px-3 text-sm font-semibold ${focusRing} ${
                i === index ? "bg-foreground text-white" : "text-foreground hover:bg-background"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {variant.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-[0.9375rem] leading-relaxed">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {help.note && (
        <p
          className={`flex gap-2.5 rounded-input p-3 text-sm leading-relaxed text-label ${
            warn ? "bg-warning-soft" : "bg-primary-softer"
          }`}
        >
          {warn ? (
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
          )}
          {help.note}
        </p>
      )}
      {variant.link && (
        <a
          href={variant.link.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "primary" })}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {variant.link.label}
        </a>
      )}
      {help.insurerRequest && (
        <ButtonLink
          href={`/pro/onboarding/documents/assureur?type=${type}` as Route}
          variant="outline"
          block
        >
          <Mail aria-hidden="true" className="size-4" />
          {t.askInsurer}
        </ButtonLink>
      )}
    </div>
  );
}

/** La même aide repliée dans la carte du document (téléphone, et liste de tous les documents). */
export function DocumentHelpDisclosure({
  type,
  className = "",
}: {
  type: RequiredDocumentType;
  className?: string;
}) {
  return (
    <details className={`group rounded-input border border-border bg-background ${className}`}>
      <summary
        className={`flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-primary-strong [&::-webkit-details-marker]:hidden ${focusRing} rounded-input`}
      >
        {t.where}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pt-1 pb-4">
        <DocumentHelpSteps type={type} />
      </div>
    </details>
  );
}
