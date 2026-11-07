import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { teamContext } from "@/lib/artisan/space";
import { signOut } from "@/lib/auth/actions";

const t = fr.pro.team.suspended;

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * Membre d'une équipe (F-89, ADR 0240) dont l'accès est suspendu (formule réduite ou choix du
 * patron) : rien de l'entreprise n'est lisible, le patron peut le réactiver depuis « Mon équipe ».
 */
export default async function SuspendedAccessPage() {
  const team = await teamContext();
  if (!team?.suspended) redirect("/pro/tableau-de-bord");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Logo />
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="min-h-touch font-medium underline-offset-2 hover:underline"
            >
              {fr.mySpace.signOut}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <Alert tone="info">{t.text(team.company)}</Alert>
      </main>
    </div>
  );
}
