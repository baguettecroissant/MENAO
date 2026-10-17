import {
  REQUIRED_DOCUMENT_TYPES,
  artisanVisibility,
  chantiersByStage,
  documentIsValid,
  parisToday,
  requestRates,
  rgeConfirmation,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "@menao/core";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { adminRefreshRge, verifyCertification } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { getArtisanActivity } from "@/lib/admin/people";
import { documentLogoUrl } from "@/lib/documents/logo";
import { RGE_REFRESH_STATUSES, type RgeRefreshStatus } from "@/lib/rge";
import { DecisionForm, DocumentReview } from "./review-forms";
import { RadiationForm } from "./radiation-form";
import { SuspensionForm } from "./suspension-form";

const t = fr.admin.detail;
const docT = fr.pro.onboarding.documents;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export default async function AdminArtisanPage({
  params,
  searchParams,
}: PageProps<"/admin/artisans/[id]">) {
  const { id } = await params;
  const { rge } = (await searchParams) as { rge?: string };
  const rgeStatus = (RGE_REFRESH_STATUSES as readonly string[]).includes(rge ?? "")
    ? (rge as RgeRefreshStatus)
    : null;
  const { supabase } = await requireAdmin();

  const { data: artisan } = await supabase.from("artisans").select("*").eq("id", id).maybeSingle();
  if (!artisan) notFound();

  const [
    profile,
    trades,
    workTypes,
    zones,
    certifications,
    documents,
    photos,
    reviews,
    tradeRef,
    workTypeRef,
    subscription,
    charter,
    rgeRows,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, avatar_path")
      .eq("user_id", artisan.user_id)
      .single(),
    supabase.from("artisan_trades").select("trade_code").eq("artisan_id", id),
    supabase.from("artisan_work_types").select("work_type_code").eq("artisan_id", id),
    supabase.from("artisan_zones").select("code_insee, nom").eq("artisan_id", id).order("nom"),
    supabase
      .from("certifications")
      .select("id, type, numero, date_fin, verified_at")
      .eq("artisan_id", id),
    supabase
      .from("artisan_documents")
      .select(
        "id, type, storage_path, status, date_emission, date_fin, numero, assureur, couverture, covered_trades, refusal_reason",
      )
      .eq("artisan_id", id),
    supabase
      .from("artisan_photos")
      .select("id, storage_path")
      .eq("artisan_id", id)
      .order("sort_order"),
    supabase
      .from("artisan_reviews")
      .select("id, decision, message, created_at")
      .eq("artisan_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("trades").select("code, label"),
    supabase.from("work_types").select("code, label"),
    supabase
      .from("subscriptions")
      .select("plan_code, status, trial_end, current_period_end, cancel_at_period_end, plans(nom)")
      .eq("artisan_id", id)
      .maybeSingle(),
    // Charte qualité signée (ADR 0104), dernière version.
    supabase
      .from("artisan_charter_acceptances")
      .select(
        "version, engagement_version, signer_name, company, siret, signature_path, accepted_at",
      )
      .eq("artisan_id", id)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Qualifications RGE lues dans l'annuaire de l'ADEME (ADR 0118).
    supabase
      .from("artisan_rge_qualifications")
      .select("id, organisme, nom_certificat, nom_qualification, domaine, date_fin, url_certificat")
      .eq("artisan_id", id)
      .order("domaine"),
  ]);
  // Logo des documents (ADR 0038) : visible de l'équipe, sans validation préalable.
  const [logoUrl, activity] = await Promise.all([
    documentLogoUrl(supabase, artisan.logo_path),
    getArtisanActivity(supabase, artisan.id),
  ]);

  const docs = documents.data ?? [];
  const { data: signed } = docs.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(
        docs.map((d) => d.storage_path),
        300,
      )
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const publicUrl = (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const declaredTrades = (trades.data ?? []).map((tr) => tr.trade_code);
  const today = parisToday();
  const rgeList = (rgeRows.data ?? []).map((r) => ({
    ...r,
    certificate: r.nom_certificat,
    endsOn: r.date_fin,
  }));
  const label = (ref: { code: string; label: string }[] | null, code: string) =>
    ref?.find((r) => r.code === code)?.label ?? code;
  const pending = artisan.status === "en_verification";
  // Documents examinables : dossier en vérification, ou renouvellement d'un artisan validé/suspendu.
  const reviewable = pending || artisan.status === "valide" || artisan.status === "suspendu";
  const allDocsValid = REQUIRED_DOCUMENT_TYPES.every((type) => {
    const d = docs.find((x) => x.type === type && x.status === "valide");
    return (
      d?.status === "valide" &&
      documentIsValid(type, {
        status: d.status,
        dateEmission: d.date_emission,
        dateFin: d.date_fin,
      })
    );
  });
  const p = profile.data;
  const name = artisan.nom_commercial ?? artisan.raison_sociale ?? artisan.siret ?? artisan.id;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/artisans"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        ← {t.back}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium tracking-tight">{name}</h1>
        <span className="rounded-chip bg-primary-soft px-3 py-1 text-sm text-primary">
          {(artisan.status === "suspendu" &&
            t.suspensionReasons[artisan.suspension_reason as keyof typeof t.suspensionReasons]) ||
            fr.admin.status[artisan.status]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t.company}>
          <dl className="grid gap-2">
            <Info label={fr.pro.onboarding.company.raisonSociale} value={artisan.raison_sociale} />
            <Info label="SIRET" value={artisan.siret} />
            <Info
              label={fr.pro.onboarding.company.formeJuridique}
              value={
                artisan.forme_juridique_code &&
                (fr.formesJuridiques[artisan.forme_juridique_code] ?? artisan.forme_juridique_code)
              }
            />
            <Info label={fr.pro.onboarding.company.ape} value={artisan.ape_code} />
            {artisan.ape_eligible === false && (
              <p className="text-sm text-warning">{fr.admin.list.apeWarning}</p>
            )}
            <Info
              label={fr.pro.onboarding.company.address}
              value={[artisan.adresse_ligne, artisan.adresse_code_postal, artisan.adresse_commune]
                .filter(Boolean)
                .join(" ")}
            />
            <Info label={t.tva} value={artisan.assujetti_tva ? artisan.tva_intracom : t.tvaNo} />
            <Info
              label="INSEE"
              value={
                artisan.sirene_checked_at &&
                `${artisan.sirene_active ? "active" : "fermée"} · ${dateTime.format(new Date(artisan.sirene_checked_at))}`
              }
            />
          </dl>
        </Section>

        <Section title={t.contact}>
          <dl className="grid gap-2">
            <Info label={fr.signUp.firstName} value={p?.first_name ?? null} />
            <Info label={fr.signUp.lastName} value={p?.last_name ?? null} />
            <Info label={t.phone} value={p?.phone ?? null} />
          </dl>
        </Section>

        <Section title={t.trades}>
          <p>
            {(trades.data ?? []).map((tr) => label(tradeRef.data, tr.trade_code)).join(", ") || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            {(workTypes.data ?? [])
              .map((w) => label(workTypeRef.data, w.work_type_code))
              .join(", ")}
          </p>
          <p className="text-sm">{t.experience(artisan.experience_years)}</p>
        </Section>

        <Section title={t.zone}>
          <p>
            {artisan.zone_mode === "rayon"
              ? t.zoneRayon(artisan.base_label, artisan.radius_km)
              : (zones.data ?? []).map((z) => z.nom).join(", ") || "—"}
          </p>
        </Section>
      </div>

      <Section title={t.certifications}>
        <ul className="flex flex-col gap-2">
          {(certifications.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {fr.certificationTypes[c.type]} · {c.numero} ·{" "}
                {docT.validUntil(day.format(new Date(c.date_fin)))}
                {c.verified_at && <span className="ml-2 text-success">✓ {t.certVerified}</span>}
                <CertificationRgeHint type={c.type} rows={rgeList} today={today} />
              </span>
              <form action={verifyCertification}>
                <input type="hidden" name="certificationId" value={c.id} />
                <input type="hidden" name="artisanId" value={artisan.id} />
                <input type="hidden" name="verified" value={c.verified_at ? "false" : "true"} />
                <button
                  type="submit"
                  className="min-h-touch text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {c.verified_at ? t.certUnverify : t.certVerify}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t.rge}>
        <div className="flex flex-col gap-3">
          {rgeStatus && (
            <Alert tone={rgeStatus === "ok" ? "success" : "error"}>{t.rgeStatus[rgeStatus]}</Alert>
          )}
          {rgeList.length === 0 ? (
            <p className="text-muted-foreground">
              {artisan.rge_checked_at ? t.rgeNone : t.rgeNever}
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {rgeList.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.domaine}</span>
                  {" · "}
                  <span className="text-muted-foreground">
                    {[r.nom_certificat ?? r.organisme, r.nom_qualification]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    {r.date_fin < today
                      ? t.rgeExpired
                      : docT.validUntil(day.format(new Date(r.date_fin)))}
                  </span>
                  {r.url_certificat && (
                    <>
                      {" · "}
                      <a
                        href={r.url_certificat}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline"
                      >
                        {t.rgeCertificate}
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {artisan.rge_checked_at && (
              <span className="text-muted-foreground">
                {t.rgeCheckedOn(dateTime.format(new Date(artisan.rge_checked_at)))}
              </span>
            )}
            <form action={adminRefreshRge}>
              <input type="hidden" name="artisanId" value={artisan.id} />
              <button
                type="submit"
                className="min-h-touch font-medium text-primary underline-offset-2 hover:underline"
              >
                {t.rgeRefresh}
              </button>
            </form>
          </div>
        </div>
      </Section>

      <Section title={t.charter}>
        {charter.data ? (
          <div className="flex flex-col gap-2">
            <p>
              {t.charterSigned(
                day.format(new Date(charter.data.accepted_at)),
                charter.data.version,
                charter.data.signer_name,
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.charterIdentity(charter.data.company, charter.data.siret)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.engagementSigned(charter.data.engagement_version)}
            </p>
            <svg
              viewBox="0 0 600 150"
              role="img"
              aria-label={t.charterSignature}
              className="h-24 w-full max-w-md rounded-input border border-border bg-input"
            >
              <path
                d={charter.data.signature_path}
                fill="none"
                stroke="#111728"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <p className="text-muted-foreground">{t.charterMissing}</p>
        )}
      </Section>

      <Section title={t.documents}>
        <ul className="flex flex-col gap-4">
          {REQUIRED_DOCUMENT_TYPES.map((type) => {
            const rows = docs.filter((x) => x.type === type && x.status !== "remplace");
            return (
              <li
                key={type}
                aria-label={docT.types[type]}
                className="flex flex-col gap-3 rounded-button border border-border p-3"
              >
                <span className="font-medium">{docT.types[type]}</span>
                {type === "decennale" && artisan.decennale_non_soumis && (
                  <p className="text-sm font-medium text-warning">{t.decennaleExempt}</p>
                )}
                {rows.length === 0 && <span className="text-sm">{t.docMissing}</span>}
                {rows.map((d) => {
                  const url = urlByPath.get(d.storage_path);
                  return (
                    <div key={d.id} className="flex flex-col gap-2">
                      <p className="text-sm">
                        <span className="font-medium">
                          {docT.statuses[d.status as keyof typeof docT.statuses]}
                        </span>
                        {" · "}
                        <span className="text-muted-foreground">
                          {[
                            d.assureur,
                            d.numero,
                            d.couverture,
                            d.date_emission && docT.issuedOn(day.format(new Date(d.date_emission))),
                            d.date_fin && docT.validUntil(day.format(new Date(d.date_fin))),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
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
                              {docT.view}
                            </a>
                          </>
                        )}
                      </p>
                      {type === "decennale" && d.covered_trades && (
                        <CoveredTrades
                          covered={d.covered_trades}
                          declared={declaredTrades}
                          labelOf={(code) => label(tradeRef.data, code)}
                        />
                      )}
                      {d.refusal_reason && (
                        <p className="text-sm text-danger">
                          {docT.refusedBecause(d.refusal_reason)}
                        </p>
                      )}
                      {reviewable && d.status === "en_attente" && (
                        <DocumentReview documentId={d.id} artisanId={artisan.id} />
                      )}
                    </div>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t.profile}>
        <div className="flex flex-col gap-4">
          {p?.avatar_path && (
            <Image
              src={publicUrl("avatars", p.avatar_path)}
              alt={fr.pro.onboarding.profile.avatarAlt}
              width={96}
              height={96}
              className="size-24 rounded-full border border-border object-cover"
            />
          )}
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4)
            <img
              src={logoUrl}
              alt={fr.documentLogo.alt(artisan.nom_commercial ?? artisan.raison_sociale ?? "")}
              className="h-auto max-h-16 w-auto max-w-48 self-start rounded-input border border-border bg-surface object-contain p-2"
            />
          )}
          <p className="whitespace-pre-line">{artisan.presentation ?? "—"}</p>
          {(photos.data ?? []).length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(photos.data ?? []).map((ph, i) => (
                <li key={ph.id}>
                  <Image
                    src={publicUrl("portfolio", ph.storage_path)}
                    alt={fr.pro.onboarding.profile.portfolioAlt(i + 1)}
                    width={300}
                    height={225}
                    className="aspect-4/3 w-full rounded-button object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title={t.visibility}>
        {(() => {
          const v = artisanVisibility({
            status: artisan.status,
            subscriptionActive: subscriptionGrantsAccess(
              (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
            ),
            connectChargesEnabled: artisan.connect_charges_enabled,
          });
          return (
            <>
              <p className={v.visible ? "font-medium text-success" : "font-medium"}>
                {v.visible ? t.visible : t.hiddenBecause(v.missing.join(", "))}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.connect(artisan.connect_charges_enabled, artisan.connect_payouts_enabled)}
              </p>
            </>
          );
        })()}
      </Section>

      <Section title={t.subscription}>
        {subscription.data ? (
          <p>
            {[
              subscription.data.plans?.nom ?? subscription.data.plan_code ?? "—",
              t.subscriptionStatus[subscription.data.status] ?? subscription.data.status,
              subscription.data.status === "trialing" && subscription.data.trial_end
                ? t.trialUntil(day.format(new Date(subscription.data.trial_end)))
                : null,
              subscription.data.cancel_at_period_end && subscription.data.current_period_end
                ? t.cancelAt(day.format(new Date(subscription.data.current_period_end)))
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="text-muted-foreground">{t.noSubscription}</p>
        )}
      </Section>

      <Section title={fr.admin.activity.title}>
        {activity &&
          (() => {
            const a = fr.admin.activity;
            const rates = requestRates({
              accepted: activity.demandes.acceptees,
              refused: activity.demandes.refusees,
              expired: activity.demandes.expirees,
            });
            const stages = chantiersByStage(activity.chantiers);
            const ongoing =
              stages.demande + stages.devis + stages.travaux + stages.reception + stages.litige;
            return (
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Info label={a.requests} value={String(activity.demandes.total)} />
                <Info label={a.pending} value={String(activity.demandes.en_attente)} />
                <Info label={a.accepted} value={String(activity.demandes.acceptees)} />
                <Info label={a.refused} value={String(activity.demandes.refusees)} />
                <Info label={a.expired} value={String(activity.demandes.expirees)} />
                <Info
                  label={a.responseRate}
                  value={rates.response === null ? null : fr.review.percent(rates.response)}
                />
                <Info label={a.chantiers} value={String(ongoing)} />
                <Info label={a.finished} value={String(stages.termine)} />
                <Info label={a.reviews} value={String(activity.avis.publies)} />
                <Info
                  label={a.average}
                  value={
                    activity.avis.note_moyenne === null
                      ? null
                      : fr.review.percent(activity.avis.note_moyenne)
                  }
                />
              </dl>
            );
          })()}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link
            href={`/admin/personnes/${artisan.user_id}` as Route}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {fr.admin.activity.account} →
          </Link>
          <Link
            href={`/admin/chantiers?q=${encodeURIComponent(name)}` as Route}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {fr.admin.activity.seeChantiers} →
          </Link>
        </div>
      </Section>

      <Section title={fr.admin.suspension.title}>
        <SuspensionForm
          artisanId={artisan.id}
          status={artisan.status}
          suspensionReason={artisan.suspension_reason}
        />
      </Section>

      <Section title={fr.admin.radiation.title}>
        <RadiationForm
          artisanId={artisan.id}
          radiatedAt={artisan.radiated_at}
          reason={artisan.radiation_reason}
        />
      </Section>

      <Section title={t.decision}>
        {pending ? (
          <DecisionForm artisanId={artisan.id} canValidate={allDocsValid} />
        ) : (
          <p>{t.decisionNotPending}</p>
        )}
      </Section>

      <Section title={t.history}>
        {(reviews.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t.noHistory}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(reviews.data ?? []).map((r) => (
              <li key={r.id}>
                <span className="font-medium">{t.decisions[r.decision]}</span> ·{" "}
                {dateTime.format(new Date(r.created_at))}
                {r.message && (
                  <span className="block text-sm text-muted-foreground">{r.message}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <section aria-label={title} className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{title}</h2>
        {children}
      </section>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string | null | false | undefined }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-muted-foreground">{label} :</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

/** Décennale : métiers couverts selon l'artisan, et métiers déclarés non couverts (ADR 0116). */
function CoveredTrades({
  covered,
  declared,
  labelOf,
}: {
  covered: string[];
  declared: string[];
  labelOf: (code: string) => string;
}) {
  const uncovered = declared.filter((code) => !covered.includes(code));
  return (
    <>
      {covered.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.coverage(covered.map(labelOf).join(", "))}
        </p>
      )}
      {uncovered.length > 0 && (
        <p className="text-sm font-medium text-warning">
          {t.uncovered(uncovered.map(labelOf).join(", "))}
        </p>
      )}
    </>
  );
}

/** Aide à la vérification d'une certification déclarée : l'annuaire RGE la confirme-t-il ? */
function CertificationRgeHint({
  type,
  rows,
  today,
}: {
  type: string;
  rows: { organisme: string; certificate: string | null; endsOn: string }[];
  today: string;
}) {
  if (type === "autre") return null;
  const match = rgeConfirmation(type, rows, today);
  return match ? (
    <span className="block text-sm text-success">
      {t.certRgeConfirmed(match.certificate ?? match.organisme, day.format(new Date(match.endsOn)))}
    </span>
  ) : (
    <span className="block text-sm text-muted-foreground">{t.certRgeUnknown}</span>
  );
}
