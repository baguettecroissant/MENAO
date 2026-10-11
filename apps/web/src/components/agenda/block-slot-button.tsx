"use client";

import { CalendarOff } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, Field, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addBlockedSlot } from "@/lib/artisan/agenda-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.agenda.block;

/** « Bloquer un créneau » (F-44) : rendez-vous personnel, chantier hors MENAO… */
export function BlockSlotButton({
  minDate,
  defaultDate,
}: {
  minDate: string;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button type="button" variant="secondary" block={false} onClick={() => setOpen(true)}>
        <CalendarOff aria-hidden="true" className="size-4" />
        {t.open}
      </Button>
      <Drawer open={open} onClose={close} title={t.title} backLabel={fr.pro.appointment.backToForm}>
        {open && <BlockSlotForm minDate={minDate} defaultDate={defaultDate} onSuccess={close} />}
      </Drawer>
    </>
  );
}

function BlockSlotForm({
  minDate,
  defaultDate,
  onSuccess,
}: {
  minDate: string;
  defaultDate: string;
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState(addBlockedSlot, initialFormState);
  useActionSuccess(state, onSuccess);
  const errors = state.fieldErrors;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Hint>{t.intro}</Hint>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        name="date"
        type="date"
        required
        min={minDate}
        label={t.date}
        defaultValue={state.values?.date ?? defaultDate}
        errors={errors?.date}
        className="bg-surface"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          name="start"
          type="time"
          required
          step={900}
          label={t.start}
          defaultValue={state.values?.start ?? "14:00"}
          errors={errors?.start}
          className="bg-surface"
        />
        <Field
          name="end"
          type="time"
          required
          step={900}
          label={t.end}
          defaultValue={state.values?.end ?? "16:00"}
          errors={errors?.end}
          className="bg-surface"
        />
      </div>
      <Field
        name="label"
        label={t.label}
        labelNote={t.labelNote}
        maxLength={80}
        placeholder={t.labelPlaceholder}
        defaultValue={state.values?.label}
        errors={errors?.label}
        className="bg-surface"
      />
      <Button type="submit" size="lg" disabled={pending}>
        {t.submit}
      </Button>
    </form>
  );
}
