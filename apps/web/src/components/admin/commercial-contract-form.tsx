"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { confirmCommercialContract } from "@/lib/admin/commercial-actions";

const t = fr.commercialField.admin.card;

/** Confirmer la date de signature du contrat déposé par le conseiller, ou retirer la confirmation. */
export function CommercialContractForm({
  commercialId,
  signedOn,
  today,
}: {
  commercialId: string;
  signedOn: string | null;
  today: string;
}) {
  const [state, action, pending] = useActionState(confirmCommercialContract, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
      <input type="hidden" name="id" value={commercialId} />
      {signedOn ? (
        <>
          <input type="hidden" name="retirer" value="1" />
          <Button type="submit" variant="secondary" block={false} disabled={pending}>
            {t.unconfirm}
          </Button>
        </>
      ) : (
        <>
          <div className="sm:w-56">
            <Field
              label={t.signedOn}
              name="signe_le"
              type="date"
              max={today}
              defaultValue={today}
            />
          </div>
          <Button type="submit" block={false} disabled={pending}>
            {t.confirm}
          </Button>
        </>
      )}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
