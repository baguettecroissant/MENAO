"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { startSignature } from "@/lib/project/quote-actions";

const t = fr.clientQuote.signature;
const linkClasses = "font-medium text-primary-strong underline-offset-2 hover:underline";

/** Cases à cocher avant la signature (F-13), puis redirection vers le prestataire. */
export function QuoteSignatureForm({
  quoteId,
  deposit,
  balance,
}: {
  quoteId: string;
  deposit: string;
  balance: string;
}) {
  const [state, formAction, pending] = useActionState(
    startSignature.bind(null, quoteId),
    initialFormState,
  );
  const errors = state.fieldErrors ?? {};
  const items = [
    { name: "document", label: t.consents.document, links: [] },
    {
      name: "cgu_prestataire",
      label: t.consents.cgu_prestataire,
      links: [{ href: "https://www.docuseal.com/terms", label: t.links.provider, external: true }],
    },
    {
      name: "cgu_menao",
      label: t.consents.cgu_menao,
      links: [
        { href: "/cgu", label: t.links.terms, external: false },
        { href: "/confidentialite", label: t.links.privacy, external: false },
      ],
    },
    { name: "echeancier", label: t.consents.echeancier(deposit, balance), links: [] },
  ];

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
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
                <span>{item.label}</span>
              </label>
              {item.links.length > 0 && (
                <p className="flex gap-3 pl-7 text-xs">
                  {item.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel={link.external ? "noopener noreferrer" : "noopener"}
                      className={linkClasses}
                    >
                      {link.label}
                    </a>
                  ))}
                </p>
              )}
              {error && (
                <div className="pl-7">
                  <FieldError id={`${item.name}-error`}>{error}</FieldError>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Hint>{t.otp}</Hint>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
