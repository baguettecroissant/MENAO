import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";
import { removeAccountPhoto, saveAccountPhoto } from "@/lib/account/actions";

const t = fr.account.photo;

/**
 * Photo de profil du particulier (lot 66, ADR 0360) : facultative, cadrée avant l'envoi, retirée
 * pour de bon sur demande. Seuls la voient les artisans à qui il a envoyé une demande, une fois
 * celle-ci acceptée ; jamais le public.
 */
export function AccountPhotoCard({
  userId,
  photoUrl,
  initials,
}: {
  userId: string;
  photoUrl: string | null;
  initials: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-label">{t.privacy}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- image non optimisée par Vercel (spec §4.4)
          <img
            src={photoUrl}
            alt={t.alt}
            className="size-28 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-28 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-3xl font-bold text-white"
          >
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <UploadForm
            purpose="avatar"
            formId="photo-compte"
            userId={userId}
            accept="image/jpeg,image/png"
            fileLabel={t.file}
            hint={t.hint}
            submitLabel={photoUrl ? t.change : t.send}
            dropLabel={t.drop}
            resizeTo={512}
            square
            process={saveAccountPhoto}
          />
        </div>
      </div>
      {photoUrl && (
        <form action={removeAccountPhoto}>
          <button
            type="submit"
            className="min-h-touch text-sm font-semibold text-danger underline-offset-2 hover:underline"
          >
            {t.remove}
          </button>
        </form>
      )}
    </div>
  );
}
