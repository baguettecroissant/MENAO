import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { InviteArtisanForm } from "./invite-form";

const t = fr.inviteArtisan;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Invitez votre artisan de confiance » (ADR 0162, d'après « Programme de parrainage ») : le
 * particulier donne les coordonnées d'un artisan qui n'est pas sur MENAO ; l'équipe le contacte de
 * sa part. Suivi de ses invitations.
 */
export default async function InviteArtisanPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth || auth.claims.is_anonymous) redirect("/connexion?next=/mon-espace/inviter-un-artisan");
  const [{ data: trades }, { data: invitations }] = await Promise.all([
    supabase.from("trades").select("code, label").order("sort_order"),
    supabase
      .from("artisan_invitations")
      .select("id, company, status, created_at")
      .eq("particulier_id", auth.claims.sub)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <InviteArtisanForm trades={trades ?? []} />
      </section>
      {invitations && invitations.length > 0 && (
        <section aria-labelledby="invitations" className="flex flex-col gap-3">
          <h2 id="invitations" className="text-lg font-medium">
            {t.listTitle}
          </h2>
          <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-1 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{invitation.company}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.sentOn(formatDay(invitation.created_at))}
                  </span>
                </span>
                <StatusBadge tone={invitation.status === "inscrit" ? "success" : "neutral"}>
                  {t.status[invitation.status]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
