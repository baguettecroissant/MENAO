import type { Route } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";

const t = fr.footer;

/** Pied de page : pages légales, aide et maillage vers les pages métier × ville (F-02, F-03). */
export async function SiteFooter() {
  const { trades } = await seoCatalog();
  const columns = [
    {
      title: t.trades,
      links: trades.slice(0, 8).map((tr) => ({ href: `/${tr.code}/nice`, label: tr.label })),
    },
    {
      title: t.company,
      links: [
        { href: "/comment-ca-marche", label: fr.nav.howItWorks },
        { href: "/garanties", label: fr.nav.guarantees },
        { href: "/pro", label: fr.nav.pro },
        { href: "/faq", label: t.faq },
        { href: "/contact", label: t.contact },
      ],
    },
    {
      title: t.legal,
      links: [
        { href: "/mentions-legales", label: t.legalNotice },
        { href: "/cgu", label: t.terms },
        { href: "/cgv-artisans", label: t.termsPro },
        { href: "/confidentialite", label: t.privacy },
        { href: "/cookies", label: t.cookies },
        { href: "/criteres-de-classement", label: t.ranking },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t.tagline}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href as Route}
                    className="text-muted-foreground hover:text-primary-strong"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} MENAO
        </p>
      </div>
    </footer>
  );
}
