import { referenceCode } from "@menao/core";
import { ArrowLeft, BadgeCheck, Hammer, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { TRADE_VISUALS } from "@/components/site/trade-visuals";
import { buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.chantier;

/**
 * Photo du chantier (première photo du projet) ou, à défaut, dégradé MENAO avec l'icône du métier
 * (marteau pour un métier inconnu). `trade` est le libellé du métier, dont le code du référentiel
 * se déduit (`referenceCode`).
 */
export function ChantierCover({
  url,
  trade = null,
  className = "",
  compact = false,
}: {
  url: string | null;
  trade?: string | null;
  className?: string;
  /** Petite vignette : icône réduite. */
  compact?: boolean;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4)
    return <img src={url} alt="" className={`object-cover ${className}`} />;
  }
  const Icon = (trade && TRADE_VISUALS[referenceCode(trade)]?.icon) || Hammer;
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-white/35 ring-1 ring-white/60 ${
          compact ? "size-12" : "size-20"
        }`}
      >
        <Icon
          strokeWidth={1.5}
          className={`text-white drop-shadow-[0_1px_2px_rgb(52_81_209/0.35)] ${compact ? "size-6" : "size-10"}`}
        />
      </span>
    </div>
  );
}

/**
 * En-tête de la vue d'un chantier (maquette « Vue d'un chantier ») : photo et retour, titre,
 * adresse, pastilles, description, puis le contenu propre à chaque rôle (personne, stepper).
 */
export function ChantierHero({
  photoUrl,
  trade = null,
  backHref,
  title,
  address,
  tags,
  description,
  children,
}: {
  photoUrl: string | null;
  /** Libellé du métier, pour l'icône de la couverture sans photo. */
  trade?: string | null;
  backHref: string;
  title: string;
  address: string | null;
  tags?: ReactNode;
  description: string | null;
  children?: ReactNode;
}) {
  return (
    <article className="overflow-hidden bg-surface sm:rounded-card sm:border sm:border-border sm:shadow-card">
      <div className="relative">
        <ChantierCover url={photoUrl} trade={trade} className="h-48 w-full sm:h-64" />
        <Link
          href={backHref as Route}
          className="absolute top-4 left-4 flex size-10 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-card hover:bg-surface focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          <span className="sr-only">{t.back}</span>
        </Link>
      </div>
      <div className="flex flex-col gap-5 px-4 pt-5 pb-6 sm:px-6">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[1.375rem] leading-tight font-medium tracking-tight sm:text-[1.625rem]">
            {title}
          </h1>
          {address && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              {address}
            </p>
          )}
          {tags && <div className="flex flex-wrap items-center gap-2">{tags}</div>}
          {description && (
            <p className="line-clamp-5 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </article>
  );
}

/** « Votre artisan » / « Votre client » : photo, nom, métier, bouton « Appeler ». */
export function PersonCard({
  label,
  name,
  detail,
  verified = false,
  photoUrl = null,
  phone = null,
  messageHref = null,
}: {
  label: string;
  name: string;
  detail?: string | null;
  verified?: boolean;
  photoUrl?: string | null;
  phone?: string | null;
  /** Conversation du chantier (F-40) : bouton « Message » à côté de « Appeler » (maquette). */
  messageHref?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
        <ArtisanPhoto
          url={photoUrl}
          name={name}
          className="size-11 shrink-0 rounded-full"
          initialsClassName="text-sm"
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          {(detail || verified) && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {detail}
              {verified && (
                <>
                  <BadgeCheck aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
                  <span className="sr-only">{t.verified}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>
      {(phone || messageHref) && (
        <div className={`grid gap-2 ${phone && messageHref ? "grid-cols-2" : ""}`}>
          {messageHref && (
            <Link href={messageHref as Route} className={buttonClasses()}>
              {fr.messages.button}
              <MessageCircle aria-hidden="true" className="size-4" />
            </Link>
          )}
          {phone && (
            <a href={`tel:${phone}`} className={buttonClasses({ variant: "outline" })}>
              {t.call}
              <Phone aria-hidden="true" className="size-4" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Onglets « Suivi du chantier » / « Dossier du chantier » (liens : chaque onglet a son adresse). */
export function ChantierTabs({ base, active }: { base: string; active: "suivi" | "dossier" }) {
  return (
    <nav aria-label={t.tabsLabel} className="grid grid-cols-2 gap-1 rounded-pill bg-border p-1">
      {(["suivi", "dossier"] as const).map((tab) => (
        <Link
          key={tab}
          href={(tab === "suivi" ? base : `${base}?onglet=dossier`) as Route}
          scroll={false}
          aria-current={active === tab ? "page" : undefined}
          className={`flex min-h-10 items-center justify-center rounded-pill px-3 text-center text-sm font-medium transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${
            active === tab
              ? "bg-surface text-primary-strong shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.tabs[tab]}
        </Link>
      ))}
    </nav>
  );
}

/** « Signaler un problème lié au chantier » (maquettes), vers le formulaire de contact. */
/** « Signaler un problème lié au chantier » (F-42) : formulaire du client ou de l'artisan. */
export function ReportProblemLink({ href }: { href: string }) {
  return (
    <Link
      href={href as Route}
      className="self-center rounded-md px-2 py-1 text-sm font-medium text-danger hover:underline focus-visible:ring-4 focus-visible:ring-danger/20 focus-visible:outline-none"
    >
      {t.report}
    </Link>
  );
}
