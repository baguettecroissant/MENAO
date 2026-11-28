"use client";

import { MAX_UPLOAD_BYTES } from "@menao/core";
import { LoaderCircle, PenLine, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Alert, Button, CheckboxField, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { issueCommercialInvoice, storeCommercialInvoice } from "@/lib/commercial/billing-actions";
import { createClient } from "@/lib/supabase/client";
import { uploadRaw } from "@/lib/upload/client";

const t = fr.commercialGains.statement;

/** « J'ai vérifié… » puis « Émettre ma facture » (F-197, ADR 0397). */
export function IssueInvoice({ statementId }: { statementId: string }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <CheckboxField
        name="confirm"
        checked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
      >
        <span className="text-[0.9375rem] leading-snug">{t.confirm}</span>
      </CheckboxField>
      <Button
        type="button"
        data-demo-block="save"
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await issueCommercialInvoice(statementId, confirmed);
            if (result.status === "error") return setError(result.message);
            router.refresh();
          })
        }
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <PenLine aria-hidden="true" className="size-4" />
        )}
        {busy ? t.issuing : t.issue}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

/** « Vous faites vos factures vous-même ? » : dépôt d'un PDF, rangé par process-upload. */
export function DepositInvoice({
  statementId,
  replace = false,
}: {
  statementId: string;
  replace?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const errors = t.errors;

  async function send(file: File) {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) return setError(errors.too_large ?? null);
    const { data } = await createClient().auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return setError(errors.unavailable ?? null);
    const path = await uploadRaw(userId, file);
    if (!path) return setError(errors.unavailable ?? null);
    const result = await storeCommercialInvoice(statementId, path, number.trim());
    if (result.status === "error") return setError(result.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-dashed border-border-strong bg-surface p-4">
      <div className="flex flex-col gap-0.5 text-[0.875rem] leading-snug">
        <b>{t.own.title}</b>
        <span className="text-label">{t.own.text}</span>
      </div>
      <Field
        label={t.own.number}
        name="invoiceNumber"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        maxLength={40}
        autoComplete="off"
      />
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) startTransition(() => send(file));
        }}
      />
      <Button
        type="button"
        variant="secondary"
        data-demo-block="save"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Upload aria-hidden="true" className="size-4" />
        )}
        {busy ? t.own.uploading : replace ? t.own.replace : t.own.action}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
