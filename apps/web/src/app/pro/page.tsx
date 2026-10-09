import type { Metadata } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: `${fr.nav.pro} — MENAO` };

const t = fr.pro.landing;

export default function ProLandingPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <p className="font-semibold text-primary">{fr.nav.pro}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{t.title}</h1>
        <p className="text-lg text-muted-foreground">{t.subtitle}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {t.points.map((point) => (
          <li key={point} className="rounded-card border border-border bg-surface px-4 py-3">
            {point}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/pro/inscription"
          className="inline-flex min-h-touch items-center justify-center rounded-button bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          {t.signUp}
        </Link>
        <Link
          href="/connexion"
          className="inline-flex min-h-touch items-center justify-center rounded-button border border-border bg-surface px-6 font-semibold"
        >
          {t.signIn}
        </Link>
      </div>
    </main>
  );
}
