import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { AppReturnPanel } from "@/components/app-return";
import { fr } from "@/i18n/fr";

const t = fr.appReturn;

export const metadata: Metadata = {
  title: `${t.title} — MENAO`,
  robots: { index: false, follow: false },
};

/**
 * Fin d'une signature (DocuSeal) ou d'un paiement (Stripe) ouverts depuis l'application : la page,
 * statique, rouvre l'application sur l'écran d'origine (ADR 0060).
 */
export default function AppReturnPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <Logo />
        <h1 className="text-xl font-medium tracking-tight">{t.title}</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">{t.redirecting}</p>}>
          <AppReturnPanel />
        </Suspense>
      </div>
    </main>
  );
}
