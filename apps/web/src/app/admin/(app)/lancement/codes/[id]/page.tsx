import { partnerLinks } from "@menao/core";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AcquisitionCodeForm, AcquisitionCodeLink } from "@/components/launch/figures-forms";
import { Card, TextLink } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { listLaunchMembers } from "@/lib/admin/launch";
import { listAcquisitionCodes } from "@/lib/admin/launch-figures";
import { qrSvg } from "@/lib/qr";

const tl = fr.admin.launch;
const c = tl.codes;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: `${c.title} · ${tl.title} — ${fr.admin.title}` };

/**
 * Modification d'un code de suivi (F-66, lot 2, ADR 0209) : libellé, canal, responsable et état ;
 * le code lui-même est définitif (imprimé sur les supports). Son lien et son QR code au-dessus.
 * Réservé aux admins.
 */
export default async function AdminLaunchCodePage({
  params,
}: PageProps<"/admin/lancement/codes/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [codes, members] = await Promise.all([
    listAcquisitionCodes(supabase),
    listLaunchMembers(supabase),
  ]);
  const code = codes.find((row) => row.id === id);
  if (!code) notFound();
  const link = partnerLinks(env.NEXT_PUBLIC_SITE_URL, code.code).pros;
  // Membres actifs, et le responsable actuel même s'il n'est plus actif.
  const memberOptions = members
    .filter((m) => m.active || m.id === code.member_id)
    .map((m) => ({ id: m.id, nom: m.nom }));

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/lancement/codes" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {c.back}
      </TextLink>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight break-all">{c.editTitle(code.code)}</h1>
        <p className="text-sm text-muted-foreground">{c.editLead}</p>
      </div>
      <Card className="flex flex-col gap-4 lg:max-w-3xl">
        <AcquisitionCodeLink code={code.code} link={link} qr={qrSvg(link)} />
      </Card>
      <Card className="flex flex-col gap-4 lg:max-w-3xl">
        <AcquisitionCodeForm
          code={{
            id: code.id,
            code: code.code,
            libelle: code.libelle,
            canal: code.canal,
            member_id: code.member_id,
            active: code.active,
          }}
          members={memberOptions}
        />
      </Card>
    </div>
  );
}
