import type { ProfileHubRow, ProfileHubTone, ProfileTip } from "@menao/core";
import {
  Award,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  Camera,
  ChevronRight,
  CreditCard,
  Eye,
  FolderCheck,
  IdCard,
  Images,
  LifeBuoy,
  MapPin,
  ReceiptText,
  Star,
  UserRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { ButtonLink, StatusBadge, VerifiedBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { HubLineStatus } from "@/lib/artisan/profile-hub";
import { ReferralCard } from "./referral-card";

const t = fr.pro.hub;

type RowKey = ProfileHubRow | "subscription" | "invoices" | "identity" | "notifications" | "help";
type Row = { key: RowKey; icon: LucideIcon; href: string };

/** Rubriques de « Mon profil », dans l'ordre de l'application (ADR 0129, 0131). */
const SECTIONS: { key: keyof typeof t.sections; rows: Row[] }[] = [
  {
    key: "profile",
    rows: [
      { key: "photo", icon: UserRound, href: "/pro/onboarding/profil" },
      { key: "portfolio", icon: Images, href: "/pro/onboarding/profil" },
      { key: "reviews", icon: Star, href: "/pro/avis" },
      { key: "grade", icon: Award, href: "/pro/grade" },
    ],
  },
  {
    key: "company",
    rows: [
      { key: "company", icon: Building2, href: "/pro/onboarding/entreprise" },
      { key: "trades", icon: Wrench, href: "/pro/onboarding/metiers" },
      { key: "zone", icon: MapPin, href: "/pro/onboarding/zone" },
      { key: "availability", icon: CalendarClock, href: "/pro/agenda/disponibilites" },
    ],
  },
  {
    key: "compliance",
    rows: [
      { key: "documents", icon: FolderCheck, href: "/pro/onboarding/documents" },
      { key: "charter", icon: BadgeCheck, href: "/pro/onboarding/charte" },
    ],
  },
  {
    key: "money",
    rows: [
      { key: "payments", icon: Wallet, href: "/pro/onboarding/paiements" },
      // Le site peut parler de l'abonnement ; jamais l'application (CLAUDE.md règle 10).
      { key: "subscription", icon: CreditCard, href: "/pro/onboarding/formule" },
      { key: "invoices", icon: ReceiptText, href: "/pro/factures" },
    ],
  },
  {
    key: "account",
    rows: [
      { key: "identity", icon: IdCard, href: "/compte" },
      { key: "notifications", icon: Bell, href: "/notifications" },
      { key: "help", icon: LifeBuoy, href: "/contact" },
    ],
  },
];

const TIP_HREF: Record<ProfileTip, string> = {
  assure_verifie: "/pro/onboarding/documents",
  photo_profil: "/pro/onboarding/profil",
  realisations: "/pro/onboarding/profil",
  presentation: "/pro/onboarding/profil",
  specialites: "/pro/onboarding/metiers",
  certifications: "/pro/onboarding/metiers",
};

const TONE: Record<ProfileHubTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-muted-foreground",
};

export type ProfileHubData = {
  name: string;
  company: string | null;
  city: string | null;
  avatarUrl: string | null;
  status: "valide" | "suspendu" | "radie" | "brouillon" | "en_verification" | "refuse";
  verified: boolean;
  score: { percent: number; count: number } | null;
  strength: { percent: number; next: ProfileTip | null };
  statuses: Record<ProfileHubRow, HubLineStatus>;
  subscriptionActive: boolean;
  /** Parrainage (F-60) : artisans validés seulement. */
  referral: { link: string; code: string; joined: number; monthsEarned: number } | null;
};

/**
 * « Mon profil » sur le site (ADR 0131), comme dans l'application (ADR 0129) : en-tête, jauge de
 * la fiche, « Voir ma fiche » et toutes les rubriques avec leur état.
 */
export function ProfileHubView({ hub }: { hub: ProfileHubData }) {
  const statusLabel = hub.status === "valide" ? null : t.status[hub.status];
  const { percent, next } = hub.strength;
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center gap-5">
          <Link
            href="/pro/onboarding/profil"
            aria-label={t.changePhoto}
            className="relative shrink-0 rounded-full focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <ArtisanPhoto
              url={hub.avatarUrl}
              name={hub.name}
              className="size-20 rounded-full"
              initialsClassName="text-2xl"
            />
            <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-primary-strong">
              <Camera aria-hidden="true" className="size-3.5" />
            </span>
          </Link>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-[1.75rem] leading-tight font-medium tracking-tight">{hub.name}</h1>
            {(hub.company || hub.city) && (
              <p className="truncate text-sm text-muted-foreground">
                {[hub.company, hub.city].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {hub.verified && <VerifiedBadge>{t.verified}</VerifiedBadge>}
              {statusLabel && <StatusBadge tone="warning">{statusLabel}</StatusBadge>}
              {hub.score && (
                <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
                  <Star aria-hidden="true" className="size-3.5" />
                  {t.score(hub.score.percent, hub.score.count)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
          <Strength percent={percent} next={next} />
          <ButtonLink href="/pro/profil" variant="secondary" className="self-center">
            <Eye aria-hidden="true" className="size-4" />
            {t.seeProfile}
          </ButtonLink>
        </div>

        {hub.referral && <ReferralCard {...hub.referral} />}

        <div className="grid gap-6 lg:grid-cols-2">
          {SECTIONS.map((section) => (
            <section
              key={section.key}
              aria-labelledby={`hub-${section.key}`}
              className="flex flex-col gap-2"
            >
              <h2 id={`hub-${section.key}`} className="ml-1 text-sm text-muted-foreground">
                {t.sections[section.key]}
              </h2>
              <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                {section.rows.map((row) => (
                  <HubLine key={row.key} row={row} status={statusOf(row.key, hub)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function statusOf(key: RowKey, hub: ProfileHubData): HubLineStatus {
  if (key === "subscription") {
    return hub.subscriptionActive
      ? { text: t.values.subscriptionActive, tone: "success" }
      : { text: t.values.subscriptionToChoose, tone: "warning" };
  }
  if (key === "invoices" || key === "identity" || key === "notifications" || key === "help") {
    return null;
  }
  return hub.statuses[key];
}

function Strength({ percent, next }: { percent: number; next: ProfileTip | null }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const color = percent >= 100 ? "var(--color-success)" : "var(--color-primary)";
  const title = next ? t.strength(percent) : t.complete;
  const hint = next ? t.tips[next] : t.completeHint;
  const content = (
    <>
      <span className="relative flex size-14 shrink-0 items-center justify-center">
        <svg aria-hidden="true" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-border"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(percent, 100) / 100)}
          />
        </svg>
        <span
          className={`text-[0.8125rem] font-semibold ${percent >= 100 ? "text-success" : "text-primary-strong"}`}
        >
          {percent}%
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
      {next && (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  const box =
    "flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card";
  return next ? (
    <Link
      href={TIP_HREF[next] as Route}
      className={`${box} transition-shadow hover:shadow-raised focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none`}
    >
      {content}
    </Link>
  ) : (
    <div className={box}>{content}</div>
  );
}

function HubLine({ row, status }: { row: Row; status: HubLineStatus }) {
  const label = t.rows[row.key];
  return (
    <li className="border-t border-border first:border-t-0">
      <Link
        href={row.href as Route}
        aria-label={status ? `${label}, ${status.text}` : label}
        className="flex min-h-13 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary-strong">
          <row.icon aria-hidden="true" className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 font-medium">{label}</span>
        {status && (
          <span className={`shrink-0 text-sm font-medium ${TONE[status.tone]}`}>{status.text}</span>
        )}
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
      </Link>
    </li>
  );
}
