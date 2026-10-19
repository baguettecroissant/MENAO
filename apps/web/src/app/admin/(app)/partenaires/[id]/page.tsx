import { partnerBanners, partnerLinks, partnerSnippets, partnerTotals } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  CancelCommissionForm,
  PartnerForm,
  PartnerPageForm,
  PayCommissionsForm,
  RenewDashboardForm,
} from "@/components/admin/partner-forms";
import { BannerKit } from "@/components/banner-kit";
import { CopySnippet } from "@/components/copy-snippet";
import { SummaryTile, SummaryTiles } from "@/components/admin/money";
import { Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { getPartner, type PartnerCommission } from "@/lib/admin/partners";
import { formatDay } from "@/lib/format";

const t = fr.admin.partners;
const k = t.commissions;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TONES = {
  en_attente: "primary",
  validee: "warning",
  payee: "success",
  annulee: "neutral",
} as const;

export const metadata: Metadata = { title: `${t.editTitle} — ${fr.admin.title}` };

function detail(c: PartnerCommission): string {
  switch (c.status) {
    case "en_attente":
      return k.validateAfter(formatDay(c.validate_after));
    case "validee":
      return c.validated_at ? k.validatedOn(formatDay(c.validated_at)) : "";
    case "payee":
      return c.paid_at ? k.paidOn(formatDay(c.paid_at), c.payout_reference ?? "") : "";
    case "annulee":
      return k.cancelled(c.cancel_reason ?? "");
  }
}

/**
 * Fiche d'un partenaire (F-59, ADR 0136) : liens à diffuser, chiffres, commissions (virement,
 * annulation) et coordonnées. Réservé aux admins.
 */
export default async function AdminPartnerPage({ params }: PageProps<"/admin/partenaires/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const data = await getPartner(supabase, id);
  if (!data) notFound();
  const { partner, commissions, projects, artisans } = data;
  const links = partnerLinks(env.NEXT_PUBLIC_SITE_URL, partner.code);
  const kit = partnerSnippets(env.NEXT_PUBLIC_SITE_URL, partner.code);
  const totals = partnerTotals(commissions);
  const payable = commissions.filter((c) => c.status === "validee");

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/partenaires" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.back}
      </TextLink>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-medium tracking-tight">
          {partner.nom}
          {partner.status === "suspendu" && (
            <StatusBadge tone="neutral">{t.status.suspendu}</StatusBadge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {partner.code} · SIRET {partner.siret}
        </p>
      </div>

      <SummaryTiles label={t.editTitle}>
        <SummaryTile label={t.columns.projects} value={projects.toLocaleString("fr-FR")} />
        <SummaryTile label={t.columns.artisans} value={artisans.toLocaleString("fr-FR")} />
        <SummaryTile
          label={t.columns.pending}
          value={euros.format(totals.en_attente.cents / 100)}
          hint={k.status.en_attente}
        />
        <SummaryTile
          label={t.columns.validated}
          value={euros.format(totals.validee.cents / 100)}
          tone={totals.validee.count > 0 ? "warning" : "default"}
        />
      </SummaryTiles>

      <Card className="flex flex-col gap-3">
        <CardTitle title={t.links.title} description={t.links.note} />
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {(
            [
              [t.links.clients, links.clients],
              [t.links.pros, links.pros],
            ] as const
          ).map(([label, url]) => (
            <div key={url} className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                <code className="block rounded-md bg-background px-3 py-2 text-[0.8125rem] break-all select-all">
                  {url}
                </code>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.page.title} description={t.page.lead} />
        {partner.page_publique ? (
          <CopySnippet
            id="lien-page"
            label={t.page.link}
            value={links.page}
            copyLabel={t.kit.copy}
            copiedLabel={t.kit.copied}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.page.offline}</p>
        )}
        <PartnerPageForm
          partnerId={partner.id}
          code={partner.code}
          publique={partner.page_publique}
          message={partner.page_message}
        />
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.space.title} description={t.space.lead} />
        {partner.dashboard_token ? (
          <CopySnippet
            id="lien-espace"
            label={t.space.link}
            value={`${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/espace-partenaire/${partner.dashboard_token}`}
            copyLabel={t.kit.copy}
            copiedLabel={t.kit.copied}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.space.none}</p>
        )}
        <RenewDashboardForm partnerId={partner.id} exists={Boolean(partner.dashboard_token)} />
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.kit.title} description={t.kit.lead} />
        {(
          [
            ["kit-lien", t.kit.link, kit.link],
            ["kit-bouton", t.kit.button, kit.button],
            ["kit-widget", t.kit.widget, kit.widget],
            ["kit-iframe", t.kit.iframe, kit.iframe],
          ] as const
        ).map(([id, label, value]) => (
          <CopySnippet
            key={id}
            id={id}
            label={label}
            value={value}
            copyLabel={t.kit.copy}
            copiedLabel={t.kit.copied}
          />
        ))}
        <p className="text-xs text-muted-foreground">{t.kit.disclosure}</p>
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={fr.partnerBanners.title} description={fr.partnerBanners.lead} />
        <BannerKit
          banners={partnerBanners(env.NEXT_PUBLIC_SITE_URL, partner.code)}
          copyLabel={t.kit.copy}
          copiedLabel={t.kit.copied}
        />
      </Card>

      <Card className="flex flex-col gap-4 overflow-x-auto">
        <CardTitle
          title={k.title}
          action={
            <TextLink
              href={`/admin/partenaires/export?partenaire=${partner.id}` as Route}
              className="text-sm"
              prefetch={false}
            >
              {k.export}
            </TextLink>
          }
        />
        {payable.length > 0 && (
          <div className="flex flex-col gap-2 rounded-card border border-warning/30 bg-warning-soft p-4">
            <p className="text-sm font-medium">{k.payTitle}</p>
            <p className="text-sm">
              {k.payLead(payable.length, euros.format(totals.validee.cents / 100))}
            </p>
            <PayCommissionsForm partnerId={partner.id} commissionIds={payable.map((c) => c.id)} />
          </div>
        )}
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{k.empty}</p>
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {k.columns.date}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {k.columns.kind}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {k.columns.amount}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {k.columns.status}
                </th>
                <th scope="col" className="py-2 pl-3 font-medium">
                  {k.columns.detail}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {commissions.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="py-3 pr-3 whitespace-nowrap">{formatDay(c.created_at)}</td>
                  <td className="px-3 py-3">{k.kind[c.kind]}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {euros.format(c.amount_cents / 100)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={TONES[c.status]}>{k.status[c.status]}</StatusBadge>
                  </td>
                  <td className="flex flex-col gap-2 py-3 pl-3 text-muted-foreground">
                    {detail(c)}
                    {(c.status === "en_attente" || c.status === "validee") && (
                      <CancelCommissionForm partnerId={partner.id} commissionId={c.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle title={t.editTitle} />
        <PartnerForm partner={partner} />
      </Card>
    </div>
  );
}
