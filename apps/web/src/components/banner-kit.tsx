import { CopyButton, CopySnippet } from "@/components/copy-snippet";
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
  variant = "list",
}: {
  banners: readonly Banner[];
  copyLabel: string;
  copiedLabel: string;
  /** « grid » : vignettes côte à côte avec « Copier le code » (espace partenaire, lot 38). */
  variant?: "list" | "grid";
}) {
  if (variant === "grid") {
    return (
      <div className="flex flex-col gap-6">
        {(["particuliers", "artisans"] as const).map((audience) => (
          <section key={audience} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t.audiences[audience]}</h3>
            <ul className="flex flex-wrap items-end gap-x-6 gap-y-5">
              {banners
                .filter((b) => b.audience === audience)
                .map((banner) => (
                  <li key={banner.id} className="flex max-w-full flex-col items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- image statique du kit (spec §4.4) */}
                    <img
                      src={banner.src}
                      width={banner.width}
                      height={banner.height}
                      alt={t.preview(banner.width, banner.height)}
                      loading="lazy"
                      className="h-auto max-h-48 w-auto max-w-full rounded-lg"
                    />
                    <span className="text-[0.8125rem] font-semibold">
                      {t.size(banner.width, banner.height)}
                    </span>
                    {/* Code de la bannière, lisible et sélectionnable par les lecteurs d'écran. */}
                    <textarea
                      id={`banniere-${banner.id}`}
                      readOnly
                      value={banner.html}
                      aria-label={t.code(banner.width, banner.height)}
                      className="sr-only"
                    />
                    <span className="flex flex-wrap items-center gap-3">
                      <CopyButton
                        value={banner.html}
                        copyLabel={t.copyCode}
                        copiedLabel={copiedLabel}
                      />
                      <a
                        href={banner.src}
                        download
                        className="text-[0.8125rem] font-semibold text-primary-strong hover:underline"
                      >
                        {t.download}
                      </a>
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }
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
