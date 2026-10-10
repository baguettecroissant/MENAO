import type { Route } from "next";
import Link from "next/link";
import { fr } from "@/i18n/fr";

const t = fr.pro.quote.tabs;

/** Onglets « Aperçu du devis » → « Envoi du devis » (maquettes F-21). */
export function QuoteTabs({
  chantierId,
  active,
}: {
  chantierId: string;
  active: "apercu" | "envoi";
}) {
  const tabs = [
    { key: "apercu", label: t.preview, href: `/pro/chantiers/${chantierId}/devis/apercu` },
    { key: "envoi", label: t.send, href: `/pro/chantiers/${chantierId}/devis/envoi` },
  ] as const;
  return (
    <nav aria-label={t.label} className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl px-4 sm:px-6">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href as Route}
            aria-current={active === tab.key ? "page" : undefined}
            className="flex min-h-12 flex-1 items-center justify-center border-b-2 border-transparent text-sm text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none aria-[current=page]:border-primary aria-[current=page]:font-medium aria-[current=page]:text-primary-strong"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
