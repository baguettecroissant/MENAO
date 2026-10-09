"use client";

import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { updateSiret, verifySiret, type SireneCheckState } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.company;

export function SiretForm({
  siret,
  editable,
  verified,
}: {
  siret: string | null;
  editable: boolean;
  verified: boolean;
}) {
  const [saveState, save, saving] = useActionState(updateSiret, initialFormState);
  const [checkState, check, checking] = useActionState<SireneCheckState>(verifySiret, {});
  const checkFailed = checkState.status && checkState.status !== "ok";

  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <form action={save} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
          <div className="grow">
            <Field
              label={t.siretLabel}
              name="siret"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={saveState.values?.siret ?? siret ?? ""}
              errors={saveState.fieldErrors?.siret}
            />
          </div>
          <Button type="submit" disabled={saving} className="sm:w-auto">
            {t.siretChange}
          </Button>
        </form>
      ) : (
        <p>
          <span className="font-medium">{siret}</span>
          <span className="block text-sm text-muted-foreground">{t.siretLocked}</span>
        </p>
      )}
      {saveState.error && <Alert tone="error">{saveState.error}</Alert>}

      {!verified && <p className="text-muted-foreground">{t.notVerified}</p>}
      <form action={check}>
        <Button type="submit" disabled={checking || !siret}>
          {verified ? t.reverify : t.verify}
        </Button>
      </form>
      {checkState.status && (
        <Alert tone={checkFailed ? "error" : "success"}>{t.status[checkState.status]}</Alert>
      )}
    </div>
  );
}
