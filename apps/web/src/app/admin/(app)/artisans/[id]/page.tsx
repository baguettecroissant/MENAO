import {
  REQUIRED_DOCUMENT_TYPES,
  adminReviewChecklist,
  artisanPageUrl,
  artisanVisibility,
  chantiersByStage,
  documentIsValid,
  parisToday,
  partnerLinks,
  requestRates,
  rgeConfirmation,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
  territoryLabel,
} from "@menao/core";
import { menaoScorePartsSchema } from "@menao/validation";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GoogleReviewsForm } from "@/components/admin/google-reviews-form";
import { MenaoScore } from "@/components/artisan-profile/menao-score";
import { Alert, StatusBadge } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { adminRefreshRge, verifyCertification } from "@/lib/admin/actions";
import { ReadOnlyBanner } from "@/components/admin/read-only";
import { requireTeam } from "@/lib/admin/guard";
import { getLeadTargets } from "@/lib/admin/lead-targets";
import { getArtisanActivity } from "@/lib/admin/people";
import { getArtisanReferral, type ArtisanReferral } from "@/lib/admin/referrals";
import { documentLogoUrl } from "@/lib/documents/logo";
import { formatDay } from "@/lib/format";
import { RGE_REFRESH_STATUSES, type RgeRefreshStatus } from "@/lib/rge";
import { ArtisanLeadTargetForm } from "@/components/admin/lead-target-forms";
import {
  LeadAlertBadges,
  LeadBar,
  LeadHistory,
  LeadStatusBadge,
} from "@/components/admin/lead-targets";
import { PillTabs } from "@/components/admin/admin-tabs";
import { AccountActions } from "../../personnes/[id]/account-actions";
import { DocumentsSection } from "./documents-section";
import { DecisionForm } from "./review-forms";
import { sheetCard } from "@/components/pro/sheet";
import { RadiationForm } from "./radiation-form";
import { SuspensionForm } from "./suspension-form";

