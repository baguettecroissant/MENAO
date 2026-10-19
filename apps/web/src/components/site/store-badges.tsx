import { fr } from "@/i18n/fr";
import { APP_STORE_URL, PLAY_STORE_URL, STORE_BADGES } from "@/lib/site/stores";

const t = fr.appDownload;

/** Badges App Store et Google Play (ADR 0150) : liens vers les fiches de l'application. */
export function StoreBadges({ className = "" }: { className?: string }) {
  const badges = [
    { href: APP_STORE_URL, alt: t.appStore, image: STORE_BADGES.appStore, size: "h-10" },
    {
      href: PLAY_STORE_URL,
      alt: t.playStore,
      image: STORE_BADGES.playStore,
      size: "-my-1.5 h-[3.25rem]",
    },
  ];
  return (
    <ul className={`flex flex-wrap items-center gap-3 ${className}`}>
      {badges.map((badge) => (
        <li key={badge.href} className="flex">
          <a
            href={badge.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-[0.6rem] transition-opacity hover:opacity-85 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- badges officiels, non optimisés par Vercel (spec §4.4) */}
            <img
              src={badge.image.src}
              alt={badge.alt}
              width={badge.image.width}
              height={badge.image.height}
              loading="lazy"
              decoding="async"
              className={`${badge.size} w-auto`}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
