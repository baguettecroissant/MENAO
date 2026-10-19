import { BadgeCheck, Clock, Heart } from "lucide-react";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { CountUp } from "./count-up";
import { TradeCard } from "./trade-card";

const t = fr.trust;
const STAT_ICONS = [BadgeCheck, Heart, Clock];
// Métiers mis en avant par les maquettes (Électricité, Plomberie, Maçonnerie, Menuiserie).
const FEATURED = ["electricien", "plombier", "macon", "menuisier"];

/**
 * « Des artisans du BTP qualifiés et de confiance » (maquettes) : engagements vérifiables
 * (aucun chiffre inventé, spec F-01) et cartes métiers.
 */
export function TrustSection() {
  return (
    <section aria-labelledby="confiance" className="bg-surface py-16 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-4 text-center sm:px-6">
        <div className="reveal flex flex-col gap-3">
          <h2 id="confiance" className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <dl className="reveal-group grid w-full grid-cols-3 divide-x divide-border">
          {t.stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? BadgeCheck;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 px-1 sm:gap-2">
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-6 text-primary sm:size-7"
                />
                <dd className="text-[1.625rem] leading-none font-medium text-primary sm:text-[2rem]">
                  <CountUp value={stat.value} />
                </dd>
                <dt className="text-xs font-medium text-balance sm:text-sm">{stat.label}</dt>
              </div>
            );
          })}
        </dl>
        <ul
          aria-label={t.tradesLabel}
          className="reveal-group grid w-full grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {FEATURED.map((code) => (
            <li key={code}>
              <TradeCard
                code={code}
                label={fr.tradeDomains[code]?.label ?? code}
                href={`/${code}`}
              />
            </li>
          ))}
        </ul>
        <TextLink href="/#metiers">{t.allTrades}</TextLink>
      </div>
    </section>
  );
}
