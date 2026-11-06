import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArtisanAssistant } from "@/components/pro/artisan-assistant";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireProSpace } from "@/lib/artisan/space";

const t = fr.pro.helpCenter;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Aide et support » de l'espace artisan (F-86, ADR 0236) : l'assistant, qui connaît l'espace et
 * le compte de l'artisan, puis le contact de l'équipe. Même entrée de menu qu'avant.
 */
export default async function ArtisanHelpPage() {
  await requireProSpace();
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <ArtisanAssistant />
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.contactTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.contactText}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a
              href={`mailto:${t.email}`}
              className="inline-flex items-center gap-1.5 font-medium text-primary-strong hover:underline"
            >
              <Mail aria-hidden="true" className="size-4" />
              {t.email}
            </a>
            <Link href="/contact" className="text-primary-strong hover:underline">
              {t.contactForm}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
