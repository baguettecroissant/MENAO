import {
  teamCan,
  type ProfileHubRow,
  type ProfileHubTone,
  type ProfileTip,
  type TeamPermission,
  type TeamPosition,
} from "@menao/core";
import type { ReferralRow, WelcomeGift } from "@menao/validation";
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
  QrCode,
  ReceiptText,
  Star,
  UserRound,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { ButtonLink, StatusBadge, VerifiedBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { exampleHref } from "./examples";
import { SheetChip } from "./sheet";
import type { HubLineStatus } from "@/lib/artisan/profile-hub";
import { ShareCard } from "./share-card";
import { WelcomeGiftCard } from "./welcome-gift-card";

const t = fr.pro.hub;

type RowKey =
  | ProfileHubRow
  | "businessCards"
  | "subscription"
  | "invoices"
  | "identity"
  | "notifications"
  | "help"
  | "examples"
  | "team";
type Row = { key: RowKey; icon: LucideIcon; href: string };

/**
 * Droit nécessaire pour chaque rubrique (ADR 0241) : un membre de l'équipe ne voit que les siennes
 * (compte, notifications, aide ; disponibilités et factures pour le chef d'équipe).
 */
const ROW_PERMISSION: Partial<Record<RowKey, TeamPermission>> = {
  photo: "storefront",
  portfolio: "storefront",
  reviews: "storefront",
  grade: "storefront",
  businessCards: "storefront",
  company: "storefront",
  trades: "storefront",
  zone: "storefront",
  availability: "agenda",
  team: "team",
  documents: "dossier",
  charter: "dossier",
  payments: "subscription",
  subscription: "subscription",
  invoices: "money",
  examples: "storefront",
};

/** Rubriques de « Mon profil », dans l'ordre de l'application (ADR 0129, 0131). */
const SECTIONS: { key: keyof typeof t.sections; rows: Row[] }[] = [
  {
    key: "profile",
    rows: [
      { key: "photo", icon: UserRound, href: "/pro/onboarding/profil" },
      { key: "portfolio", icon: Images, href: "/pro/onboarding/profil" },
      { key: "reviews", icon: Star, href: "/pro/avis" },
      { key: "grade", icon: Award, href: "/pro/grade" },
      // Cartes de visite à donner aux clients (ADR 0161).
      { key: "businessCards", icon: QrCode, href: "/pro/cartes-de-visite" },
    ],
  },
  {
    key: "company",
    rows: [
      { key: "company", icon: Building2, href: "/pro/onboarding/entreprise" },
      { key: "trades", icon: Wrench, href: "/pro/onboarding/metiers" },
      { key: "zone", icon: MapPin, href: "/pro/onboarding/zone" },
      { key: "availability", icon: CalendarClock, href: "/pro/agenda/disponibilites" },
      // Comptes d'équipe (ADR 0240) : patron seulement.
      { key: "team", icon: Users, href: "/pro/equipe" },
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
      { key: "help", icon: LifeBuoy, href: "/pro/aide" },
      // Données d'exemple à tout moment (ADR 0190), aussi après la validation ou le masquage.
      { key: "examples", icon: Eye, href: "/pro/decouvrir" },
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

/** Couleur des icônes de chaque rubrique (refonte « Nette », ADR 0250). */
const SECTION_ICON: Record<keyof typeof t.sections, string> = {
  profile: "bg-primary-soft text-primary-strong",
  company: "bg-success-soft text-success",
  compliance: "bg-border/70 text-label",
  money: "bg-primary-soft text-primary-strong",
  account: "bg-border/70 text-label",
};

const CHIP_TONE: Record<ProfileHubTone, "success" | "warning" | "danger" | "neutral"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "neutral",
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
  /** Carte de visite (ADR 0191) : fiche publique d'un artisan validé. */
  card?: { url: string; qr: { size: number; path: string } } | null;
  /** Parrainage (F-60, ADR 0161) : artisans validés seulement. */
  referral: {
    link: string;
    code: string;
    joined: number;
    rewarded: number;
    monthsThisYear: number;
    qr: { size: number; path: string };
    referrals: ReferralRow[];
  } | null;
  /** Cadeau de bienvenue du filleul (ADR 0154). */
  welcomeGift: WelcomeGift | null;
  /** « Mon équipe » (ADR 0240) : comptes utilisés et places ; absent pour un membre. */
  team?: { used: number; seats: number } | null;
  /** Place dans l'entreprise (ADR 0241) ; patron par défaut (exemples). */
  teamPosition?: TeamPosition;
};

/**
 * « Mon profil » sur le site (ADR 0131), comme dans l'application (ADR 0129) : en-tête, jauge de
 * la fiche, « Voir ma fiche » et toutes les rubriques avec leur état.
 */
export function ProfileHubView({
  hub,
  example = false,
  shareTab,
}: {
  hub: ProfileHubData;
  /** Exemple (ADR 0184) : liens vers les pages d'exemples, les autres inactifs. */
  example?: boolean;
  /** Onglet de la carte de visite et du parrainage ouvert à l'arrivée. */
  shareTab?: "card" | "referral";
}) {
  const position = hub.teamPosition ?? "patron";
  const patron = position === "patron";
  const sections = SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      const permission = ROW_PERMISSION[row.key];
      return !permission || teamCan(position, permission);
    }),
  })).filter((section) => section.rows.length > 0);
  const statusLabel = hub.status === "valide" ? null : t.status[hub.status];
  const { percent, next } = hub.strength;
  const link = (href: string) => (example ? exampleHref(href) : href);
  const photo = (
    <ArtisanPhoto
      url={hub.avatarUrl}
      name={hub.name}
      className="size-[4.25rem] rounded-full sm:size-[5.25rem]"
      initialsClassName="text-2xl"
    />
  );
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-5">
            {example || !patron ? (
              <span className="shrink-0">{photo}</span>
            ) : (
              <Link
                href="/pro/onboarding/profil"
                aria-label={t.changePhoto}
                className="relative shrink-0 rounded-full focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
              >
                {photo}
                <span className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full border border-border bg-surface text-label">
                  <Camera aria-hidden="true" className="size-3.5" />
                </span>
              </Link>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-[1.875rem] leading-[1.05] sm:text-[2.5rem]">{hub.name}</h1>
              {(hub.company || hub.city) && (
                <p className="truncate text-[0.9375rem] text-label">
                  {[hub.company, hub.city].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {hub.verified && <VerifiedBadge>{t.verified}</VerifiedBadge>}
                {statusLabel && <StatusBadge tone="warning">{statusLabel}</StatusBadge>}
                {hub.score && (
                  <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft px-2 py-1 text-xs font-bold text-primary-strong">
                    <Star aria-hidden="true" className="size-3.5" />
                    {t.score(hub.score.percent, hub.score.count)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {patron && (
            <div className="flex flex-wrap gap-2">
              <ButtonLink
                href={(link("/pro/profil") ?? "/pro/profil") as Route}
                variant="secondary"
                block={false}
              >
                <Eye aria-hidden="true" className="size-4" />
                {t.seeProfile}
              </ButtonLink>
              {link("/pro/cartes-de-visite") && (
                <Link
                  href={link("/pro/cartes-de-visite") as Route}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-foreground px-5 text-sm font-semibold text-surface hover:opacity-90 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
                >
                  <QrCode aria-hidden="true" className="size-4" />
                  {t.businessCard}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Maquette du lot 37 : le cadeau du filleul en haut de « Mon profil ». */}
        {hub.welcomeGift && <WelcomeGiftCard gift={hub.welcomeGift} />}

        {patron && (
          <Strength percent={percent} next={next} href={next ? link(TIP_HREF[next]) : null} />
        )}
        {(hub.card || hub.referral) && (
          <ShareCard
            initialTab={shareTab}
            card={
              hub.card
                ? {
                    ...hub.card,
                    name: hub.name,
                    company: hub.company,
                    city: hub.city,
                    avatarUrl: hub.avatarUrl,
                    verified: hub.verified,
                    score: hub.score,
                  }
                : null
            }
            referral={hub.referral}
          />
        )}

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.key}
              aria-labelledby={`hub-${section.key}`}
              className="flex flex-col gap-2"
            >
              <h2 id={`hub-${section.key}`} className="text-[1.0625rem]">
                {t.sections[section.key]}
              </h2>
              <ul className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                {section.rows
                  .filter((row) => !(example && row.key === "examples"))
                  .filter((row) => row.key !== "team" || Boolean(hub.team))
                  .map((row) => (
                    <HubLine
                      key={row.key}
                      row={row}
                      iconTone={SECTION_ICON[section.key]}
                      href={link(row.href)}
                      status={statusOf(row.key, hub)}
                    />
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
  if (key === "team") {
    if (!hub.team) return null;
    return hub.team.seats > 1
      ? { text: t.values.team(hub.team.used, hub.team.seats), tone: "neutral" }
      : { text: t.values.teamNotIncluded, tone: "neutral" };
  }
  if (key === "subscription") {
    return hub.subscriptionActive
      ? { text: t.values.subscriptionActive, tone: "success" }
      : { text: t.values.subscriptionToChoose, tone: "warning" };
  }
  if (
    key === "businessCards" ||
    key === "invoices" ||
    key === "identity" ||
    key === "notifications" ||
    key === "help" ||
    key === "examples"
  ) {
    return null;
  }
  return hub.statuses[key];
}

function Strength({
  percent,
  next,
  href,
}: {
  percent: number;
  next: ProfileTip | null;
  href: string | null;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const done = percent >= 100;
  const color = done ? "var(--color-success)" : "var(--color-primary)";
  const title = next ? t.strength(percent) : t.complete;
  const hint = next ? t.tips[next] : t.completeHint;
  // Carte « Prochaine étape » (refonte « Nette », ADR 0250) : anneau, conseil et son bouton.
  return (
    <section
      aria-label={t.nextStep}
      className={`flex flex-col gap-4 rounded-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${done ? "bg-success-soft" : "bg-primary-soft"}`}
    >
      <div className="flex items-center gap-4">
        <span className="relative flex size-14 shrink-0 items-center justify-center">
          <svg aria-hidden="true" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              strokeWidth="6"
              className="stroke-surface"
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
            aria-hidden="true"
            className={`font-display text-[0.8125rem] font-bold ${done ? "text-success" : "text-primary-strong"}`}
          >
            {percent}%
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          {next && (
            <span className="text-[0.8125rem] font-bold tracking-[0.04em] text-primary-strong uppercase">
              {t.nextStep}
            </span>
          )}
          <span className="font-semibold">{title}</span>
          <span className="text-sm text-label">{hint}</span>
        </span>
      </div>
      {next && href && (
        <ButtonLink href={href as Route} block={false} className="max-sm:w-full">
          {fr.pro.publicProfile.tips[next].action}
        </ButtonLink>
      )}
    </section>
  );
}

function HubLine({
  row,
  href,
  status,
  iconTone,
}: {
  row: Row;
  iconTone: string;
  /** Null dans les exemples quand la rubrique n'a pas de page d'exemple. */
  href: string | null;
  status: HubLineStatus;
}) {
  const label = t.rows[row.key];
  const content = (
    <>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] ${iconTone}`}
      >
        <row.icon aria-hidden="true" className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 font-semibold">{label}</span>
      {status && <SheetChip tone={CHIP_TONE[status.tone]}>{status.text}</SheetChip>}
    </>
  );
  const line = "flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5";
  return (
    <li className="border-t border-border first:border-t-0">
      {href ? (
        <Link
          href={href as Route}
          aria-label={status ? `${label}, ${status.text}` : label}
          className={`${line} transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none`}
        >
          {content}
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : (
        <div className={line}>{content}</div>
      )}
    </li>
  );
}
