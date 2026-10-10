import {
  MONITORED_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  daysUntil,
  documentIsValid,
  expiryStatus,
} from "@menao/core";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { DocumentUpload } from "./document-upload";

const t = fr.pro.onboarding.documents;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const formatDate = (d: string) => dateFormat.format(new Date(d));

const chip = {
  missing: "bg-warning-soft text-warning",
  refuse: "bg-danger-soft text-danger",
  valide: "bg-success-soft text-success",
  en_attente: "bg-primary-soft text-primary",
} as const;

export default async function DocumentsStepPage() {
  const { supabase, userId, artisan, documents } = await getOnboardingContext();
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  // Artisan validé ou suspendu : renouvellement des documents surveillés (F-51).
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";

  // URL signées de courte durée (5 min) : les documents restent privés (spec F-43).
  const paths = documents.map((d) => d.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(paths, 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t.intro}</p>
      {artisan.status === "en_verification" && (
        <Alert tone="success">{fr.pro.onboarding.upload.status.locked}</Alert>
      )}
      {REQUIRED_DOCUMENT_TYPES.map((type) => {
        const rows = documents
          .filter((d) => d.type === type)
          .sort((a, b) => (a.status === "valide" ? -1 : b.status === "valide" ? 1 : 0));
        const current = rows.find((d) => d.status === "valide") ?? rows[0];
        const pending = rows.find((d) => d !== current);
        const monitored = (MONITORED_DOCUMENT_TYPES as readonly string[]).includes(type);
        const canUpload = onboarding || (renewal && monitored);
        return (
          <Card key={type}>
            <section aria-labelledby={`doc-${type}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id={`doc-${type}`} className="text-lg font-medium">
                  {t.types[type]}
                </h2>
                <span
                  className={`rounded-chip px-3 py-1 text-sm ${chip[current?.status ?? "missing"]}`}
                >
                  {current ? t.statuses[current.status] : t.missing}
                </span>
              </div>
              {[current, pending]
                .filter((d) => d !== undefined)
                .map((doc) => {
                  const url = urlByPath.get(doc.storage_path);
                  const expiry =
                    doc.status === "valide" && monitored ? expiryStatus(doc.date_fin) : "ok";
                  const days = doc.date_fin ? daysUntil(doc.date_fin) : 0;
                  const valid = documentIsValid(type, {
                    status: doc.status,
                    dateEmission: doc.date_emission,
                    dateFin: doc.date_fin,
                  });
                  return (
                    <div key={doc.id} className="flex flex-col gap-2">
                      {renewal && (
                        <p className="text-sm font-medium">
                          {doc === current ? t.current : t.renewal} · {t.statuses[doc.status]}
                        </p>
                      )}
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
                      {expiry !== "ok" && (
                        <p
                          className={`text-sm font-medium ${expiry === "bientot" ? "text-warning" : "text-danger"}`}
                        >
                          {expiry === "expire" ? t.expiry.expire : t.expiry[expiry](days)}
                        </p>
                      )}
                      {doc.status === "refuse" && doc.refusal_reason && (
                        <Alert tone="error">{t.refusedBecause(doc.refusal_reason)}</Alert>
                      )}
                      {onboarding && doc.status !== "refuse" && !valid && (
                        <Alert tone="error">{t.invalidNow}</Alert>
                      )}
                    </div>
                  );
                })}
              {canUpload && (
                <DocumentUpload
                  type={type}
                  userId={userId}
                  label={renewal ? t.renew : current ? t.replace : t.send}
                />
              )}
            </section>
          </Card>
        );
      })}
    </div>
  );
}
