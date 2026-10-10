import { Briefcase, CircleCheck, MapPin, ShieldCheck, Star } from "lucide-react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { StatusBadge, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.fairness.card;

/**
 * Carte artisan telle que la voient les particuliers (reprend ArtisanResultCard des résultats de
 * recherche), entourée des vérifications MENAO. Illustration : une seule image pour les lecteurs
 * d'écran.
 */
export function ProfileCardPreview() {
  return (
    <div role="img" aria-label={t.label} className="relative mx-auto w-full max-w-[19rem]">
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-[3rem] bg-primary/15 blur-3xl"
      />
      <div aria-hidden="true" className="relative">
        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-raised">
          <div className="relative">
            <ArtisanPhoto url={null} name={t.name} className="aspect-[16/10] w-full" />
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface/95 px-2.5 py-1 text-xs font-medium text-primary-strong shadow-card">
              <ShieldCheck className="size-3.5" />
              {t.verified}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-medium">{t.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Briefcase className="size-3.5 shrink-0" />
                {t.trade}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {t.zone}
              </p>
            </div>
            <div>
              <StatusBadge>{fr.search.results.availableNow}</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.specialties.map((specialty) => (
                <Tag key={specialty} tone="neutral">
                  {specialty}
                </Tag>
              ))}
              <Tag tone="neutral">{t.more}</Tag>
            </div>
            <span className="inline-flex min-h-10 w-full items-center justify-center rounded-button border border-primary text-sm font-medium text-primary-strong">
              {fr.search.selection.selectShort}
            </span>
          </div>
        </div>
        <div className="absolute top-[38%] -right-6 flex animate-menao-float flex-col gap-2 sm:-right-14">
          {t.checks.map((check) => (
            <span
              key={check}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-raised"
            >
              <CircleCheck className="size-3.5 text-success" />
              {check}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-0 -bottom-4 flex justify-center">
          <span className="inline-flex animate-menao-float items-center gap-1.5 rounded-pill bg-[#0b1438] px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-raised [animation-delay:-3s]">
            <Star className="size-3.5 fill-current" />
            {t.reviews}
          </span>
        </div>
      </div>
    </div>
  );
}
