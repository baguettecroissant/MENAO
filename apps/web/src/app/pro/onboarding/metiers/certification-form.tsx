"use client";

import type { CertificationType } from "@menao/validation";
import { useActionState } from "react";
import { Alert, Button, Field, SelectField } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { addCertification } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.trades;

export function CertificationForm({ types }: { types: readonly CertificationType[] }) {
  const [state, action, pending] = useActionState(addCertification, initialFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label={t.certType}
          name="type"
          defaultValue={state.values?.type ?? "rge"}
          errors={errors.type}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {fr.certificationTypes[type]}
            </option>
          ))}
        </SelectField>
        <Field
          label={t.certNumber}
          name="numero"
          defaultValue={state.values?.numero}
          errors={errors.numero}
        />
        <Field
          label={t.certEnd}
          name="dateFin"
          type="date"
          defaultValue={state.values?.dateFin}
          errors={errors.dateFin}
        />
      </div>
      <Button type="submit" disabled={pending} className="sm:w-auto sm:self-start sm:px-6">
        {t.certAdd}
      </Button>
    </form>
  );
}
