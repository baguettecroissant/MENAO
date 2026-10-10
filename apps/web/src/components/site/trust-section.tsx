import { BadgeCheck, Clock, Heart } from "lucide-react";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
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
        <div className="flex flex-col gap-3">
          <h2 id="confiance" className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <dl className="grid w-full grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {t.stats.map((stat, i) => {
            const Icon = STAT_ICONS[i] ?? BadgeCheck;
            return (
              <div key={stat.label} className="flex flex-col items-center gap-2 py-5 sm:py-0">
                <Icon aria-hidden="true" strokeWidth={1.75} className="size-7 text-primary" />
                <dd className="text-[2rem] leading-none font-medium text-primary">{stat.value}</dd>
                <dt className="text-sm font-medium">{stat.label}</dt>
              </div>
            );
          })}
        </dl>
        <ul aria-label={t.tradesLabel} className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
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
