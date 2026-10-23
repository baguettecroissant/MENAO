"use client";

import { DOCUMENT_REFUSAL_CODES } from "@menao/validation";
import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { decideArtisan, reviewDocument } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.detail;

export function DocumentReview({
  documentId,
  artisanId,
}: {
  documentId: string;
  artisanId: string;
}) {
  const [state, action, pending] = useActionState(reviewDocument, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="artisanId" value={artisanId} />
      {/* Motifs en liste (ADR 0120) : utilisés seulement pour un refus. */}
      <SelectField
        id={`code-${documentId}`}
        label={t.docReason}
        name="code"
        defaultValue=""
        errors={state.fieldErrors?.code}
      >
        <option value="">{t.docReasonChoose}</option>
        {DOCUMENT_REFUSAL_CODES.map((code) => (
          <option key={code} value={code}>
            {t.refusalReasons[code]}
          </option>
        ))}
      </SelectField>
      <Field
        id={`detail-${documentId}`}
        label={t.docDetail}
        name="detail"
        maxLength={300}
        hint={t.docDetailHint}
        errors={state.fieldErrors?.detail}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="status"
          value="valide"
          disabled={pending}
          className="sm:w-auto sm:px-4"
        >
          {t.docValidate}
        </Button>
        <Button
          type="submit"
          name="status"
          value="refuse"
          disabled={pending}
          variant="danger"
          className="sm:w-auto sm:px-4"
        >
          {t.docRefuse}
        </Button>
      </div>
    </form>
  );
}

export function DecisionForm({
  artisanId,
  canValidate,
}: {
  artisanId: string;
  canValidate: boolean;
}) {
  const [state, action, pending] = useActionState(decideArtisan, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="artisanId" value={artisanId} />
      <label htmlFor="message" className="font-medium">
        {t.message}
      </label>
      <textarea
        id="message"
        name="message"
        rows={3}
        maxLength={2000}
        aria-describedby="message-hint"
        className="rounded-input border border-border bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <p id="message-hint" className="text-sm text-muted-foreground">
        {state.fieldErrors?.message?.[0] ?? t.messageHint}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value="valide"
          disabled={pending || !canValidate}
          aria-describedby="validate-hint"
          className="sm:w-auto sm:px-4"
        >
          {t.validate}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="complement"
          disabled={pending}
          variant="secondary"
          className="sm:w-auto sm:px-4"
        >
          {t.complement}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="refuse"
          disabled={pending}
          variant="danger"
          className="sm:w-auto sm:px-4"
        >
          {t.refuse}
        </Button>
      </div>
      {!canValidate && (
        <p id="validate-hint" className="text-sm text-muted-foreground">
          {t.validateHint}
        </p>
      )}
    </form>
  );
}
