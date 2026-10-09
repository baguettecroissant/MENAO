import type { Metadata } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: `${fr.nav.pro} — MENAO`,
  description: fr.pro.landing.subtitle,
  alternates: { canonical: "/pro" },
};

// Formules lues en base (table plans, F-15), page régénérée toutes les heures.
export const revalidate = 3600;

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const t = fr.pro.landing;

export default async function ProLandingPage() {
  const { data: plans } = await createPublicClient()
    .from("plans")
    .select("code, nom, prix_mensuel_ht_centimes, ouverte")
    .order("ordre");
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
      {plans && plans.length > 0 && (
        <section aria-label={t.plansTitle} className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">{t.plansTitle}</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => (
              <li
                key={plan.code}
                className={`flex flex-col gap-2 rounded-card border bg-surface p-5 ${plan.ouverte ? "border-primary" : "border-border"}`}
              >
                <h3 className="text-lg font-semibold">{plan.nom}</h3>
                <p>
                  <span className="text-3xl font-bold">
                    {euros.format(plan.prix_mensuel_ht_centimes / 100)}
                  </span>{" "}
                  <span className="text-muted-foreground">{t.perMonth}</span>
                </p>
                {plan.ouverte ? (
                  <p className="font-medium text-success">
                    {t.open} · {t.trial}
                  </p>
                ) : (
                  <p className="text-muted-foreground">{t.soon}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{t.noCommission}</p>
        </section>
      )}
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
