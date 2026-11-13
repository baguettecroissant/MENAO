import { ImagePlus } from "lucide-react";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.company.logo;

/**
 * Rappel du logo dans l'éditeur de devis (ADR 0300), tant que l'entreprise n'en a pas : le dépôt
 * se fait sur place, comme dans Mon profil → Entreprise (même circuit, ADR 0038).
 */
export function LogoPrompt({ userId }: { userId: string }) {
  return (
    <section
      aria-labelledby="logo-prompt"
      className="flex flex-col gap-4 rounded-card border border-primary/25 bg-primary-softer p-4 sm:flex-row sm:items-start sm:p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-strong shadow-card">
        <ImagePlus aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="logo-prompt" className="text-base font-semibold">
            {t.promptTitle}
          </h2>
          <p className="text-sm text-label">{t.promptText}</p>
        </div>
        <UploadForm
          purpose="logo"
          userId={userId}
          accept="image/png,image/jpeg,image/webp"
          fileLabel={t.file}
          hint={t.hint}
          submitLabel={t.send}
          resizeTo={600}
          keepTransparency
        />
      </div>
    </section>
  );
}
