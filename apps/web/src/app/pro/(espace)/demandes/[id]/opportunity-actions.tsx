"use client";

import { REFUSAL_REASONS } from "@menao/core";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { AppointmentForm } from "@/components/pro/appointment-form";
import { ProposeSlotsForm } from "@/components/pro/propose-slots-form";
import {
  Alert,
  Button,
  FieldError,
  RadioGroup,
  buttonClasses,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { AppointmentAgenda } from "@/lib/artisan/agenda";
import { fixAppointment, proposeSlots } from "@/lib/artisan/chantier-actions";
import { refuseRequest } from "@/lib/artisan/request-actions";
import { initialFormState } from "@/lib/auth/form";
import { formatDayMonthShort, formatTime } from "@/lib/format";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.onboarding.requests;
const a = fr.pro.appointment;

/**
 * Barre d'actions de l'opportunité (F-17) : « Proposer 3 créneaux » (accepter en un toucher,
 * ADR 0222), « Fixer un rendez-vous » ou « Refuser le chantier ».
 */
export function OpportunityActions({
  requestId,
  clientFirstName,
  minDate,
  canRefuse,
  partnersAfterRefusal = false,
  agenda,
  proposedSlots = null,
  layout = "stack",
}: {
  requestId: string;
  clientFirstName: string | null;
  minDate: string;
  canRefuse: boolean;
  /** Partenaires à recommander à sa place après le refus (ADR 0174). */
  partnersAfterRefusal?: boolean;
  /** F-44 : créneaux libres proposés et avertissements. */
  agenda?: AppointmentAgenda;
  /** Créneaux déjà proposés, en attente du choix du client (ADR 0222). */
  proposedSlots?: readonly string[] | null;
  /**
   * `bar` (refonte « Nette », ADR 0246) : boutons côte à côte, sur fond bleu nuit en grand écran
   * (bandeau de décision) et sur fond blanc en bas de l'écran sur téléphone.
   */
  layout?: "stack" | "bar";
}) {
  const [panel, setPanel] = useState<"creneaux" | "rendez-vous" | "refus" | null>(null);
  const suggestions = agenda?.suggestions ?? [];
  const canPropose = suggestions.length >= 2;
  const close = useCallback(() => setPanel(null), []);
  const [refused, refuse, refusing] = useActionState(
    refuseRequest.bind(null, requestId),
    initialFormState,
  );
  useActionSuccess(refused, close);
  const [reason, setReason] = useState("");

  return (
    <>
      {proposedSlots && proposedSlots.length > 0 && (
        <div className="rounded-input bg-primary-soft px-4 py-3 text-sm">
          <p className="font-medium text-primary-strong">{a.proposedTitle}</p>
          <p>
            {proposedSlots
              .map((iso) => a.suggestion(formatDayMonthShort(iso), formatTime(iso)))
              .join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground">{a.proposedWaiting(clientFirstName)}</p>
        </div>
      )}
      {layout === "bar" ? (
        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:justify-end">
          {canRefuse && (
            <button
              type="button"
              onClick={() => setPanel("refus")}
              className={`${buttonClasses({ variant: "secondary" })} px-3 whitespace-nowrap lg:w-auto lg:px-5 lg:border-white/30 lg:bg-transparent lg:text-surface lg:hover:bg-white/10`}
            >
              {t.refuseShort}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel("rendez-vous")}
            className={`${buttonClasses({ variant: canPropose ? "secondary" : "primary" })} px-3 whitespace-nowrap lg:w-auto lg:px-5 ${
              canRefuse ? "" : "col-span-2"
            } ${canPropose ? "lg:border-white/30 lg:bg-transparent lg:text-surface lg:hover:bg-white/10" : ""}`}
          >
            {t.fixAppointment}
          </button>
          {canPropose && (
            <button
              type="button"
              onClick={() => setPanel("creneaux")}
              className={`${buttonClasses({ variant: "primary" })} col-span-2 -order-1 lg:order-none px-3 whitespace-nowrap lg:w-auto lg:px-5`}
            >
              {proposedSlots ? a.proposeOther : a.propose(Math.min(3, suggestions.length))}
            </button>
          )}
        </div>
      ) : (
        <>
          {canPropose && (
            <Button
              type="button"
              size="lg"
              variant={proposedSlots ? "secondary" : "primary"}
              onClick={() => setPanel("creneaux")}
            >
              {proposedSlots ? a.proposeOther : a.propose(Math.min(3, suggestions.length))}
            </Button>
          )}
          <Button
            type="button"
            size={canPropose ? "md" : "lg"}
            variant={canPropose ? "secondary" : "primary"}
            onClick={() => setPanel("rendez-vous")}
          >
            {t.fixAppointment}
          </Button>
          {canRefuse && (
            <Button type="button" variant="danger-text" size="sm" onClick={() => setPanel("refus")}>
              {t.refuse}
            </Button>
          )}
        </>
      )}

      {canPropose && (
        <Drawer
          open={panel === "creneaux"}
          onClose={close}
          title={a.proposeTitle(clientFirstName)}
          backLabel={a.backToForm}
        >
          <ProposeSlotsForm
            suggestions={suggestions}
            action={proposeSlots.bind(null, requestId)}
            onDone={close}
          />
        </Drawer>
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
          agenda={agenda}
        />
      </Drawer>

      {canRefuse && (
        <Drawer open={panel === "refus"} onClose={close} title={t.refuse} backLabel={a.backToForm}>
          <form action={refuse} className="flex flex-col gap-4" noValidate>
            {refused.error && <Alert tone="error">{refused.error}</Alert>}
            {partnersAfterRefusal && (
              <p className="text-sm text-muted-foreground">{fr.pro.partners.afterRefusal}</p>
            )}
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
