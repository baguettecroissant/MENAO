import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MONITORED_DOCUMENT_TYPES, expiryStatus } from "@menao/core";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AppShell } from "@/components/app-shell/app-shell";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { getProShell } from "@/lib/artisan/space";
import { signOut } from "@/lib/auth/actions";
import { getShellAccount } from "@/lib/client/shell";
import { OnboardingHeader } from "./onboarding-header";

export const metadata: Metadata = { title: `${fr.pro.onboarding.title} — MENAO` };

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { artisan, documents } = await getOnboardingContext();
  // F-51 : documents surveillés arrivant à échéance (ou expirés) sans renouvellement déposé.
  const toRenew =
    artisan.status === "valide" || artisan.status === "suspendu"
      ? MONITORED_DOCUMENT_TYPES.filter((type) => {
          const current = documents.find((d) => d.type === type && d.status === "valide");
          const pending = documents.some((d) => d.type === type && d.status === "en_attente");
          return current && !pending && expiryStatus(current.date_fin) !== "ok";
        })
      : [];
  // Artisan validé : « Mon dossier » dans la coque de l'espace pro (ADR 0035), menu latéral compris.
  const validated = artisan.status === "valide" || artisan.status === "suspendu";
  const inProSpace = validated && (await getShellAccount())?.account.role === "artisan";
  const signOutButton = inProSpace ? null : (
    <form action={signOut}>
      <button type="submit" className="min-h-touch font-medium underline-offset-2 hover:underline">
        {fr.mySpace.signOut}
      </button>
    </form>
  );
  const content = (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <OnboardingHeader inProSpace={inProSpace} actions={signOutButton} />
      {artisan.status === "brouillon" && artisan.refusal_reason && (
        <Alert tone="error">{fr.pro.onboarding.status.complement(artisan.refusal_reason)}</Alert>
      )}
      {artisan.status === "suspendu" && artisan.suspension_reason === "documents_expires" && (
        <Alert tone="error">{fr.pro.onboarding.status.suspenduDocuments}</Alert>
      )}
      {toRenew.length > 0 && (
        <Alert tone="error">
          {fr.pro.onboarding.documents.expiringBanner(
            toRenew.map((type) => fr.pro.onboarding.documents.types[type]).join(", "),
          )}
        </Alert>
      )}
      {children}
    </main>
  );

  if (inProSpace) {
    const pro = await getProShell();
    return (
      <AppShell space="pro" account={pro.account} badges={pro.badges} visibility={pro.visibility}>
        {content}
      </AppShell>
    );
  }
  return (
    // Inscription de l'artisan (ADR 0034) : coque de l'Espace Pro, sans le site vitrine.
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/pro/onboarding" aria-label={fr.pro.onboarding.title} className="rounded-md">
            <Logo />
          </Link>
          <span className="rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
            {fr.nav.pro}
          </span>
        </div>
      </header>
      {content}
    </div>
  );
}
