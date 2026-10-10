import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MONITORED_DOCUMENT_TYPES, expiryStatus } from "@menao/core";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { signOut } from "@/lib/auth/actions";
import { Stepper } from "./stepper";
import { SubmitReminder } from "./submit-reminder";

export const metadata: Metadata = { title: `${fr.pro.onboarding.title} — MENAO` };

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { progress, artisan, documents, canSubmit } = await getOnboardingContext();
  // F-51 : documents surveillés arrivant à échéance (ou expirés) sans renouvellement déposé.
  const toRenew =
    artisan.status === "valide" || artisan.status === "suspendu"
      ? MONITORED_DOCUMENT_TYPES.filter((type) => {
          const current = documents.find((d) => d.type === type && d.status === "valide");
          const pending = documents.some((d) => d.type === type && d.status === "en_attente");
          return current && !pending && expiryStatus(current.date_fin) !== "ok";
        })
      : [];
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-medium tracking-tight">{fr.pro.onboarding.title}</h1>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-touch font-medium underline-offset-2 hover:underline"
              >
                {fr.mySpace.signOut}
              </button>
            </form>
          </div>
          <p className="text-muted-foreground">{fr.pro.onboarding.intro}</p>
        </div>
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
        {(artisan.status === "brouillon" || artisan.status === "refuse") && canSubmit && (
          <SubmitReminder />
        )}
        <Stepper progress={progress} />
        {children}
      </main>
    </div>
  );
}
