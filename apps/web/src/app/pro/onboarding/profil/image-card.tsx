"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui";
import { UploadForm } from "@/components/upload-form";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.profile;
const i = t.image;

type Kind = "logo" | "photo";

/**
 * « Votre image » (lot 64, ADR 0355) : une seule image, logo ou photo, au choix de l'artisan, et
 * facultative. Le logo s'affiche en entier sur la fiche et sert aussi sur les documents ; avec une
 * photo, le logo des documents reste proposé à part (`logoCard`).
 */
export function ImageCard({
  userId,
  imageUrl,
  isLogo,
  initial,
  logoCard,
}: {
  userId: string;
  /** Image actuelle de la fiche (photo ou logo). */
  imageUrl: string | null;
  isLogo: boolean;
  initial: Kind;
  logoCard: ReactNode;
}) {
  const [kind, setKind] = useState<Kind>(initial);
  return (
    <>
      <Card id="image" className="scroll-mt-24">
        <section aria-labelledby="image-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="image-title" className="text-lg">
              {i.title}
            </h2>
            <span className="rounded-pill bg-background px-2.5 py-1 text-xs font-semibold text-label">
              {i.optional}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{i.lead}</p>
          <div role="radiogroup" aria-label={i.choice} className="grid gap-2 sm:grid-cols-2">
            {(["logo", "photo"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                onClick={() => setKind(value)}
                className={`flex min-h-touch flex-col gap-0.5 rounded-input bg-surface px-3.5 py-3 text-left focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${
                  kind === value ? "border-2 border-foreground" : "border border-border"
                }`}
              >
                <span className="text-[0.9375rem] font-semibold">{i.kinds[value].label}</span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  {i.kinds[value].hint}
                </span>
              </button>
            ))}
          </div>
          {kind === "logo" ? (
            <>
              {imageUrl && isLogo && (
                // eslint-disable-next-line @next/next/no-img-element -- image publique, sans optimisation Vercel (spec §4.4)
                <img
                  src={imageUrl}
                  alt={i.logoAlt}
                  className="h-auto max-h-24 w-auto max-w-56 self-start rounded-input border border-border bg-surface object-contain p-2"
                />
              )}
              <UploadForm
                purpose="image_logo"
                userId={userId}
                accept="image/png,image/jpeg,image/webp"
                fileLabel={i.logoFile}
                dropLabel={i.logoDrop}
                hint={i.logoFormats}
                submitLabel={imageUrl && isLogo ? i.logoChange : i.logoSend}
                resizeTo={600}
                keepTransparency
              />
              <ul className="flex flex-col gap-1.5 text-sm text-label">
                {i.logoWhere.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              {imageUrl && !isLogo && (
                <Image
                  src={imageUrl}
                  alt={t.avatarAlt}
                  width={128}
                  height={128}
                  className="size-32 rounded-full border border-border object-cover"
                />
              )}
              <UploadForm
                purpose="avatar"
                userId={userId}
                dropLabel={i.photoDrop}
                accept="image/jpeg,image/png"
                hint={fr.pro.onboarding.upload.fileHintPhoto}
                submitLabel={imageUrl && !isLogo ? t.avatarChange : t.avatarSend}
                resizeTo={512}
                square
              />
              <p className="flex gap-2 text-sm text-label">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                {i.photoWhere}
              </p>
            </>
          )}
          <p className="rounded-input bg-background px-3.5 py-3 text-sm text-label">
            <b>{i.noneTitle}</b> {i.none}
          </p>
        </section>
      </Card>
      {kind === "photo" && logoCard}
    </>
  );
}
