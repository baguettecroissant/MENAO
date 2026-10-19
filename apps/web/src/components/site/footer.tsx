import type { Route } from "next";
import Link from "next/link";
import { LockKeyhole, MapPin } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";
import { seoCatalog } from "@/lib/site/catalog";
import { visibleGuides } from "@/lib/site/guides";

const t = fr.footer;

/** Pied de page : parcours particulier et artisan, métiers (F-02), aide et pages légales (F-03). */
export async function SiteFooter() {
  const { trades } = await seoCatalog();
  const columns = [
    {
      title: t.clients,
      links: [
        { href: "/recherche", label: t.findArtisan },
        { href: "/comment-ca-marche", label: fr.nav.howItWorks },
        { href: "/garanties", label: fr.nav.guarantees },
        { href: "/mon-espace", label: t.mySpace },
        { href: "/faq", label: t.faq },
        ...(visibleGuides().length > 0 ? [{ href: "/guides", label: t.guides }] : []),
        { href: "/a-propos", label: t.about },
        { href: "/contact", label: t.contact },
      ],
    },
    {
      title: t.pros,
      links: [
        { href: "/pro", label: fr.nav.pro },
        { href: "/pro/inscription", label: t.proSignUp },
        { href: "/pro#formules", label: t.plans },
        { href: "/partenaires", label: t.partners },
        { href: "/connexion", label: t.signIn },
      ],
    },
    {
      title: t.trades,
      links: [
        ...trades.slice(0, 7).map((tr) => ({ href: `/${tr.code}`, label: tr.label })),
        { href: "/#metiers", label: t.allTrades },
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
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-3 lg:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t.tagline}</p>
          <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-3.5 text-primary" />
              {t.zone}
            </li>
            <li className="flex items-center gap-2">
              <LockKeyhole aria-hidden="true" className="size-3.5 text-primary" />
              {t.stripe}
            </li>
          </ul>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
            <p className="text-sm font-medium">{col.title}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href as Route}
                    className="rounded-sm text-muted-foreground hover:text-primary-strong"
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
