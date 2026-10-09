"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Field, RadioGroup } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveCompany } from "@/lib/artisan/actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.pro.onboarding.company;

export function CompanyForm(props: {
  partial: boolean;
  raisonSociale: string | null;
  nomCommercial: string | null;
  assujettiTva: boolean | null;
  vatNumber: string | null;
}) {
  const [state, action, pending] = useActionState(saveCompany, initialFormState);
  const [tva, setTva] = useState(
    props.assujettiTva === null ? "" : props.assujettiTva ? "oui" : "non",
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {props.partial && (
        <>
          <p className="text-sm text-muted-foreground">{t.partialDiffusion}</p>
          <Field
            label={t.raisonSociale}
            name="raisonSociale"
            required
            defaultValue={props.raisonSociale ?? ""}
            errors={errors.raisonSociale}
          />
        </>
      )}
      <Field
        label={t.nomCommercial}
        name="nomCommercial"
        hint={t.nomCommercialHint}
        defaultValue={props.nomCommercial ?? ""}
        errors={errors.nomCommercial}
      />
      <RadioGroup
        legend={t.tva}
        name="assujettiTva"
        value={tva}
        onChange={setTva}
        options={[
          { value: "oui", label: t.tvaYes },
          { value: "non", label: t.tvaNo },
        ]}
        errors={errors.assujettiTva}
      />
      {tva === "oui" && props.vatNumber && (
        <p>
          <span className="block text-sm text-muted-foreground">{t.tvaNumber}</span>
          <span className="font-medium">{props.vatNumber}</span>
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {fr.pro.onboarding.saveAndContinue}
      </Button>
    </form>
  );
}
