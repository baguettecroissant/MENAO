import { CopySnippet } from "@/components/copy-snippet";
import { fr } from "@/i18n/fr";

const t = fr.partnerBanners;

type Banner = {
  id: string;
  audience: "particuliers" | "artisans";
  width: number;
  height: number;
  src: string;
  html: string;
};

/**
 * Bannières du kit partenaire (ADR 0141) : aperçu, code à copier et image à télécharger, par
 * public. Partagé par la fiche du back-office et l'espace partenaire.
 */
export function BannerKit({
  banners,
  copyLabel,
  copiedLabel,
}: {
  banners: readonly Banner[];
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {(["particuliers", "artisans"] as const).map((audience) => (
        <section key={audience} className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">{t.audiences[audience]}</h3>
          {banners
            .filter((b) => b.audience === audience)
            .map((banner) => (
              <div
                key={banner.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t.size(banner.width, banner.height)}
                  </span>
                  <a
                    href={banner.src}
                    download
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t.download}
                  </a>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- image statique du kit (spec §4.4) */}
                <img
                  src={banner.src}
                  width={banner.width}
                  height={banner.height}
                  alt={t.preview(banner.width, banner.height)}
                  loading="lazy"
                  className="h-auto max-w-full self-start"
                />
                <CopySnippet
                  id={`banniere-${banner.id}`}
                  label={t.size(banner.width, banner.height)}
                  value={banner.html}
                  copyLabel={copyLabel}
                  copiedLabel={copiedLabel}
                />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
