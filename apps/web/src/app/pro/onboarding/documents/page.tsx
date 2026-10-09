import { REQUIRED_DOCUMENT_TYPES, documentIsValid } from "@menao/core";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { DocumentUpload } from "./document-upload";

const t = fr.pro.onboarding.documents;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDate = (d: string) => dateFormat.format(new Date(d));

export default async function DocumentsStepPage() {
  const { supabase, userId, artisan, documents } = await getOnboardingContext();
  const editable = artisan.status === "brouillon" || artisan.status === "refuse";

  // URL signées de courte durée (5 min) : les documents restent privés (spec F-43).
  const paths = documents.map((d) => d.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(paths, 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t.intro}</p>
      {!editable && <Alert tone="success">{fr.pro.onboarding.upload.status.locked}</Alert>}
      {REQUIRED_DOCUMENT_TYPES.map((type) => {
        const doc = documents.find((d) => d.type === type);
        const snapshot = doc && {
          status: doc.status,
          dateEmission: doc.date_emission,
          dateFin: doc.date_fin,
        };
        const valid = documentIsValid(type, snapshot ?? undefined);
        const url = doc ? urlByPath.get(doc.storage_path) : undefined;
        return (
          <Card key={type}>
            <section aria-labelledby={`doc-${type}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id={`doc-${type}`} className="text-lg font-semibold">
                  {t.types[type]}
                </h2>
                <span
                  className={`rounded-chip px-3 py-1 text-sm ${
                    !doc
                      ? "bg-warning-soft text-warning"
                      : doc.status === "refuse"
                        ? "bg-danger-soft text-danger"
                        : doc.status === "valide"
                          ? "bg-success-soft text-success"
                          : "bg-primary-soft text-primary"
                  }`}
                >
                  {doc ? t.statuses[doc.status] : t.missing}
                </span>
              </div>
              {doc && (
                <p className="text-sm text-muted-foreground">
                  {[
                    doc.assureur,
                    doc.numero,
                    doc.date_emission && t.issuedOn(formatDate(doc.date_emission)),
                    doc.date_fin && t.validUntil(formatDate(doc.date_fin)),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {url && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {t.view}
                      </a>
                    </>
                  )}
                </p>
              )}
              {doc?.status === "refuse" && doc.refusal_reason && (
                <Alert tone="error">{t.refusedBecause(doc.refusal_reason)}</Alert>
              )}
              {doc && doc.status !== "refuse" && !valid && (
                <Alert tone="error">{t.invalidNow}</Alert>
              )}
              {editable && <DocumentUpload type={type} userId={userId} replace={Boolean(doc)} />}
            </section>
          </Card>
        );
      })}
    </div>
  );
}
