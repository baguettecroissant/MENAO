import type { Route } from "next";
import Link from "next/link";
import { TRADE_IMAGES, tradeSrcSet } from "@/lib/site/images";
import { DEFAULT_TRADE_VISUAL, TRADE_VISUALS } from "./trade-visuals";

/** Carte métier en photo, libellé en bas sur un dégradé sombre (maquettes). */
export function TradeCard({ code, label, href }: { code: string; label: string; href: string }) {
  const image = TRADE_IMAGES[code];
  const visual = TRADE_VISUALS[code] ?? DEFAULT_TRADE_VISUAL;
  const Icon = visual.icon;
  return (
    <Link
      href={href as Route}
      className="group relative block aspect-[3/4] overflow-hidden rounded-card focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
        <img
          src={image}
          srcSet={tradeSrcSet(code)}
          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 50vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient}`}>
          <Icon
            aria-hidden="true"
            strokeWidth={1.25}
            className="absolute -top-4 -right-6 size-40 text-white/15 transition-transform duration-500 group-hover:scale-110"
          />
          <Icon
            aria-hidden="true"
            strokeWidth={1.75}
            className="absolute top-5 left-5 size-8 text-white/90"
          />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-4 left-4 text-[0.9375rem] font-medium text-white">
        {label}
      </span>
    </Link>
  );
}
