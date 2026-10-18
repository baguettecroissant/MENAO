import { PORTFOLIO_MAX_PHOTOS } from "@menao/core";
import Image from "next/image";
import { ButtonLink, Card } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";
import { deletePortfolioPhoto } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { PresentationForm } from "./presentation-form";

const t = fr.pro.onboarding.profile;
const MAX_PHOTOS = PORTFOLIO_MAX_PHOTOS;

export default async function ProfileStepPage() {
  const { supabase, userId, artisan, avatarPath, photos } = await getOnboardingContext();
  const publicUrl = (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return (
    <div className="flex flex-col gap-6">
      {/* Aperçu réservé à l'espace pro : artisans validés ou suspendus. */}
      {(artisan.status === "valide" || artisan.status === "suspendu") && (
        <ButtonLink href="/pro/profil" variant="outline" className="self-start">
          {fr.pro.reviews.seePublic}
        </ButtonLink>
      )}
      <Card>
        <section aria-labelledby="avatar-title" className="flex flex-col gap-4">
          <h2 id="avatar-title" className="text-lg font-medium">
            {t.avatar}
          </h2>
          <p className="text-sm text-muted-foreground">{t.avatarHint}</p>
          {avatarPath && (
            <Image
              src={publicUrl("avatars", avatarPath)}
              alt={t.avatarAlt}
              width={128}
              height={128}
              className="size-32 rounded-full border border-border object-cover"
            />
          )}
          <UploadForm
            purpose="avatar"
            userId={userId}
            accept="image/jpeg,image/png"
            hint={fr.pro.onboarding.upload.fileHintPhoto}
            submitLabel={avatarPath ? t.avatarChange : t.avatarSend}
            resizeTo={512}
          />
        </section>
      </Card>

      <Card>
        <PresentationForm presentation={artisan.presentation} />
      </Card>

      <Card>
        <section aria-labelledby="portfolio-title" className="flex flex-col gap-4">
          <h2 id="portfolio-title" className="text-lg font-medium">
            {t.portfolio}
          </h2>
          <p className="text-sm text-muted-foreground">{t.portfolioHint}</p>
          {photos.length === 0 ? (
            <p className="text-muted-foreground">{t.portfolioEmpty}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.id} className="flex flex-col gap-1">
                  <Image
                    src={publicUrl("portfolio", photo.storage_path)}
                    alt={t.portfolioAlt(index + 1)}
                    width={400}
                    height={300}
                    className="aspect-4/3 w-full rounded-button border border-border object-cover"
                  />
                  <form action={deletePortfolioPhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <button
                      type="submit"
                      aria-label={`${t.portfolioDelete} — ${t.portfolioAlt(index + 1)}`}
                      className="min-h-touch text-sm font-medium text-danger underline-offset-2 hover:underline"
                    >
                      {t.portfolioDelete}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {photos.length < MAX_PHOTOS && (
            <UploadForm
              purpose="portfolio"
              userId={userId}
              accept="image/jpeg,image/png"
              hint={fr.pro.onboarding.upload.fileHintPhoto}
              submitLabel={t.portfolioAdd}
              resizeTo={1600}
            />
          )}
        </section>
      </Card>
    </div>
  );
}
