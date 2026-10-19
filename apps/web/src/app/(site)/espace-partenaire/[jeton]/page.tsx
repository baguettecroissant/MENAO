import { partnerLinks, partnerSnippets } from "@menao/core";
import { parsePartnerDashboard } from "@menao/validation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopySnippet } from "@/components/copy-snippet";
import { PageHero } from "@/components/site/page-hero";
import { Alert, Card, CardTitle } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.partnerSpace;
const TOKEN = /^[0-9a-f]{48}$/;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// Lien privé : lu à chaque visite, jamais mis en cache.
export const dynamic = "force-dynamic";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-medium tracking-tight tabular-nums">{value}</dd>
      {hint && <dd className="text-xs text-subtle-foreground">{hint}</dd>}
    </div>
  );
}

/**
 * Espace partenaire (F-59, lot 2, ADR 0139) : lu sans compte grâce au jeton du lien privé.
 * Résultats, primes, montants, liens et kit ; aucune donnée personnelle des clients ou artisans.
 */
export default async function PartnerSpacePage({
  params,
}: PageProps<"/espace-partenaire/[jeton]">) {
  const { jeton } = await params;
  if (!TOKEN.test(jeton)) notFound();
  const { data } = await createPublicClient().rpc("partner_dashboard", { p_token: jeton });
  const dashboard = parsePartnerDashboard(data);
  if (!dashboard) notFound();
  const site = env.NEXT_PUBLIC_SITE_URL;
  const links = partnerLinks(site, dashboard.code);
  const kit = partnerSnippets(site, dashboard.code);
  const n = (value: number) => value.toLocaleString("fr-FR");
  const money = (cents: number) => euros.format(cents / 100);
  const rate = (cents: number | null, text: (amount: string) => string) =>
    cents === null ? t.rateNotSet : text(money(cents));
  const copy = { copyLabel: t.copy, copiedLabel: t.copied };

  return (
    <main className="bg-background">
      <PageHero id="espace-partenaire" eyebrow={t.eyebrow} title={dashboard.nom} tone="soft" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
        {dashboard.status === "suspendu" && <Alert tone="error">{t.suspended}</Alert>}

        <section aria-labelledby="resultats" className="flex flex-col gap-3">
          <h2 id="resultats" className="text-lg font-medium">
            {t.resultsTitle}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label={t.projects} value={n(dashboard.projects)} hint={t.projectsHint} />
            <Tile label={t.qualified} value={n(dashboard.qualified)} hint={t.qualifiedHint} />
            <Tile label={t.artisans} value={n(dashboard.artisans)} hint={t.artisansHint} />
            <Tile label={t.paying} value={n(dashboard.paying)} hint={t.payingHint} />
          </dl>
        </section>

        <section aria-labelledby="primes" className="flex flex-col gap-3">
          <h2 id="primes" className="text-lg font-medium">
            {t.moneyTitle}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Tile
              label={t.pending}
              value={money(dashboard.pending_cents)}
              hint={t.pendingHint(dashboard.delai_validation_jours)}
            />
            <Tile
              label={t.validated}
              value={money(dashboard.validated_cents)}
              hint={t.validatedHint}
            />
            <Tile label={t.paid} value={money(dashboard.paid_cents)} />
          </dl>
          <Card className="flex flex-col gap-2 text-sm">
            <CardTitle title={t.ratesTitle} as="h3" />
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>{rate(dashboard.montant_demande_centimes, t.rateDemande)}</li>
              <li>{rate(dashboard.montant_abonne_centimes, t.rateAbonne)}</li>
            </ul>
            <p className="text-muted-foreground">{t.invoice(fr.prelaunch.contact.email)}</p>
          </Card>
        </section>

        <Card className="flex flex-col gap-4">
          <CardTitle title={t.linksTitle} />
          <CopySnippet id="lien-clients" label={t.linkClients} value={links.clients} {...copy} />
          <CopySnippet id="lien-pros" label={t.linkPros} value={links.pros} {...copy} />
        </Card>

        <Card className="flex flex-col gap-4">
          <CardTitle title={t.kitTitle} description={t.kitLead} />
          <CopySnippet id="kit-lien" label={t.kitLink} value={kit.link} {...copy} />
          <CopySnippet id="kit-bouton" label={t.kitButton} value={kit.button} {...copy} />
          <CopySnippet id="kit-widget" label={t.kitWidget} value={kit.widget} {...copy} />
          <CopySnippet id="kit-iframe" label={t.kitIframe} value={kit.iframe} {...copy} />
          <p className="text-xs text-muted-foreground">{t.disclosure}</p>
        </Card>

        <p className="text-xs text-muted-foreground">{t.privateLink}</p>
      </div>
    </main>
  );
}
