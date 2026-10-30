import { partnerLinks } from "@menao/core";
import type { Metadata, Route } from "next";
import { Pencil } from "lucide-react";
import { AcquisitionCodeForm, AcquisitionCodeLink } from "@/components/launch/figures-forms";
import { LaunchHeader } from "@/components/launch/launch-tabs";
import { Alert, ButtonLink, Card, CardTitle, Hint, StatusBadge, Tag } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { listLaunchMembers } from "@/lib/admin/launch";
import { listAcquisitionCodes } from "@/lib/admin/launch-figures";
import { qrSvg } from "@/lib/qr";

const tl = fr.admin.launch;
const c = tl.codes;

export const metadata: Metadata = { title: `${c.title} · ${tl.title} — ${fr.admin.title}` };

/**
 * Codes de suivi /p/<code> (F-66, lot 2, ADR 0209) : un code par support (publicité, flyers,
 * salon, code personnel d'un associé) pour attribuer les inscriptions d'artisans. Liste (canal,
 * responsable, état, inscrits et validés, lien d'inscription à copier et QR code), puis création
 * d'un code. Le code est définitif ; le reste se modifie sur sa page. Réservé aux admins.
 */
export default async function AdminLaunchCodesPage({
  searchParams,
}: PageProps<"/admin/lancement/codes">) {
  const query = await searchParams;
  const doneMessage =
    query.fait === "code-cree"
      ? c.done.cree
      : query.fait === "code-modifie"
        ? c.done.modifie
        : null;
  const { supabase } = await requireAdmin();
  const [codes, members] = await Promise.all([
    listAcquisitionCodes(supabase),
    listLaunchMembers(supabase),
  ]);
  const memberOptions = members.filter((m) => m.active).map((m) => ({ id: m.id, nom: m.nom }));

  return (
    <div className="flex flex-col gap-6">
      <LaunchHeader current="codes" intro={c.intro} />
      {doneMessage && <Alert tone="success">{doneMessage}</Alert>}
      <Hint>{c.help}</Hint>

      <section aria-labelledby="codes-suivi" className="flex flex-col gap-3">
        <h2 id="codes-suivi" className="text-lg font-medium">
          {c.listLabel}
        </h2>
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{c.empty}</p>
        ) : (
          <ul
            aria-label={c.listLabel}
            className="divide-y divide-border rounded-card border border-border bg-surface shadow-card"
          >
            {codes.map((code) => {
              const link = partnerLinks(env.NEXT_PUBLIC_SITE_URL, code.code).pros;
              return (
                <li
                  key={code.id}
                  className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:gap-6"
                >
                  <div className="flex min-w-0 flex-col gap-1.5 lg:w-80 lg:shrink-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium break-all">{code.code}</span>
                      <StatusBadge tone={code.active ? "success" : "neutral"}>
                        {code.active ? c.active : c.inactive}
                      </StatusBadge>
                    </span>
                    <span className="text-sm">{code.libelle}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Tag tone="neutral">{tl.channels[code.canal]}</Tag>
                      <Tag tone="neutral">{code.member_nom ?? c.noMember}</Tag>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.counts(code.inscrits, code.valides)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <AcquisitionCodeLink code={code.code} link={link} qr={qrSvg(link)} />
                  </div>
                  <ButtonLink
                    href={`/admin/lancement/codes/${code.id}` as Route}
                    variant="ghost"
                    size="sm"
                    aria-label={c.edit(code.code)}
                    className="self-start"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    {c.editShort}
                  </ButtonLink>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card className="flex flex-col gap-4 lg:max-w-3xl">
        <CardTitle title={c.newTitle} description={c.newLead} />
        <AcquisitionCodeForm members={memberOptions} />
      </Card>
    </div>
  );
}
