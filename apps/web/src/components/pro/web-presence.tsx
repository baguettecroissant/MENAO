import { ARTISAN_BADGE_SIZE, artisanBadge, artisanBadgeSvg } from "@menao/core";
import { Globe } from "lucide-react";
import type { Route } from "next";
import { CopySnippet } from "@/components/copy-snippet";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { GoogleListingForm } from "./google-listing-form";

const t = fr.pro.publicProfile.web;

/**
 * « Votre fiche sur internet » (F-61, ADR 0144) : adresse publique de la fiche, choix pour Google
 * et badge « Assuré et vérifié par MENAO » à coller sur son site. Adresse et badge sur le site
 * seulement (l'application ne renvoie jamais vers le site, règle 10) ; le choix pour Google existe
 * aussi dans l'application (ADR 0171).
 */
export function WebPresence({
  siteUrl,
  slug,
  name,
  visible,
  indexable,
  verified,
}: {
  siteUrl: string;
  slug: string | null;
  name: string;
  /** Validé, abonné et paiements actifs : la fiche est en ligne. */
  visible: boolean;
  indexable: boolean;
  verified: boolean;
}) {
  const online = visible && slug !== null;
  const badge = online ? artisanBadge(siteUrl, slug, name) : null;
  return (
    <section
      aria-labelledby="sur-internet"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2 id="sur-internet" className="flex items-center gap-2 text-[1.0625rem] font-medium">
        <Globe aria-hidden="true" className="size-[1.125rem] text-primary" />
        {t.title}
      </h2>
      {badge ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground/85">{t.lead}</p>
          <CopySnippet
            id="adresse-fiche"
            label={t.link}
            value={badge.page}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
          <TextLink href={`/artisans/${slug}` as Route} className="self-start text-sm">
            {t.open}
          </TextLink>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.hidden}</p>
      )}
      <GoogleListingForm indexable={indexable} />
      {badge && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="font-medium">{t.badgeTitle}</h3>
          <p className="text-sm text-foreground/85">
            {t.badgeLead} {verified ? t.badgeVerified : t.badgeNeutral}
          </p>
          {/* Aperçu généré ici, à l'état du jour (l'image servie est gardée une heure en cache). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG en ligne, sans optimisation (spec §4.4) */}
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(artisanBadgeSvg(verified))}`}
            alt={t.badgePreview}
            width={ARTISAN_BADGE_SIZE.width}
            height={ARTISAN_BADGE_SIZE.height}
          />
          <CopySnippet
            id="code-badge"
            label={t.badgeCode}
            value={badge.snippet}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        </div>
      )}
    </section>
  );
}
