import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `${fr.nav.mySpace} — MENAO` };

export default async function MySpacePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Une session anonyme (recherche en cours, ADR 0012) ne donne pas accès à l'espace client.
  if (!data || data.claims.is_anonymous) redirect("/connexion?next=/mon-espace");

  const role = roleFromAppMetadata(data.claims.app_metadata);
  const home = homePathForRole(role);
  if (home !== "/mon-espace") redirect(home as Route);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  return (
    <PageShell title={fr.mySpace.greeting(profile?.first_name ?? null)}>
      <dl className="mb-6">
        <dt className="text-sm text-muted-foreground">{fr.mySpace.role}</dt>
        <dd className="font-medium">{fr.roles[role]}</dd>
      </dl>
      <form action={signOut}>
        <Button type="submit">{fr.mySpace.signOut}</Button>
      </form>
    </PageShell>
  );
}
