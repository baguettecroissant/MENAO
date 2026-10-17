"use client";

import type { RequiredDocumentType } from "@menao/core";
import { Field } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.documents;

export function DocumentUpload({
  type,
  userId,
  label,
}: {
  type: RequiredDocumentType;
  userId: string;
  label: string;
}) {
  const id = (name: string) => `${type}-${name}`;
  return (
    <UploadForm
      purpose="document"
      formId={type}
      userId={userId}
      accept="application/pdf,image/jpeg,image/png"
      hint={fr.pro.onboarding.upload.fileHintDocument}
      submitLabel={label}
      camera
    >
      {(errors) => (
        <>
          <input type="hidden" name="documentType" value={type} />
          {type === "kbis" && (
            <Field
              id={id("dateEmission")}
              label={t.dateEmission}
              name="dateEmission"
              type="date"
              errors={errors.dateEmission}
            />
          )}
          {(type === "decennale" || type === "rc_pro") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={id("assureur")}
                label={t.assureur}
                name="assureur"
                errors={errors.assureur}
              />
              <Field id={id("numero")} label={t.numero} name="numero" errors={errors.numero} />
              <Field
                id={id("dateFin")}
                label={t.dateFin}
                name="dateFin"
                type="date"
                errors={errors.dateFin}
              />
              {type === "decennale" && (
                <Field
                  id={id("couverture")}
                  label={t.couverture}
                  name="couverture"
                  placeholder={t.couverturePlaceholder}
                  errors={errors.couverture}
                />
              )}
            </div>
          )}
          {type === "urssaf" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={id("dateEmission")}
                label={t.dateEmission}
                name="dateEmission"
                type="date"
                errors={errors.dateEmission}
              />
              <Field
                id={id("numero")}
                label={t.securityCode}
                name="numero"
                hint={t.securityCodeHint}
                errors={errors.numero}
              />
            </div>
          )}
          {type === "identite" && (
            <Field
              id={id("dateFin")}
              label={t.dateFinIdentite}
              name="dateFin"
              type="date"
              errors={errors.dateFin}
            />
          )}
        </>
      )}
    </UploadForm>
  );
}
