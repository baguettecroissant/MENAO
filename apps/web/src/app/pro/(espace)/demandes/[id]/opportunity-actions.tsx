"use client";

import { REFUSAL_REASONS } from "@menao/core";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { AppointmentForm } from "@/components/pro/appointment-form";
import { Alert, Button, FieldError, RadioGroup, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { fixAppointment } from "@/lib/artisan/chantier-actions";
import { refuseRequest } from "@/lib/artisan/request-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.onboarding.requests;
const a = fr.pro.appointment;

/** Barre d'actions de l'opportunité (F-17) : « Fixer un rendez-vous » ou « Refuser le chantier ». */
export function OpportunityActions({
  requestId,
  clientFirstName,
  minDate,
  canRefuse,
}: {
  requestId: string;
  clientFirstName: string | null;
  minDate: string;
  canRefuse: boolean;
}) {
  const [panel, setPanel] = useState<"rendez-vous" | "refus" | null>(null);
  const close = useCallback(() => setPanel(null), []);
  const [refused, refuse, refusing] = useActionState(
    refuseRequest.bind(null, requestId),
    initialFormState,
  );
  useActionSuccess(refused, close);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button type="button" size="lg" onClick={() => setPanel("rendez-vous")}>
        {t.fixAppointment}
      </Button>
      {canRefuse && (
        <Button type="button" variant="danger-text" size="sm" onClick={() => setPanel("refus")}>
          {t.refuse}
        </Button>
      )}

      <Drawer
        open={panel === "rendez-vous"}
        onClose={close}
        title={a.fixTitle(clientFirstName)}
        backLabel={a.backToForm}
      >
        <AppointmentForm
          action={fixAppointment.bind(null, requestId)}
          submitLabel={a.fixSubmit}
          minDate={minDate}
          hint={a.fixHint}
        />
      </Drawer>

      {canRefuse && (
        <Drawer open={panel === "refus"} onClose={close} title={t.refuse} backLabel={a.backToForm}>
          <form action={refuse} className="flex flex-col gap-4" noValidate>
            {refused.error && <Alert tone="error">{refused.error}</Alert>}
            <RadioGroup
              legend={t.refusalLegend}
              name="reason"
              value={reason}
              onChange={setReason}
              errors={refused.fieldErrors?.reason}
              options={REFUSAL_REASONS.map((r) => ({ value: r, label: t.reasons[r] }))}
              renderSelected={(value) =>
                value === "autre" ? (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="refusal-detail" className="text-sm font-medium">
                      {t.refusalDetail}
                    </label>
                    <textarea
                      id="refusal-detail"
                      name="detail"
                      defaultValue={refused.values?.detail}
                      rows={3}
                      maxLength={500}
                      aria-invalid={refused.fieldErrors?.detail ? true : undefined}
                      className={`${inputClasses} min-h-24 bg-surface py-3`}
                    />
                    {refused.fieldErrors?.detail && (
                      <FieldError>{refused.fieldErrors.detail[0]}</FieldError>
                    )}
                  </div>
                ) : null
              }
            />
            <Button type="submit" variant="danger" size="lg" disabled={refusing}>
              {t.confirmRefuse}
            </Button>
          </form>
        </Drawer>
      )}
    </>
  );
}
