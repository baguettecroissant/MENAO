import type { Metadata } from "next";
import { AccountScreen } from "@/components/account/account-screen";
import { fr } from "@/i18n/fr";
import { requireAccount } from "@/lib/account/session";

export const metadata: Metadata = { title: `${fr.account.title} — MENAO` };

/** « Mon compte » (F-08, ADR 0039) : données du compte connecté, puis l'écran commun. */
export default async function AccountPage({ searchParams }: PageProps<"/compte">) {
  const { supabase, user, email, role } = await requireAccount();
  const params = await searchParams;
  const [{ data: profile }, { data: deletion }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, marketing_opt_in")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("tickets")
      .select("created_at")
      .eq("type", "suppression_compte")
      .neq("status", "resolu")
      .maybeSingle(),
  ]);
  return (
    <AccountScreen
      profile={profile}
      email={email}
      pendingEmail={user.new_email ?? null}
      pro={role !== "particulier"}
      deletionRequestedAt={deletion?.created_at ?? null}
      emailConfirmed={params.email === "confirme"}
    />
  );
}
