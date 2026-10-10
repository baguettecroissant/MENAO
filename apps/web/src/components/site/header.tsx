import Link from "next/link";
import { fr } from "@/i18n/fr";

const t = fr.nav;
const links = [
  { href: "/", label: t.findArtisan },
  { href: "/comment-ca-marche", label: t.howItWorks },
  { href: "/garanties", label: t.guarantees },
  { href: "/pro", label: t.pro },
  { href: "/mon-espace", label: t.myClientSpace },
] as const;

/** En-tête du site (F-01). Menu repliable sans JavaScript sur mobile. */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <nav
        aria-label={t.main}
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3"
      >
        <Link href="/" className="text-xl font-bold text-primary">
          {t.home}
        </Link>
        <ul className="hidden items-center gap-5 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="font-medium hover:text-primary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <details className="group lg:hidden">
          <summary className="flex min-h-touch cursor-pointer list-none items-center rounded-button border border-border px-3 font-medium">
            {t.menu}
          </summary>
          <ul className="absolute right-4 left-4 z-20 mt-2 flex flex-col rounded-card border border-border bg-surface p-2 shadow-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-touch items-center rounded-button px-3 font-medium hover:bg-background"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </header>
  );
}
