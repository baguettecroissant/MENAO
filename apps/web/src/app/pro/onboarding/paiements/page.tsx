import { GuideStepBar } from "@/components/pro/guide-step-bar";
import {
  type ConnectOverview,
  collectedTotals,
  connectAccountStatus,
  connectOnboardingOpen,
  connectRequirementGroups,
  parisToday,
  stripeIdentitySides,
} from "@menao/core";
import { Lock } from "lucide-react";
import { Alert, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { loadConnectPrefill } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { formatDay } from "@/lib/format";
import { ConnectOverviewPanel } from "./connect-overview";
import { ConnectStatusPanel } from "./connect-status";
import { PaymentHow } from "./payment-how";
import { StripeChecklist } from "./stripe-checklist";

const t = fr.pro.onboarding.connect;

/**
 * Étape 6 — compte de paiement Stripe Connect (paiements directs, ADR 0011), ouverte dès le début
 * du dossier (ADR 0353). Dit en clair ce que Stripe attend encore (rubriques lisibles, date limite)
 * ou qu'il vérifie les informations.
 */
export default async function PaymentsStepPage(props: PageProps<"/pro/onboarding/paiements">) {
  return (
    <>
      <PaymentsStepContent {...props} />
      {/* Parcours guidé (ADR 0376) : continuer, ou remettre l'étape à plus tard. */}
      <GuideStepBar step="paiements" />
    </>
  );
}

async function PaymentsStepContent({ searchParams }: PageProps<"/pro/onboarding/paiements">) {
  const params = await searchParams;
  const context = await getOnboardingContext();
  const { supabase } = context;
  let { artisan } = context;

  if (!connectOnboardingOpen(artisan.status)) {
    return (
      <Card>
        <p>{t.notValidated}</p>
      </Card>
    );
  }

  // Retour depuis Stripe (ou « Actualiser ») : relit l'état du compte sans attendre le webhook.
  if (params.retour === "1" && artisan.stripe_account_id && !artisan.connect_charges_enabled) {
    await supabase.functions.invoke("connect-onboarding", {
      method: "POST",
      body: { action: "refresh" },
    });
    const { data } = await supabase.from("artisans").select("*").eq("id", artisan.id).single();
    if (data) artisan = data;
  }

  const status = connectAccountStatus({
    hasAccount: artisan.stripe_account_id !== null,
    chargesEnabled: artisan.connect_charges_enabled,
    detailsSubmitted: artisan.connect_details_submitted,
    requirementsDue: artisan.connect_requirements_due,
    requirementsPending: artisan.connect_requirements_pending,
    disabledReason: artisan.connect_disabled_reason,
  });
  // Premier passage : de quoi pré-remplir le compte Stripe avant sa création (ADR 0204, 0215).
  const prefill = status === "a_demarrer" ? await loadConnectPrefill().catch(() => null) : null;
  // Pièce d'identité déposée en image et transmissible (ADR 0378) : jointe au pré-remplissage,
  // pour le dirigeant ou l'entrepreneur individuel.
  const personal = prefill?.person != null || prefill?.account?.business_type === "individual";
  const piece = context.documents.find((d) => d.type === "identite" && d.status !== "refuse");
  const pieceShared =
    personal &&
    piece !== undefined &&
    stripeIdentitySides({
      share: piece.partage_stripe,
      mimeType: piece.mime_type,
      versoMimeType: piece.verso_mime_type,
    }).length > 0;
  // Compte actif : solde, virements et encaissé via MENAO (ADR 0152), lus en parallèle.
  const money =
    status === "actif"
      ? await Promise.all([
          supabase.functions.invoke<{ status: string; overview?: ConnectOverview }>(
            "connect-overview",
            { method: "POST", body: {} },
          ),
          supabase.from("payments").select("amount_cents, paid_at").eq("status", "paye"),
        ]).then(([overview, payments]) => ({
          overview: overview.data?.overview ?? null,
          collected: collectedTotals(
            (payments.data ?? []).map((p) => ({ amountCents: p.amount_cents, paidAt: p.paid_at })),
            parisToday(),
          ),
        }))
      : null;
  // Refonte « Nette » (ADR 0254) : la configuration à gauche, comment l'argent arrive à droite.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex flex-col gap-4">
        <Card>
          <section aria-labelledby="paiements" className="flex flex-col gap-4">
            <h2 id="paiements" className="text-lg">
              {fr.pro.onboarding.steps.paiements}
            </h2>
            {params.lien === "expire" && <Alert tone="error">{t.linkExpired}</Alert>}
            <ConnectStatusPanel
              status={status}
              payoutsEnabled={artisan.connect_payouts_enabled}
              due={connectRequirementGroups(artisan.connect_requirements_due)}
              pending={connectRequirementGroups(artisan.connect_requirements_pending)}
              deadline={
                artisan.connect_requirements_deadline
                  ? formatDay(artisan.connect_requirements_deadline)
                  : null
              }
              prefill={prefill}
              today={parisToday()}
              userId={context.userId}
              sent={{
                company: prefill?.account?.business_type === "company",
                identity: personal,
                piece: pieceShared,
              }}
            />
          </section>
        </Card>
        {/* Ouvert dès le début du dossier (ADR 0353) : ce qui attend encore la validation. */}
        {(artisan.status === "brouillon" || artisan.status === "en_verification") && (
          <p className="flex items-start gap-3 rounded-card bg-primary-softer px-4 py-3.5 text-sm text-primary-strong">
            <Lock aria-hidden="true" className="mt-0.5 size-[1.0625rem] shrink-0" />
            {t.beforeValidation}
          </p>
        )}
        {money && (
          <Card>
            <ConnectOverviewPanel overview={money.overview} collected={money.collected} />
          </Card>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {/* Avant le formulaire Stripe (ADR 0347) : ce qu'il demande, à garder sous la main. */}
        {status === "a_demarrer" && <StripeChecklist withoutIdentity={pieceShared} />}
        <PaymentHow />
      </div>
    </div>
  );
}
