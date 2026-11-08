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

  const hasList = Boolean(invitations && invitations.length > 0);
  // Refonte « Nette » (ADR 0256) : le formulaire à gauche, les invitations à droite.
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {t.title}
        </h1>
        <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
      </div>
      <div
        className={`grid items-start gap-6 ${hasList ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "max-w-3xl"}`}
      >
        <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
          <InviteArtisanForm trades={trades ?? []} />
        </section>
        {invitations && invitations.length > 0 && (
          <section
            aria-labelledby="invitations"
            className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
          >
            <h2 id="invitations" className="px-5 pt-4 pb-2.5 text-lg">
              {t.listTitle}
            </h2>
            <ul className="divide-y divide-border border-t border-border">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{invitation.company}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
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
      </div>
    </main>
  );
}
