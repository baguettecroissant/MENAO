import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { homePathForRole } from "@menao/core";
import type { Route } from "next";
import { requireStaff } from "@/lib/admin/guard";
import { TotpForm } from "../totp-form";

export default async function VerifyMfaPage() {
  const { supabase, aal, role } = await requireStaff({ requireMfa: false });
  if (aal === "aal2") redirect(homePathForRole(role) as Route);

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) redirect("/admin/mfa/activer");

  return (
    <PageShell title={fr.admin.mfa.verifyTitle}>
      <p className="mb-4">{fr.admin.mfa.verifyIntro}</p>
      <TotpForm factorId={factor.id} />
    </PageShell>
  );
}
