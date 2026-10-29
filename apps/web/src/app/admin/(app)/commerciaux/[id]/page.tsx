import { COMMERCIAL_BONUS_KINDS, COMMERCIAL_BONUS_STATUSES, formatZoneCodes } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import {
  CancelCommercialBonusForm,
  CommercialTransferForm,
  CommercialZoneForm,
  PayCommercialBonusesForm,
} from "@/components/admin/commercial-forms";
import { Alert, Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { formatDay } from "@/lib/format";

const t = fr.admin.commercials;
const tr = fr.admin.commercialResults;
const d = tr.detail;
// Libellés partagés : types et états des primes (espace commercial), colonnes et détails des
// primes (programme Partenaires, mêmes états), statut d'un dossier d'artisan.
const kindLabel = fr.commercialResults.bonuses.kind;
const statusLabel = fr.commercialResults.bonuses.status;
const k = fr.admin.partners.commissions;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PAY_FORM = "primes-a-payer";
const BONUS_TONES = {
  en_attente: "primary",
  validee: "warning",
  payee: "success",
  annulee: "neutral",
} as const;
const ARTISAN_TONES: Record<string, "success" | "primary" | "neutral" | "danger"> = {
  valide: "success",
  en_verification: "primary",
  refuse: "danger",
  suspendu: "danger",
  radie: "danger",
};

// Fiche renvoyée par admin_commercial_detail (F-65, lot 3, ADR 0207).
const n = z.number().int().nonnegative();
const detailSchema = z.object({
  id: z.string(),
  nom: z.string(),
  code: z.string(),
  status: z.enum(["actif", "suspendu"]),
  email: z.string().nullable(),
  zone_codes_postaux: z.array(z.string()),
  followed: n,
  artisans: z.array(
    z.object({
      nom: z.string().nullable(),
      status: z.string(),
      signed_up_at: z.string(),
      subscribed: z.boolean(),
    }),
  ),
  bonuses: z.array(
    z.object({
      id: z.string(),
      artisan: z.string().nullable(),
      kind: z.enum(COMMERCIAL_BONUS_KINDS),
      amount_cents: n.nullable(),
      status: z.enum(COMMERCIAL_BONUS_STATUSES),
      validate_after: z.string(),
      validated_at: z.string().nullable(),
      paid_at: z.string().nullable(),
      payout_reference: z.string().nullable(),
      cancel_reason: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
});
type Bonus = z.infer<typeof detailSchema>["bonuses"][number];

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

function bonusDetail(b: Bonus): string {
  switch (b.status) {
    case "en_attente":
      return fr.commercialResults.bonuses.checkOn(formatDay(b.validate_after));
    case "validee":
      return b.validated_at ? k.validatedOn(formatDay(b.validated_at)) : "";
    case "payee":
      return b.paid_at ? k.paidOn(formatDay(b.paid_at), b.payout_reference ?? "") : "";
    case "annulee":
      return k.cancelled(b.cancel_reason ?? "");
  }
}

/**
 * Fiche d'un commercial (F-65, lot 3, ADR 0207) : zone de prospection, transfert ou libération de
 * ses prospects, artisans inscrits avec son code, primes (virement des primes cochées,
 * annulation). Réservé aux admins.
 */
export default async function AdminCommercialPage({
  params,
  searchParams,
}: PageProps<"/admin/commerciaux/[id]">) {
  const { id } = await params;
  // Retour d'une action (transfert, libération, paiement, annulation) : message de réussite.
  const query = await searchParams;
  const done = typeof query.fait === "string" ? query.fait : null;
  const count = Number(typeof query.n === "string" ? query.n : 0) || 0;
  const doneMessage =
    done === "transfert"
      ? d.transferred(count)
      : done === "liberation"
        ? d.released(count)
        : done === "paiement"
          ? d.paid(count)
          : done === "annulation"
            ? d.cancelled
            : null;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data }, { data: list }] = await Promise.all([
    supabase.rpc("admin_commercial_detail", { p_id: id }),
    supabase.rpc("admin_commercials"),
  ]);
  // Commercial introuvable : la fonction renvoie null.
  const parsed = detailSchema.safeParse(data);
  if (!parsed.success) notFound();
  const m = parsed.data;
  const others = (list ?? [])
    .filter((o) => o.status === "actif" && o.id !== m.id)
    .map((o) => ({ id: o.id, nom: o.nom }));
  const payable = m.bonuses.some((b) => b.status === "validee");

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/commerciaux" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {d.back}
      </TextLink>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-medium tracking-tight">
          {m.nom}
          <StatusBadge tone={m.status === "actif" ? "success" : "neutral"}>
            {t.status[m.status]}
          </StatusBadge>
        </h1>
        <p className="text-sm break-all text-muted-foreground">
          <span className="font-mono">{m.code}</span>
          {m.email && ` · ${m.email}`}
        </p>
      </div>

      {doneMessage && <Alert tone="success">{doneMessage}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle title={d.zone} />
          <CommercialZoneForm commercialId={m.id} zone={formatZoneCodes(m.zone_codes_postaux)} />
        </Card>
        <Card className="flex flex-col gap-4">
          <CardTitle title={d.transfer} description={d.transferLead(m.followed)} />
          {m.followed > 0 && <CommercialTransferForm commercialId={m.id} others={others} />}
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <CardTitle title={d.artisans} />
        {m.artisans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.artisansEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {m.artisans.map((a, i) => (
              <li
                key={`${a.signed_up_at}-${i}`}
                className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{a.nom ?? fr.commercialSpace.signups.unnamed}</span>
                  <span className="text-xs text-muted-foreground">
                    {fr.commercialSpace.signups.since(formatDay(a.signed_up_at))}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <StatusBadge tone={ARTISAN_TONES[a.status] ?? "neutral"}>
                    {fr.admin.status[a.status as keyof typeof fr.admin.status] ?? a.status}
                  </StatusBadge>
                  {a.subscribed && <StatusBadge tone="success">{k.kind.abonne_payant}</StatusBadge>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="primes" className="flex scroll-mt-24 flex-col gap-4 overflow-x-auto">
        <CardTitle title={d.bonuses} />
        {m.bonuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{d.bonusesEmpty}</p>
        ) : (
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                {payable && (
                  <th scope="col" className="w-8 py-2 pr-3 font-medium">
                    <span className="sr-only">{d.markPaid}</span>
                  </th>
                )}
                <th scope="col" className="py-2 pr-3 font-medium">
                  {k.columns.date}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {fr.admin.subscriptions.columns.artisan}
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
              {m.bonuses.map((b) => {
                const artisan = b.artisan ?? "—";
                return (
                  <tr key={b.id} className="align-top">
                    {payable && (
                      <td className="py-3 pr-3">
                        {b.status === "validee" && (
                          // Case reliée au formulaire de virement, sous le tableau.
                          <input
                            type="checkbox"
                            form={PAY_FORM}
                            name="bonus"
                            value={b.id}
                            defaultChecked
                            aria-label={d.select(`${kindLabel[b.kind]}, ${artisan}`)}
                            className="size-[1.125rem] rounded accent-primary"
                          />
                        )}
                      </td>
                    )}
                    <td className="py-3 pr-3 whitespace-nowrap">{formatDay(b.created_at)}</td>
                    <td className="px-3 py-3">{artisan}</td>
                    <td className="px-3 py-3">{kindLabel[b.kind]}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {b.amount_cents == null ? "—" : euros.format(b.amount_cents / 100)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={BONUS_TONES[b.status]}>
                        {statusLabel[b.status]}
                      </StatusBadge>
                    </td>
                    <td className="flex flex-col gap-2 py-3 pl-3 text-muted-foreground">
                      {bonusDetail(b)}
                      {(b.status === "en_attente" || b.status === "validee") && (
                        <CancelCommercialBonusForm commercialId={m.id} bonusId={b.id} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {payable && (
          <div className="rounded-card border border-warning/30 bg-warning-soft p-4">
            <PayCommercialBonusesForm formId={PAY_FORM} commercialId={m.id} />
          </div>
        )}
      </Card>
    </div>
  );
}
