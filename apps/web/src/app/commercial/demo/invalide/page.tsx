import type { Metadata } from "next";
import { fr } from "@/i18n/fr";

const t = fr.commercialDemo;

export const metadata: Metadata = { title: t.invalidTitle, robots: { index: false } };

/** Lien de démo changé, désactivé ou mal copié (ADR 0344). */
export default function CommercialDemoInvalidPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="flex max-w-md flex-col gap-3 text-center">
        <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight">
          {t.invalidTitle}
        </h1>
        <p className="text-[0.9375rem] text-label">{t.invalidText}</p>
      </div>
    </main>
  );
}
