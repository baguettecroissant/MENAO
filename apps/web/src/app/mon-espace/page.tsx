import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MyRequests } from "@/components/project/my-requests";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{fr.mySpace.greeting(profile?.first_name ?? null)}</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="min-h-touch font-medium underline-offset-2 hover:underline"
          >
            {fr.mySpace.signOut}
          </button>
        </form>
      </div>
      <MyRequests supabase={supabase} />
    </main>
  );
}
