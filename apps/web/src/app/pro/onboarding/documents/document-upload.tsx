"use client";

import type { RequiredDocumentType } from "@menao/core";
import { CheckboxField, Field } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.documents;

export function DocumentUpload({
  type,
  userId,
  label,
  trades,
}: {
  type: RequiredDocumentType;
  userId: string;
  label: string;
  /** Décennale : métiers de l'artisan, à cocher s'ils sont couverts (ADR 0116). */
  trades?: { code: string; label: string }[];
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
          {type === "decennale" && trades && trades.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium">{t.coverageLegend}</legend>
              {trades.map((trade) => (
                <CheckboxField
                  key={trade.code}
                  id={id(`trade-${trade.code}`)}
                  name="coveredTrades"
                  value={trade.code}
                  defaultChecked
                >
                  {trade.label}
                </CheckboxField>
              ))}
              <p className="text-sm text-muted-foreground">{t.coverageHint}</p>
            </fieldset>
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
