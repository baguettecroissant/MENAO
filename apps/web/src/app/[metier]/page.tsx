import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";

const t = fr.seo;

// Pages statiques régénérées toutes les heures (spec §4.4).
export const revalidate = 3600;

export async function generateStaticParams() {
  const { trades } = await seoCatalog();
  return trades.map((tr) => ({ metier: tr.code }));
}

async function load(metier: string) {
  const { trades, communes } = await seoCatalog();
  const trade = trades.find((tr) => tr.code === metier);
  return trade ? { trade, communes } : null;
}

export async function generateMetadata({ params }: PageProps<"/[metier]">): Promise<Metadata> {
  const data = await load((await params).metier);
  if (!data) return {};
  const title = `${t.tradeTitle(data.trade.label)} — MENAO`;
  return {
    title,
    description: t.tradeIntro(data.trade.label),
    alternates: { canonical: `/${data.trade.code}` },
    openGraph: { title, url: `/${data.trade.code}` },
  };
}

/** Page métier (F-02) : accès aux pages métier × ville des communes pilotes. */
export default async function TradePage({ params }: PageProps<"/[metier]">) {
  const data = await load((await params).metier);
  if (!data) notFound();
  const { trade, communes } = data;
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-bold">{t.tradeTitle(trade.label)}</h1>
      <p className="text-lg text-muted-foreground">{t.tradeIntro(trade.label)}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {communes.map((c) => (
          <li key={c.code_insee}>
            <Link
              href={`/${trade.code}/${c.slug}` as Route}
              className="flex min-h-touch items-center rounded-card border border-border bg-surface px-4 py-3 font-medium hover:border-primary"
            >
              {t.cityTitle(trade.label, c.nom)}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
