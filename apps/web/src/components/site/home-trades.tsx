import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { SectionHeading } from "./section-heading";
import { TradeCard } from "./trade-card";

const t = fr.home;
// Métiers mis en avant en photo ; les autres en pastilles (ADR 0264).
const FEATURED = ["electricien", "plombier", "macon", "menuisier"];

/**
 * « Tous les métiers du bâtiment » (ADR 0264) : une seule fois sur l'accueil, quatre photos puis
 * les autres métiers, et le lien vers la page carrefour /metiers.
 */
export function HomeTrades({ trades }: { trades: readonly { code: string; label: string }[] }) {
  const featured = FEATURED.map((code) => trades.find((trade) => trade.code === code)).filter(
    (trade): trade is { code: string; label: string } => Boolean(trade),
  );
  const others = trades.filter((trade) => !FEATURED.includes(trade.code));
  return (
    <section id="metiers" aria-labelledby="home-trades" className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="home-trades"
            eyebrow={t.tradesEyebrow}
            title={t.tradesTitle}
            subtitle={t.tradesSubtitle}
            align="left"
          />
          <div className="hidden shrink-0 sm:block">
            <ButtonLink href="/metiers" variant="secondary">
              {t.allTrades}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
        <ul className="reveal-group grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((trade) => (
            <li key={trade.code}>
              <TradeCard code={trade.code} label={trade.label} href={`/${trade.code}`} />
            </li>
          ))}
        </ul>
        <ul aria-label={t.moreTradesLabel} className="flex flex-wrap gap-2">
          {others.map((trade) => (
            <li key={trade.code}>
              <Link
                href={`/${trade.code}` as Route}
                className="inline-flex min-h-10 items-center rounded-pill border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:border-border-strong focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                {trade.label}
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink href="/metiers" variant="secondary" className="sm:hidden">
          {t.allTrades}
          <ArrowRight aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>
    </section>
  );
}
