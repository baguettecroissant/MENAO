import { partnerBanners, partnerLinks, partnerSnippets } from "@menao/core";
import type { PartnerDashboard } from "@menao/validation";
import { ChevronRight, Lock } from "lucide-react";
import { BannerKit } from "@/components/banner-kit";
import { CopyField } from "@/components/copy-snippet";
import { PartnerKitTabs } from "@/components/partner/partner-kit-tabs";
import { PageHero } from "@/components/site/page-hero";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.partnerSpace;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const n = (value: number) => value.toLocaleString("fr-FR");
const card = "rounded-card border border-border bg-surface shadow-card";

/**
 * Espace partenaire (F-59, ADR 0139 ; maquette du lot 38) : résultats en une carte, primes en
 * trois étapes (en attente, à facturer, payées) avec les montants, liens à copier à droite, kit en
 * onglets avec son aperçu, bannières en vignettes. Aucune donnée personnelle.
 */
export function PartnerSpaceView({
  dashboard,
  site,
}: {
  dashboard: PartnerDashboard;
  site: string;
}) {
  const links = partnerLinks(site, dashboard.code);
  const kit = partnerSnippets(site, dashboard.code);
  const copy = { copyLabel: t.copy, copiedLabel: t.copied };
  const rate = (cents: number | null, text: (amount: string) => string) =>
    cents === null ? t.rateNotSet : text(money(cents));
  const results = [
    { label: t.projects, value: dashboard.projects, hint: t.projectsHint },
    { label: t.qualified, value: dashboard.qualified, hint: t.qualifiedHint },
    { label: t.artisans, value: dashboard.artisans, hint: t.artisansHint },
    { label: t.paying, value: dashboard.paying, hint: t.payingHint },
  ];
  const steps = [
    {
      label: t.pending,
      value: dashboard.pending_cents,
      hint: t.pendingHint(dashboard.delai_validation_jours),
      tone: "bg-background",
      dot: "bg-border text-label",
    },
    {
      label: t.validated,
      value: dashboard.validated_cents,
      hint: t.validatedHint,
      tone: "bg-primary-soft",
      dot: "bg-primary text-white",
    },
    {
      label: t.paid,
      value: dashboard.paid_cents,
      hint: null,
      tone: "bg-background",
      dot: "bg-success text-white",
    },
  ];

  return (
    <main className="bg-background">
      <PageHero id="espace-partenaire" eyebrow={t.eyebrow} title={dashboard.nom} tone="soft" />
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {dashboard.status === "suspendu" && <Alert tone="error">{t.suspended}</Alert>}

          <section aria-labelledby="resultats" className="flex flex-col gap-3">
            <h2 id="resultats" className="text-xl font-semibold">
              {t.resultsTitle}
            </h2>
            <dl className={`grid grid-cols-2 overflow-hidden lg:grid-cols-4 ${card}`}>
              {results.map((r, i) => (
                <div
                  key={r.label}
                  className={`flex flex-col gap-1.5 p-4 sm:p-5 ${i % 2 ? "border-l border-border" : ""} ${i > 1 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
                >
                  <dt className="text-sm font-semibold text-label">{r.label}</dt>
                  <dd className="font-display text-[1.75rem] leading-none font-bold tracking-[-0.03em] tabular-nums sm:text-[2rem]">
                    {n(r.value)}
                  </dd>
                  <dd className="text-xs text-muted-foreground">{r.hint}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="primes" className={`flex flex-col gap-4 p-5 sm:p-6 ${card}`}>
            <h2 id="primes" className="text-lg font-semibold">
              {t.moneyTitle}
            </h2>
            <ol className="flex flex-col gap-2.5 md:flex-row md:items-stretch">
              {steps.map((step, i) => (
                <li
                  key={step.label}
                  className="flex flex-1 flex-col gap-2.5 md:flex-row md:items-stretch"
                >
                  <div className={`flex flex-1 flex-col gap-1.5 rounded-card p-4 ${step.tone}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-label">
                      <span
                        aria-hidden="true"
                        className={`flex size-5 items-center justify-center rounded-md text-xs font-bold ${step.dot}`}
                      >
                        {i + 1}
                      </span>
                      {step.label}
                    </span>
                    <span className="font-display text-[1.75rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
                      {money(step.value)}
                    </span>
                    {step.hint && (
                      <span className="text-xs text-muted-foreground">{step.hint}</span>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight
                      aria-hidden="true"
                      className="hidden size-5 shrink-0 self-center text-muted-foreground md:block"
                    />
                  )}
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:gap-6">
              <div className="flex flex-1 flex-col gap-1">
                <h3 className="text-sm font-semibold">{t.ratesTitle}</h3>
                <p className="text-sm text-label">
                  {rate(dashboard.montant_demande_centimes, t.rateDemande)}
                </p>
                <p className="text-sm text-label">
                  {rate(dashboard.montant_abonne_centimes, t.rateAbonne)}
                </p>
              </div>
              <p className="flex-[1.3] text-[0.8125rem] text-muted-foreground">
                {t.invoice(fr.prelaunch.contact.email)}
              </p>
            </div>
          </section>

          <section aria-labelledby="kit" className={`flex flex-col gap-4 p-5 sm:p-6 ${card}`}>
            <div className="flex flex-col gap-1">
              <h2 id="kit" className="text-lg font-semibold">
                {t.kitTitle}
              </h2>
              <p className="text-sm text-muted-foreground">{t.kitLead}</p>
            </div>
            <PartnerKitTabs kit={kit} widgetUrl={`/widget?p=${dashboard.code}`} />
            <p className="text-xs text-muted-foreground">{t.disclosure}</p>
          </section>

          <section aria-labelledby="bannieres" className={`flex flex-col gap-4 p-5 sm:p-6 ${card}`}>
            <div className="flex flex-col gap-1">
              <h2 id="bannieres" className="text-lg font-semibold">
                {fr.partnerBanners.title}
              </h2>
              <p className="text-sm text-muted-foreground">{fr.partnerBanners.lead}</p>
            </div>
            <BannerKit banners={partnerBanners(site, dashboard.code)} variant="grid" {...copy} />
          </section>
        </div>

        <aside
          aria-labelledby="liens"
          className={`order-first flex flex-col gap-4 p-5 lg:sticky lg:top-24 lg:order-none ${card}`}
        >
          <h2 id="liens" className="text-lg font-semibold">
            {t.linksTitle}
          </h2>
          {dashboard.page_publique && (
            <CopyField id="lien-page" label={t.pageLink} value={links.page} {...copy} />
          )}
          <CopyField id="lien-clients" label={t.linkClients} value={links.clients} {...copy} />
          <CopyField id="lien-pros" label={t.linkPros} value={links.pros} {...copy} />
          <p className="flex gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {t.privateLink}
          </p>
        </aside>
      </div>
    </main>
  );
}
