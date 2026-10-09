import { redirect } from "next/navigation";
import { Alert, PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { TotpForm } from "../totp-form";

const t = fr.admin.mfa;

/** Activation du TOTP : un nouveau facteur non vérifié remplace les tentatives abandonnées. */
export default async function EnrollMfaPage() {
  const { supabase, aal } = await requireAdmin({ requireMfa: false });
  if (aal === "aal2") redirect("/admin/artisans");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.some((f) => f.status === "verified")) redirect("/admin/mfa/verifier");
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified")
      await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "MENAO admin",
  });
  if (error || !data) {
    return (
      <PageShell title={t.enrollTitle}>
        <Alert tone="error">{t.error}</Alert>
      </PageShell>
    );
  }

  return (
    <PageShell title={t.enrollTitle}>
      <div className="flex flex-col gap-4">
        <p>{t.enrollIntro}</p>
        {/* QR code fourni par Supabase sous forme d'image SVG en data URI. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.totp.qr_code}
          alt={t.qrAlt}
          width={200}
          height={200}
          className="self-center bg-surface"
        />
        <p className="text-sm">
          <span className="block text-muted-foreground">{t.secretLabel}</span>
          <code data-testid="totp-secret" className="font-mono break-all">
            {data.totp.secret}
          </code>
        </p>
        <TotpForm factorId={data.id} />
      </div>
    </PageShell>
  );
}