const t = fr.admin.detail;
const ARTISAN_TABS = ["verification", "entreprise", "activite", "compte"] as const;
type ArtisanTab = (typeof ARTISAN_TABS)[number];
const sc = fr.admin.spotChecks;
const month = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
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
  const { rge, onglet } = (await searchParams) as { rge?: string; onglet?: string };
  const rgeStatus = (RGE_REFRESH_STATUSES as readonly string[]).includes(rge ?? "")
    ? (rge as RgeRefreshStatus)
    : null;
  const { supabase, role } = await requireTeam();
  // Accès (ADR 0286) : l'admin voit tout ; le support consulte sans agir (ni documents, ni
  // décision, ni argent) ; la vérification traite le dossier (onglets Vérification et Entreprise).
  const isAdmin = role === "admin";
  const readOnly = role === "support";

  const { data: artisan } = await supabase.from("artisans").select("*").eq("id", id).maybeSingle();
  if (!artisan) notFound();

  const [
    profile,
    trades,
    workTypes,
    zones,
    territories,
    certifications,
    documents,
    photos,
    reviews,
    tradeRef,
    workTypeRef,
    subscription,
    charter,
    rgeRows,
    spotChecks,
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
      .from("artisan_territories")
      .select("departement_code, region_code")
      .eq("artisan_id", id),
    supabase
      .from("certifications")
      .select("id, type, numero, date_fin, verified_at")
      .eq("artisan_id", id),
    supabase
      .from("artisan_documents")
      .select(
        "id, type, source, storage_path, mime_type, status, created_at, date_emission, date_fin, numero, assureur, couverture, covered_trades, refusal_reason, verified_at, verified_by",
      )
      .eq("artisan_id", id),
    supabase
      .from("artisan_photos")
      .select("id, storage_path")
      .eq("artisan_id", id)
      .order("sort_order"),
    supabase
      .from("artisan_reviews")
      .select("id, decision, message, created_at, admin_id")
      .eq("artisan_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("trades").select("code, label"),
    supabase.from("work_types").select("code, label"),
    supabase
      .from("subscriptions")
      .select(
        "plan_code, status, trial_end, current_period_end, cancel_at_period_end, past_due_since, plans(nom)",
      )
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
    // Contrôles aléatoires du dossier (ADR 0121).
    supabase
      .from("artisan_spot_checks")
      .select("id, period, result, note, insurer_called, checked_at")
      .eq("artisan_id", id)
      .order("period", { ascending: false }),
  ]);
  // Logo des documents (ADR 0038) : visible de l'équipe, sans validation préalable.
  const [
    logoUrl,
    activity,
    referral,
    { data: scoreData },
    { data: starterMonth },
    leads,
    { data: ownLeadTarget },
  ] = await Promise.all([
    documentLogoUrl(supabase, artisan.logo_path),
    // Onglet Activité : admin et support ; parrainage, mois offert et objectif : admin seulement.
    role !== "verification" ? getArtisanActivity(supabase, artisan.id) : null,
    isAdmin ? getArtisanReferral(supabase, artisan.id) : null,
    // Score MENAO (ADR 0155).
    role !== "verification"
      ? supabase.rpc("admin_artisan_menao_score", { p_artisan_id: artisan.id })
      : { data: null },
    // Mois offert de démarrage (ADR 0160).
    isAdmin
      ? supabase
          .from("artisan_free_months")
          .select("created_at, applied_at")
          .eq("artisan_id", artisan.id)
          .eq("reason", "demarrage")
          .maybeSingle()
      : { data: null },
    // Objectif de demandes (ADR 0282).
    isAdmin ? getLeadTargets(supabase, { artisanId: artisan.id }) : null,
    isAdmin
      ? supabase
          .from("artisan_lead_targets")
          .select("objectif")
          .eq("artisan_id", artisan.id)
          .maybeSingle()
      : { data: null },
  ]);
  const lead = leads?.artisans[0] ?? null;
  const menaoScore = menaoScorePartsSchema.safeParse(scoreData).data ?? null;

  const docs = documents.data ?? [];
  const { data: signed } = docs.length
    ? await supabase.storage.from("artisan-documents").createSignedUrls(
        docs.map((d) => d.storage_path),
        300,
      )
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  // Auteurs des décisions (documents, dossier) : historique (ADR 0120).
  const deciderIds = [
    ...new Set(
      [...docs.map((d) => d.verified_by), ...(reviews.data ?? []).map((r) => r.admin_id)].filter(
        (v): v is string => Boolean(v),
      ),
    ),
  ];
  const { data: deciders } = deciderIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", deciderIds)
    : { data: [] };
  const deciderNames = new Map(
    (deciders ?? []).map((d) => [
      d.user_id,
      [d.first_name, d.last_name].filter(Boolean).join(" ") || null,
    ]),
  );
  const reviewerName = (userId: string | null) =>
    userId ? (deciderNames.get(userId) ?? null) : null;
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
  // « Ce qui reste à vérifier » (ADR 0133) : mêmes règles que le dossier (`@menao/core`).
  const checklist = adminReviewChecklist({
    documents: docs,
    decennaleExempt: artisan.decennale_non_soumis,
    validated: artisan.status === "valide" || artisan.status === "suspendu",
    certifications: certifications.data ?? [],
    siretVerified: artisan.sirene_checked_at !== null,
    sireneActive: artisan.sirene_active,
    charterSigned: charter.data !== null,
  });
  const checklistItems = [
    checklist.pendingDocuments > 0 && t.checklist.pendingDocuments(checklist.pendingDocuments),
    checklist.refusedDocuments > 0 && t.checklist.refusedDocuments(checklist.refusedDocuments),
    checklist.missingDocuments > 0 && t.checklist.missingDocuments(checklist.missingDocuments),
    checklist.pendingCertifications > 0 &&
      t.checklist.pendingCertifications(checklist.pendingCertifications),
    checklist.siret === "unchecked" && t.checklist.siretUnchecked,
    checklist.siret === "inactive" && t.checklist.siretInactive,
    !checklist.charterSigned && t.checklist.charterMissing,
  ].filter((item): item is string => Boolean(item));
  // Quatre onglets (ADR 0285) : la vérification tant que le dossier est en attente ou qu'un
  // document (renouvellement) ou une certification attend l'équipe, sinon l'activité.
  const awaitingReview = checklist.pendingDocuments > 0 || checklist.pendingCertifications > 0;
  // Onglets selon l'accès (ADR 0286) : la vérification n'a ni Activité ni Compte, le support pas
  // le Compte (actions sur la connexion).
  const tabs = ARTISAN_TABS.filter((key) =>
    role === "verification"
      ? key === "verification" || key === "entreprise"
      : role === "support"
        ? key !== "compte"
        : true,
  );
  const tab: ArtisanTab =
    tabs.find((key) => key === onglet) ??
    (role === "verification" || (!readOnly && (pending || rgeStatus || awaitingReview))
      ? "verification"
      : "activite");
  const base = `/admin/artisans/${artisan.id}`;
  // Compte de connexion (connexion bloquée ou non), lu seulement pour l'onglet Compte.
  const account =
    tab === "compte"
      ? await supabase
          .rpc("admin_user_account", { p_user_id: artisan.user_id })
          .then(({ data, error }) => {
            if (error) return null;
            const until = (data as { banned_until?: string | null } | null)?.banned_until ?? null;
            return { banned: Boolean(until && new Date(until) > new Date()) };
          })
      : null;
  const sub = subscription.data;
  // Repères de l'en-tête : objectif et abonnement pour l'admin, score aussi pour le support.
  const summary = [
    role !== "verification" && {
      label: t.summary.score,
      value: menaoScore ? `${menaoScore.score} / 100` : "—",
    },
    isAdmin && {
      label: t.summary.leads,
      value:
        lead && lead.progress.target !== null
          ? t.summary.leadsValue(lead.progress.received, lead.progress.target)
          : "—",
    },
    isAdmin && {
      label: t.summary.subscription,
      value: sub
        ? `${sub.plans?.nom ?? sub.plan_code} · ${t.subscriptionStatus[sub.status as keyof typeof t.subscriptionStatus] ?? sub.status}`
        : t.noSubscription,
    },
    { label: t.summary.signedUp, value: formatDay(artisan.created_at) },
  ].filter((item) => item !== false);

  const documentsSection = (
    <Section id="documents" title={t.documents}>
      <DocumentsSection
        documents={docs}
        urlByPath={urlByPath}
        reviewable={reviewable}
        artisanId={artisan.id}
        decennaleExempt={artisan.decennale_non_soumis}
        company={{
          name: artisan.raison_sociale,
          siret: artisan.siret,
          signer: charter.data?.signer_name ?? null,
          address:
            [artisan.adresse_ligne, artisan.adresse_code_postal, artisan.adresse_commune]
              .filter(Boolean)
              .join(" ") || null,
        }}
        declaredTrades={declaredTrades}
        tradeLabel={(code) => label(tradeRef.data, code)}
        reviewerName={reviewerName}
      />
    </Section>
  );
  const decisionSection = (
    <Section id="decision" title={t.decision}>
      {pending ? (
        <DecisionForm artisanId={artisan.id} canValidate={allDocsValid} />
      ) : (
        <p>{t.decisionNotPending}</p>
      )}
    </Section>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/artisans"
        className="inline-flex items-center gap-1 self-start rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        ← {t.back}
      </Link>
      {/* En-tête (ADR 0284 → 0285) : l'essentiel de l'artisan, puis les quatre onglets de la fiche. */}
      <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary-strong"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          <h1 className="text-[1.75rem] leading-[1.05] sm:text-[2.25rem]">{name}</h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-bold ${
              pending ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary-strong"
            }`}
          >
            {(artisan.status === "suspendu" &&
              t.suspensionReasons[artisan.suspension_reason as keyof typeof t.suspensionReasons]) ||
              fr.admin.status[artisan.status]}
          </span>
          {artisan.siret && (
            <span className="font-mono text-sm text-muted-foreground">{artisan.siret}</span>
          )}
          {pending && !readOnly && (
            <Link
              href={`${base}?onglet=verification#decision` as Route}
              className="ml-auto inline-flex min-h-10 items-center rounded-pill bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none lg:hidden"
            >
              {t.decide}
            </Link>
          )}
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {summary.map((item) => (
            <div key={item.label} className="flex flex-col">
              <dt className="text-[0.75rem] font-semibold text-muted-foreground">{item.label}</dt>
              <dd className="font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
        <PillTabs
          label={t.tabs.label}
          current={tab}
          tabs={tabs.map((key) => ({
            key,
            href: `${base}?onglet=${key}`,
            label: t.tabs[key],
            count:
              key === "verification" && pending && !readOnly ? checklistItems.length : undefined,
          }))}
        />
      </div>
      {readOnly && <ReadOnlyBanner />}

      {tab === "verification" && (
        // Le dossier à gauche, la décision collée à droite tant qu'il est en attente (ADR 0252).
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Le support ne lit pas les documents : ni liste des points, ni documents, ni décision. */}
            {!readOnly && (
              <Section id="a-verifier" title={t.checklist.title} tone="highlight">
                {checklistItems.length === 0 ? (
                  <p className="text-success">
                    {pending ? t.checklist.ready : t.checklist.readyValidated}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {checklistItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-warning"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {!readOnly && documentsSection}

            <Section title={t.certifications}>
              <ul className="flex flex-col gap-2">
                {(certifications.data ?? []).map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {fr.certificationTypes[c.type]} · {c.numero} ·{" "}
                      {docT.validUntil(day.format(new Date(c.date_fin)))}
                      {c.verified_at && (
                        <span className="ml-2 text-success">✓ {t.certVerified}</span>
                      )}
                      <CertificationRgeHint type={c.type} rows={rgeList} today={today} />
                    </span>
                    {!readOnly && (
                      <form action={verifyCertification}>
                        <input type="hidden" name="certificationId" value={c.id} />
                        <input type="hidden" name="artisanId" value={artisan.id} />
                        <input
                          type="hidden"
                          name="verified"
                          value={c.verified_at ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className="min-h-touch text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {c.verified_at ? t.certUnverify : t.certVerify}
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t.rge}>
              <div className="flex flex-col gap-3">
                {rgeStatus && (
                  <Alert tone={rgeStatus === "ok" ? "success" : "error"}>
                    {t.rgeStatus[rgeStatus]}
                  </Alert>
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
                  {!readOnly && (
                    <form action={adminRefreshRge}>
                      <input type="hidden" name="artisanId" value={artisan.id} />
                      <button
                        type="submit"
                        className="min-h-touch font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {t.rgeRefresh}
                      </button>
                    </form>
                  )}
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

            {!pending && !readOnly && decisionSection}

            <Section title={sc.artisanSection}>
              {(spotChecks.data ?? []).length === 0 ? (
                <p className="text-muted-foreground">{sc.artisanNone}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(spotChecks.data ?? []).map((c) => (
                    <li key={c.id} className="flex flex-col gap-1">
                      <span>
                        <span className="font-medium">
                          {month.format(new Date(`${c.period}T00:00:00Z`))}
                        </span>
                        {" · "}
                        {c.result ? (sc.results[c.result] ?? c.result) : sc.pending}
                        {c.insurer_called ? ` · ${sc.insurerCalled}` : ""}
                      </span>
                      {c.note && <span className="text-sm text-muted-foreground">{c.note}</span>}
                      {c.result === null && !readOnly && (
                        <Link
                          href={`/admin/conformite/controles#controle-${c.id}` as Route}
                          className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {sc.artisanAction} →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Historique des décisions : journal réservé aux admins et à la vérification. */}
            {!readOnly && (
              <Section id="historique" title={t.history}>
                {(reviews.data ?? []).length === 0 ? (
                  <p className="text-muted-foreground">{t.noHistory}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(reviews.data ?? []).map((r) => (
                      <li key={r.id}>
                        <span className="font-medium">{t.decisions[r.decision]}</span> ·{" "}
                        {dateTime.format(new Date(r.created_at))}
                        {reviewerName(r.admin_id) &&
                          ` · ${t.decidedBy(reviewerName(r.admin_id) ?? "")}`}
                        {r.message && (
                          <span className="block text-sm text-muted-foreground">{r.message}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}
          </div>
          {pending && !readOnly && (
            <aside className="flex flex-col gap-6 lg:sticky lg:top-56">{decisionSection}</aside>
          )}
        </div>
      )}

      {tab === "entreprise" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="entreprise" title={t.company}>
              <dl className="grid gap-2">
                <Info
                  label={fr.pro.onboarding.company.raisonSociale}
                  value={artisan.raison_sociale}
                />
                <Info label="SIRET" value={artisan.siret} />
                <Info
                  label={fr.pro.onboarding.company.formeJuridique}
                  value={
                    artisan.forme_juridique_code &&
                    (fr.formesJuridiques[artisan.forme_juridique_code] ??
                      artisan.forme_juridique_code)
                  }
                />
                <Info label={fr.pro.onboarding.company.ape} value={artisan.ape_code} />
                {artisan.ape_eligible === false && (
                  <p className="text-sm text-warning">{fr.admin.list.apeWarning}</p>
                )}
                <Info
                  label={fr.pro.onboarding.company.address}
                  value={[
                    artisan.adresse_ligne,
                    artisan.adresse_code_postal,
                    artisan.adresse_commune,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <Info
                  label={t.tva}
                  value={artisan.assujetti_tva ? artisan.tva_intracom : t.tvaNo}
                />
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
                {(trades.data ?? []).map((tr) => label(tradeRef.data, tr.trade_code)).join(", ") ||
                  "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {(workTypes.data ?? [])
                  .map((w) => label(workTypeRef.data, w.work_type_code))
                  .join(", ")}
              </p>
              <p className="text-sm">{t.experience(artisan.experience_years)}</p>
              <p className="text-sm">
                {t.diploma(
                  artisan.diplome_metier ? fr.diplomesMetier[artisan.diplome_metier] : null,
                )}
              </p>
            </Section>

            <Section title={t.zone}>
              <p>
                {artisan.zone_mode === "rayon"
                  ? t.zoneRayon(artisan.base_label, artisan.radius_km)
                  : artisan.zone_mode === "france"
                    ? t.zoneFrance
                    : artisan.zone_mode === "departements" || artisan.zone_mode === "regions"
                      ? (territories.data ?? [])
                          .flatMap((z) => z.departement_code ?? z.region_code ?? [])
                          .map((code) => territoryLabel(artisan.zone_mode as "regions", code))
                          .join(", ") || "—"
                      : (zones.data ?? []).map((z) => z.nom).join(", ") || "—"}
              </p>
            </Section>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="profil" title={t.profile}>
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
                    alt={fr.documentLogo.alt(
                      artisan.nom_commercial ?? artisan.raison_sociale ?? "",
                    )}
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
                          className="aspect-4/3 w-full rounded-input object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

            {/* Visibilité : dépend de l'abonnement, lu par les admins seulement (ADR 0286). */}
            {isAdmin && (
              <Section title={t.visibility}>
                {(() => {
                  const v = artisanVisibility({
                    status: artisan.status,
                    subscriptionActive: subscriptionGrantsAccess(
                      (subscription.data?.status as SubscriptionStatus | undefined) ?? null,
                      subscription.data?.past_due_since ?? null,
                    ),
                    connectChargesEnabled: artisan.connect_charges_enabled,
                  });
                  return (
                    <>
                      <p className={v.visible ? "font-medium text-success" : "font-medium"}>
                        {v.visible ? t.visible : t.hiddenBecause(v.missing.join(", "))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.connect(
                          artisan.connect_charges_enabled,
                          artisan.connect_payouts_enabled,
                        )}
                      </p>
                      {/* Fiche publique et choix de l'artisan pour Google (ADR 0144). */}
                      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <Info
                          label={t.publicPage.link}
                          value={
                            artisan.slug
                              ? artisanPageUrl(env.NEXT_PUBLIC_SITE_URL, artisan.slug)
                              : t.publicPage.none
                          }
                        />
                        <Info
                          label={t.publicPage.googleLabel}
                          value={t.publicPage.google(artisan.indexable)}
                        />
                      </dl>
                    </>
                  );
                })()}
              </Section>
            )}
          </div>
        </div>
      )}

      {tab === "activite" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            {isAdmin && (
              <Section id="objectif" title={fr.admin.leads.detail.title}>
                {lead && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">
                          {fr.admin.leads.detail.thisMonth}
                        </p>
                        <LeadBar progress={lead.progress} direct={lead.direct} />
                        <div className="flex flex-wrap gap-1.5">
                          <LeadStatusBadge status={lead.progress.status} />
                          <LeadAlertBadges alerts={lead.alerts} />
                        </div>
                      </div>
                      <LeadHistory history={lead.history} />
                    </div>
                    <p className="text-sm text-label">
                      {lead.cause === "peu_choisi"
                        ? fr.admin.leads.causes.peu_choisi(lead.searches)
                        : lead.cause
                          ? fr.admin.leads.causes[lead.cause]
                          : fr.admin.leads.searches(lead.searches)}
                    </p>
                  </div>
                )}
                {leads && (
                  <ArtisanLeadTargetForm
                    artisanId={artisan.id}
                    target={ownLeadTarget?.objectif ?? null}
                    defaultTarget={leads.defaultTarget}
                  />
                )}
                <Link
                  href={"/admin/objectifs" as Route}
                  className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {fr.admin.leads.detail.seeAll} →
                </Link>
              </Section>
            )}

            <Section id="activite" title={fr.admin.activity.title}>
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
                    stages.demande +
                    stages.devis +
                    stages.travaux +
                    stages.reception +
                    stages.litige;
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
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            {isAdmin && (
              <Section id="abonnement" title={t.subscription}>
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
                {starterMonth && (
                  <p className="text-sm">
                    {t.starterMonth(
                      starterMonth.applied_at
                        ? day.format(new Date(starterMonth.applied_at))
                        : null,
                      day.format(new Date(starterMonth.created_at)),
                    )}
                  </p>
                )}
              </Section>
            )}

            <Section id="score" title={t.menaoScore.title}>
              {menaoScore && <MenaoScore score={menaoScore} />}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <h3 className="font-medium">{t.menaoScore.googleTitle}</h3>
                <p className="text-sm text-muted-foreground">{t.menaoScore.googleIntro}</p>
                <p className="text-sm">
                  {artisan.google_checked_at && artisan.google_rating !== null
                    ? t.menaoScore.current(
                        artisan.google_rating.toLocaleString("fr-FR"),
                        artisan.google_review_count ?? 0,
                        formatDay(artisan.google_checked_at),
                      )
                    : t.menaoScore.none}
                </p>
                {!readOnly && (
                  <GoogleReviewsForm
                    artisanId={artisan.id}
                    current={
                      artisan.google_url &&
                      artisan.google_rating !== null &&
                      artisan.google_review_count
                        ? {
                            url: artisan.google_url,
                            rating: artisan.google_rating,
                            count: artisan.google_review_count,
                          }
                        : null
                    }
                  />
                )}
              </div>
            </Section>

            {isAdmin && (
              <Section id="parrainage" title={t.referral.title}>
                {referral && (
                  <>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <Info label={t.referral.code} value={referral.code ?? t.referral.noCode} />
                      {referral.code && (
                        <Info
                          label={t.referral.link}
                          value={partnerLinks(env.NEXT_PUBLIC_SITE_URL, referral.code).pros}
                        />
                      )}
                      <Info
                        label={t.referral.months}
                        value={t.referral.monthsValue(
                          referral.mois_poses,
                          referral.mois_en_attente,
                          referral.mois_annee,
                        )}
                      />
                      {referral.cadeau && (
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="text-muted-foreground">{t.referral.gift} :</dt>
                          <dd className="font-medium">
                            {t.referral.giftValue(
                              fr.admin.referrals.gift[referral.cadeau.status],
                              referral.cadeau.item &&
                                fr.pro.hub.welcomeGift.summary(
                                  fr.pro.hub.welcomeGift.items[referral.cadeau.item],
                                  referral.cadeau.size,
                                ),
                            )}
                            {referral.cadeau.ticket_id && (
                              <>
                                {" · "}
                                <Link
                                  href={`/admin/tickets/${referral.cadeau.ticket_id}` as Route}
                                  className="font-medium text-primary underline-offset-2 hover:underline"
                                >
                                  {t.referral.giftTicket}
                                </Link>
                              </>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="flex flex-col gap-1 text-sm">
                      <h3 className="font-medium">{t.referral.referrer}</h3>
                      {referral.parrain ? (
                        <ReferralPerson person={referral.parrain} />
                      ) : (
                        <p className="text-muted-foreground">{t.referral.noReferrer}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <h3 className="font-medium">
                        {t.referral.referred(referral.filleuls.length)}
                      </h3>
                      {referral.filleuls.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                          {referral.filleuls.map((f) => (
                            <li key={f.id}>
                              <ReferralPerson person={f} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">{t.referral.noReferred}</p>
                      )}
                    </div>
                  </>
                )}
                <Link
                  href={"/admin/parrainages" as Route}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t.referral.seeAll} →
                </Link>
              </Section>
            )}
          </div>
        </div>
      )}

      {tab === "compte" && (
        <div className="flex flex-col gap-6">
          {/* Deux actions aux noms clairs, côte à côte (ADR 0285). */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Section title={fr.admin.suspension.title}>
              <AccessEffect effect={fr.admin.suspension.effect} keeps={fr.admin.suspension.keeps} />
              <SuspensionForm
                artisanId={artisan.id}
                status={artisan.status}
                suspensionReason={artisan.suspension_reason}
              />
            </Section>
            <Section title={t.accountTitle}>
              <AccessEffect
                effect={fr.admin.accountActions.effect}
                keeps={fr.admin.accountActions.keeps}
              />
              {account ? (
                <AccountActions userId={artisan.user_id} isArtisan suspended={account.banned} />
              ) : (
                <Alert tone="error">{fr.errors.generic}</Alert>
              )}
              <Link
                href={`/admin/personnes/${artisan.user_id}` as Route}
                className="self-start text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                {t.openAccount} →
              </Link>
            </Section>
          </div>

          <Section title={fr.admin.radiation.title}>
            <RadiationForm
              artisanId={artisan.id}
              radiatedAt={artisan.radiated_at}
              reason={artisan.radiation_reason}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

/** Ce que fait une action sur l'accès de l'artisan, et ce qui ne change pas (ADR 0285). */
function AccessEffect({ effect, keeps }: { effect: string; keeps: string }) {
  return (
    <dl className="flex flex-col gap-1 text-sm">
      <div>
        <dt className="inline font-semibold">{fr.admin.detail.effectLabel} </dt>
        <dd className="inline">{effect}</dd>
      </div>
      <div className="text-muted-foreground">
        <dt className="inline font-semibold text-label">{fr.admin.detail.keepsLabel} </dt>
        <dd className="inline">{keeps}</dd>
      </div>
    </dl>
  );
}

function Section({
  id,
  title,
  children,
  tone = "card",
}: {
  id?: string;
  title: string;
  children: ReactNode;
  /** « highlight » : fond bleu clair (points à contrôler, ADR 0252). */
  tone?: "card" | "highlight";
}) {
  return (
    // Marge de défilement : la section ne passe pas sous l'en-tête fixe (ADR 0133).
    <section
      id={id}
      aria-label={title}
      className={`scroll-mt-64 ${
        tone === "highlight"
          ? "flex flex-col gap-3 rounded-card bg-primary-soft p-5 sm:p-6"
          : sheetCard
      }`}
    >
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

/** Parrain ou filleul : lien vers sa fiche, statut du parrainage et date d'inscription. */
function ReferralPerson({ person }: { person: NonNullable<ArtisanReferral["parrain"]> }) {
  const r = fr.admin.referrals;
  const tones = { en_attente: "primary", recompense: "success", annule: "neutral" } as const;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/artisans/${person.id}` as Route}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {person.nom}
      </Link>
      <StatusBadge tone={tones[person.status]}>{r.status[person.status]}</StatusBadge>
      <span className="text-xs text-muted-foreground">
        {t.referral.since(day.format(new Date(person.created_at)))}
      </span>
    </span>
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
