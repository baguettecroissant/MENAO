import { homePathForRole, roleFromAppMetadata } from "@menao/core";
import type { Route } from "next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { MyRequests } from "@/components/project/my-requests";
import { ButtonLink } from "@/components/ui";
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
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {fr.mySpace.greeting(profile?.first_name ?? null)}
            </h1>
            <p className="text-sm text-muted-foreground">{fr.mySpace.subtitle}</p>
          </div>
          <ButtonLink href="/recherche" size="md">
            {fr.myRequests.newSearch}
            <Search aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
        <MyRequests supabase={supabase} />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm">
          <p className="text-muted-foreground">
            {fr.mySpace.role} :{" "}
            <span className="font-medium text-foreground">{fr.roles[role]}</span>
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-touch font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {fr.mySpace.signOut}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
