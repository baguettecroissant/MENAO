"use client";

import { Flag } from "lucide-react";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Alert, Button, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reportFakeClient } from "@/lib/artisan/chantier-actions";
import { initialFormState } from "@/lib/auth/form";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.pro.fakeClient;

/**
 * « Je pense que ce n'est pas un vrai particulier » (ADR 0157), discret en bas de chaque demande :
 * ticket pour l'équipe MENAO, qui vérifie en toute discrétion.
 */
export function FakeClientReport({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportFakeClient.bind(null, requestId),
    initialFormState,
  );
  const close = useCallback(() => setOpen(false), []);
  useActionSuccess(state, close);

  return (
    <div>
      {state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Flag aria-hidden="true" className="size-4" />
          {t.open}
        </button>
      )}
      <Drawer open={open} onClose={close} title={t.title} backLabel={fr.pro.appointment.backToForm}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fake-client-detail" className="text-sm font-medium">
              {t.detail} <span className="font-normal text-subtle-foreground">{t.detailNote}</span>
            </label>
            <textarea
              id="fake-client-detail"
              name="detail"
              defaultValue={state.values?.detail}
              rows={3}
              maxLength={1000}
              className={`${inputClasses} min-h-24 py-3`}
            />
          </div>
          <Button type="submit" size="lg" disabled={pending}>
            {t.submit}
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
