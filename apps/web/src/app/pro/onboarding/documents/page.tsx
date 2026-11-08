import {
  MONITORED_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  daysUntil,
  documentIsValid,
  expiryStatus,
} from "@menao/core";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { Check, Lock } from "lucide-react";
import { sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { recheckRegistry, setDecennaleExempt } from "@/lib/artisan/actions";
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

/**
 * Documents du dossier (F-14, F-51). Avec `?type=`, une seule pièce, ouverte depuis « Faire
 * vérifier mon entreprise » (ADR 0111) ; sans, toutes (renouvellements d'un artisan validé).
 */
export default async function DocumentsStepPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: only } = await searchParams;
  const types = REQUIRED_DOCUMENT_TYPES.filter((type) => !only || type === only);
  const focused = types.length === 1;
  const { supabase, userId, artisan, documents, tradeCodes } = await getOnboardingContext();
  // Métiers déclarés, proposés avec la décennale (ADR 0116).
  const { data: trades } = await supabase
    .from("trades")
    .select("code, label")
    .in("code", tradeCodes.length ? tradeCodes : ["-"])
    .order("sort_order");
  const exempt = artisan.decennale_non_soumis;
  const onboarding = artisan.status === "brouillon" || artisan.status === "refuse";
  // Artisan validé ou suspendu : renouvellement des documents surveillés (F-51).
  const renewal = artisan.status === "valide" || artisan.status === "suspendu";

  // URL signées de courte durée (5 min) : les documents restent privés (spec F-43).
  const paths = documents.map((d) => d.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(paths, 300)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  // Refonte « Nette » (ADR 0254) : une pièce à gauche, ce que l'équipe vérifie à droite.
  const cards = (
    <div className="flex flex-col gap-6">
      <p className="text-label">{focused ? fr.pro.onboarding.documents.photoHint : t.intro}</p>
      {artisan.status === "en_verification" && (
        <Alert tone="success">{fr.pro.onboarding.upload.status.locked}</Alert>
      )}
      {types.map((type) => {
        const rows = documents
          .filter((d) => d.type === type)
          .sort((a, b) => (a.status === "valide" ? -1 : b.status === "valide" ? 1 : 0));
        const current = rows.find((d) => d.status === "valide") ?? rows[0];
        const pending = rows.find((d) => d !== current);
        const monitored = (MONITORED_DOCUMENT_TYPES as readonly string[]).includes(type);
        // Kbis remplacé par la fiche de vérification au registre (ADR 0217) : rien à déposer.
        const registry = current?.source === "registre" && current.status === "valide";
        const registryFailed =
          type === "kbis" && onboarding && !current && artisan.registre_statut !== null
            ? (t.registry.reasons[artisan.registre_statut] ?? null)
            : null;
        const canUpload = (onboarding || (renewal && monitored)) && !registry;
        return (
          <Card key={type}>
            <section aria-labelledby={`doc-${type}`} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id={`doc-${type}`} className="text-lg">
                  {t.types[type]}
                </h2>
                <span
                  className={`rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                    !current && type === "decennale" && exempt
                      ? chip.en_attente
                      : chip[current?.status ?? "missing"]
                  }`}
                >
                  {current
                    ? t.statuses[current.status]
                    : type === "decennale" && exempt
                      ? fr.pro.onboarding.dossier.states.exempt
                      : t.missing}
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
                      {doc.source === "registre" && doc.date_emission && (
                        <p className="text-sm">
                          {t.registry.verified(formatDate(doc.date_emission))}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {[
                          doc.assureur,
                          doc.numero,
                          doc.source !== "registre" &&
                            doc.date_emission &&
                            t.issuedOn(formatDate(doc.date_emission)),
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
                              {doc.source === "registre" ? t.registry.view : t.view}
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
              {registryFailed && (
                <div className="flex flex-col gap-2">
                  <Alert tone="info">{registryFailed}</Alert>
                  <form action={recheckRegistry}>
                    <button
                      type="submit"
                      className="min-h-touch text-sm font-semibold text-primary-strong underline underline-offset-4"
                    >
                      {t.registry.recheck}
                    </button>
                  </form>
                </div>
              )}
              {type === "decennale" && onboarding && (
                <div className="flex flex-col gap-2 rounded-card bg-primary-softer p-4 text-sm">
                  {exempt ? (
                    <Alert tone="info">{t.exemptDeclared}</Alert>
                  ) : (
                    <>
                      <p className="font-semibold">{t.exemptTitle}</p>
                      <p className="text-muted-foreground">{t.exemptText}</p>
                    </>
                  )}
                  <form action={setDecennaleExempt}>
                    <input type="hidden" name="value" value={exempt ? "non" : "oui"} />
                    <button
                      type="submit"
                      className="min-h-touch font-semibold text-primary-strong underline underline-offset-4"
                    >
                      {exempt ? t.exemptCancel : t.exemptDeclare}
                    </button>
                  </form>
                </div>
              )}
              {canUpload && !(type === "decennale" && exempt) && (
                <DocumentUpload
                  type={type}
                  userId={userId}
                  trades={type === "decennale" ? (trades ?? []) : undefined}
                  label={renewal ? t.renew : current ? t.replace : t.send}
                />
              )}
            </section>
          </Card>
        );
      })}
    </div>
  );
  if (!focused) return <div className="max-w-3xl">{cards}</div>;
  const focusedType = types[0];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {cards}
      <aside className="flex flex-col gap-4">
        {focusedType && (
          // Pas de « region » ici : la page d'une pièce n'en compte qu'une (la pièce elle-même).
          <div className={sheetCard}>
            <h2 className="text-[1.0625rem]">{t.checksTitle}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-label">
              {t.checks[focusedType].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {fr.pro.onboarding.dossier.privacy}
        </p>
        <ButtonLink href="/pro/onboarding" variant="outline" block>
          {t.backToDossier}
        </ButtonLink>
      </aside>
    </div>
  );
}
