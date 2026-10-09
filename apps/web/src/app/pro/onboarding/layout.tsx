import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { Stepper } from "./stepper";

export const metadata: Metadata = { title: `${fr.pro.onboarding.title} — MENAO` };

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { progress } = await getOnboardingContext();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{fr.pro.onboarding.title}</h1>
        <p className="text-muted-foreground">{fr.pro.onboarding.intro}</p>
      </div>
      <Stepper progress={progress} />
      {children}
    </main>
  );
}
