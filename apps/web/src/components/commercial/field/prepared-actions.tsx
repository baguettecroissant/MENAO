"use client";

import { preparedSignupMessage } from "@menao/core";
import { Send, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { fr } from "@/i18n/fr";
import { removePreparedSignup } from "@/lib/commercial/prepared-signup-actions";

const t = fr.commercialField.signups;

/** Renvoyer le lien (SMS depuis le téléphone du conseiller) ou retirer une préparation. */
export function PreparedActions({
  id,
  link,
  phone,
  firstName,
  advisor,
  expired,
}: {
  id: string;
  link: string;
  phone: string | null;
  firstName: string | null;
  advisor: string;
  expired: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {!expired && phone && (
        <a
          href={`sms:${phone}?&body=${encodeURIComponent(preparedSignupMessage(link, firstName, advisor))}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-border-strong bg-surface px-3.5 text-sm font-semibold"
        >
          <Send aria-hidden="true" className="size-4" />
          {t.resend}
        </a>
      )}
      <button
        type="button"
        data-demo-block="save"
        disabled={pending}
        onClick={() => startTransition(() => removePreparedSignup(id))}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-danger"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        {t.remove}
      </button>
    </div>
  );
}
