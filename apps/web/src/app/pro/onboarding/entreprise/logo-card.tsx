import { Card } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";
import { removeLogo } from "@/lib/artisan/actions";

const t = fr.pro.onboarding.company.logo;

/**
 * Logo des devis, factures et PV (ADR 0038) : aperçu du logo actuel, « Retirer le logo », dépôt
 * redimensionné dans le navigateur (PNG gardé en PNG pour la transparence).
 */
export function LogoCard({
  userId,
  logoUrl,
  hasLogo,
}: {
  userId: string;
  /** URL signée du logo actuel. */
  logoUrl: string | null;
  hasLogo: boolean;
}) {
  return (
    <Card>
      <section aria-labelledby="logo-title" className="flex flex-col gap-4">
        <h2 id="logo-title" className="text-lg font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        {logoUrl && (
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4) */}
            <img
              src={logoUrl}
              alt={t.current}
              className="h-auto max-h-16 w-auto max-w-48 rounded-input border border-border bg-surface object-contain p-2"
            />
            <form action={removeLogo}>
              <button
                type="submit"
                className="min-h-touch text-sm font-medium text-danger underline-offset-2 hover:underline"
              >
                {t.remove}
              </button>
            </form>
          </div>
        )}
        <UploadForm
          purpose="logo"
          userId={userId}
          accept="image/png,image/jpeg,image/webp"
          fileLabel={t.file}
          hint={t.hint}
          submitLabel={hasLogo ? t.change : t.send}
          resizeTo={600}
          keepTransparency
        />
      </section>
    </Card>
  );
}
