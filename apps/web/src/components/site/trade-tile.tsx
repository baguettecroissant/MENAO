import type { Route } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TRADE_IMAGES } from "@/lib/site/images";
import { DEFAULT_TRADE_VISUAL, TRADE_VISUALS } from "./trade-visuals";

/** Vignette compacte d'un métier (photo, libellé, flèche), pour les grilles de métiers. */
export function TradeTile({
  code,
  label,
  detail,
  href,
}: {
  code: string;
  label: string;
  detail?: string;
  href: string;
}) {
  const image = TRADE_IMAGES[code];
  const visual = TRADE_VISUALS[code] ?? DEFAULT_TRADE_VISUAL;
  const Icon = visual.icon;
  return (
    <Link
      href={href as Route}
      className="group flex items-center gap-3 rounded-card border border-border bg-surface p-2.5 pr-4 shadow-card transition hover:border-primary/40 hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
    >
      <span
        className={`relative size-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${visual.gradient}`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <Icon
            aria-hidden="true"
            className="absolute inset-0 m-auto size-6 text-white"
            strokeWidth={1.75}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}
