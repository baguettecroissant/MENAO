"use client";

import type { CertificationType } from "@menao/validation";
import { Plus } from "lucide-react";
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
    <form action={action} className="flex flex-col gap-3" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
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
        </div>
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
      <Button type="submit" variant="secondary" disabled={pending} className="!rounded-pill">
        <Plus aria-hidden="true" className="size-4" />
        {t.certAdd}
      </Button>
    </form>
  );
}
