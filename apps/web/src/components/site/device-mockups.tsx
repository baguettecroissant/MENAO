import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import type { AppScreen } from "@/lib/site/app-screens";

/**
 * Mockups du site (ADR 0147) : vrais écrans de l'application dans un téléphone ou un ordinateur
 * dessinés en code (aucune image de cadre), et notification de l'application. Les écrans sont des
 * images ; le cadre suit la largeur donnée par `className`.
 */

// Téléphone de 390 × 844 points : cadre de 3 % de la largeur, écran exactement au format capturé.
const PHONE_RATIO = "aspect-[1000/2094]";

export function PhoneMockup({
  screen,
  alt,
  className = "",
  priority = false,
}: {
  screen: AppScreen;
  alt: string;
  className?: string;
  /** Écran du haut de page : chargé tout de suite. */
  priority?: boolean;
}) {
  return (
    <div
      className={`relative ${PHONE_RATIO} rounded-[15%/7.2%] bg-[#0c0f1c] p-[3%] shadow-[0_40px_80px_-30px_rgb(11_20_56/0.55),inset_0_0_0_1px_rgb(255_255_255/0.1)] ${className}`}
    >
      <div
        className="relative h-full overflow-hidden rounded-[12.6%/5.8%]"
        style={{ backgroundColor: screen.bottom }}
      >
        {/* Barre d'état (47 points sur 844). */}
        <svg
          viewBox="0 0 390 47"
          aria-hidden="true"
          className="absolute inset-x-0 top-0 block h-auto w-full"
          style={{ backgroundColor: screen.top, color: screen.darkTop ? "#ffffff" : "#121735" }}
        >
          <text
            x="56"
            y="32"
            fontSize="17"
            fontWeight="600"
            textAnchor="middle"
            fill="currentColor"
          >
            9:41
          </text>
          <g fill="currentColor">
            <rect x="290" y="24" width="3.5" height="6" rx="1" />
            <rect x="295.5" y="21.5" width="3.5" height="8.5" rx="1" />
            <rect x="301" y="19" width="3.5" height="11" rx="1" />
            <rect x="306.5" y="16.5" width="3.5" height="13.5" rx="1" />
            <path d="M322 21.2a10.5 10.5 0 0 1 14 0l-1.6 1.7a8.2 8.2 0 0 0-10.8 0zm2.8 2.9a6.4 6.4 0 0 1 8.4 0l-1.6 1.7a4.1 4.1 0 0 0-5.2 0zm4.2 4.3 1.7-1.8a1.9 1.9 0 0 0-3.4 0z" />
            <rect
              x="345"
              y="17"
              width="24"
              height="12"
              rx="3.5"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.4"
              strokeWidth="1.2"
            />
            <rect x="347" y="19" width="18" height="8" rx="2" />
            <rect x="370.5" y="21" width="1.6" height="4" rx="0.8" fillOpacity="0.4" />
          </g>
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
        <img
          src={screen.src}
          alt={alt}
          width={780}
          height={1526}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-x-0 top-[5.569%] block h-[90.403%] w-full object-cover object-top"
        />
        <span
          aria-hidden="true"
          className="absolute top-[1.25%] left-1/2 h-[4%] w-[31%] -translate-x-1/2 rounded-full bg-[#0c0f1c]"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-[1.3%] left-1/2 h-[0.6%] w-[35%] -translate-x-1/2 rounded-full bg-[#121735]/80"
        />
      </div>
    </div>
  );
}

/** Ordinateur portable : écran web de 1 600 × 1 000 et socle. */
export function LaptopMockup({
  src,
  alt,
  className = "",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative mx-[6%] rounded-t-[2.6%_4.2%] bg-[#0c0f1c] p-[1.6%] pb-[2.2%] shadow-[0_40px_80px_-35px_rgb(11_20_56/0.6),inset_0_0_0_1px_rgb(255_255_255/0.1)]">
        <span
          aria-hidden="true"
          className="absolute top-[0.55%] left-1/2 size-[0.7%] -translate-x-1/2 rounded-full bg-white/25"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4) */}
        <img
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="block aspect-[16/10] w-full rounded-[0.4%] object-cover object-top"
        />
      </div>
      <div
        aria-hidden="true"
        className="relative aspect-[100/3.4] w-full rounded-b-[50%_100%] bg-gradient-to-b from-[#e8eaf0] to-[#a9aebb] shadow-[0_18px_30px_-18px_rgb(11_20_56/0.6)]"
      >
        <span className="absolute top-0 left-1/2 h-[38%] w-[15%] -translate-x-1/2 rounded-b-lg bg-[#9ca2b0]/60" />
      </div>
    </div>
  );
}

/** Notification de l'application, comme sur l'écran verrouillé (valeurs d'exemple). */
export function AppNotification({
  title,
  text,
  time,
  icon,
  className = "",
}: {
  title: string;
  text: string;
  time: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex w-[17.5rem] items-start gap-3 rounded-[1.25rem] bg-white/85 p-3 text-[#121735] shadow-raised ring-1 ring-black/5 backdrop-blur-xl ${className}`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.6rem] bg-primary text-white">
        {icon ?? <LogoMark tone="white" className="size-5" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[0.8125rem] font-semibold">{title}</span>
          <span className="shrink-0 text-[0.6875rem] text-[#121735]/55">{time}</span>
        </span>
        <span className="text-[0.8125rem] leading-snug text-[#121735]/80">{text}</span>
      </span>
    </div>
  );
}
