"use client";

import { REFUSAL_REASONS } from "@menao/core";
import { useActionState, useState } from "react";
import { Alert, Button, RadioGroup } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { acceptRequest, refuseRequest } from "@/lib/artisan/request-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.requests;

/** Accepter la demande, ou la refuser avec un motif (F-17). */
export function Respond({ requestId }: { requestId: string }) {
  const [accepted, accept, accepting] = useActionState(
    acceptRequest.bind(null, requestId),
    initialFormState,
  );
  const [refused, refuse, refusePending] = useActionState(
    refuseRequest.bind(null, requestId),
    initialFormState,
  );
  const [showRefusal, setShowRefusal] = useState(false);
  const [reason, setReason] = useState("");
  const error = accepted.error ?? refused.error;

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {!showRefusal ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={accept} className="sm:flex-1">
            <Button type="submit" disabled={accepting}>
              {t.accept}
            </Button>
          </form>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowRefusal(true)}
            className="sm:flex-1"
          >
            {t.refuse}
          </Button>
        </div>
      ) : (
        <form action={refuse} className="flex flex-col gap-4" noValidate>
          <RadioGroup
            legend={t.refusalLegend}
            name="reason"
            value={reason}
            onChange={setReason}
            errors={refused.fieldErrors?.reason}
            options={REFUSAL_REASONS.map((r) => ({ value: r, label: t.reasons[r] }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="detail" className="font-medium">
              {t.refusalDetail}
            </label>
            <textarea
              id="detail"
              name="detail"
              rows={3}
              maxLength={500}
              aria-invalid={refused.fieldErrors?.detail ? true : undefined}
              className="rounded-button border border-border bg-surface p-3"
            />
            {refused.fieldErrors?.detail && (
              <p className="text-sm text-danger">{refused.fieldErrors.detail[0]}</p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRefusal(false)}
              className="sm:w-auto"
            >
              {fr.search.review.cancel}
            </Button>
            <Button type="submit" variant="danger" disabled={refusePending} className="sm:w-auto">
              {t.confirmRefuse}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
