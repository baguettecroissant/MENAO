import {
  REQUIRED_DOCUMENT_TYPES,
  artisanVisibility,
  documentIsValid,
  subscriptionGrantsAccess,
  type SubscriptionStatus,
} from "@menao/core";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { verifyCertification } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/guard";
import { documentLogoUrl } from "@/lib/documents/logo";
import { DecisionForm, DocumentReview } from "./review-forms";

const t = fr.admin.detail;
const docT = fr.pro.onboarding.documents;
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export default async function AdminArtisanPage({ params }: PageProps<"/admin/artisans/[id]">) {
  const { id } = await params;
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
        "id, type, storage_path, status, date_emission, date_fin, numero, assureur, couverture, refusal_reason",
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
  ]);
  // Logo des documents (ADR 0038) : visible de l'équipe, sans validation préalable.
  const logoUrl = await documentLogoUrl(supabase, artisan.logo_path);

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
          {fr.admin.statuses[artisan.status]}
          {artisan.suspension_reason &&
            ` — ${t.suspensionReasons[artisan.suspension_reason as keyof typeof t.suspensionReasons]}`}
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
