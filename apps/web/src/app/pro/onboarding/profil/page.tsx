import { PORTFOLIO_MAX_PHOTOS, parisToday, presentationDraft } from "@menao/core";
import { ArrowLeft, Eye } from "lucide-react";
import Image from "next/image";
import { ButtonLink, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { deletePortfolioPhoto } from "@/lib/artisan/actions";
import { getOnboardingContext } from "@/lib/artisan/context";
import { guideAround, guideFromContext } from "@/lib/artisan/guide";
import { GuideBarSpace } from "@/components/pro/guide-bar";
import { PortfolioUpload } from "./portfolio-upload";
import { PresentationForm } from "./presentation-form";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { TradeCover } from "@/components/trade-cover";
import { TRADE_IMAGES } from "@/lib/site/images";
import { documentLogoUrl } from "@/lib/documents/logo";
import { ImageCard } from "./image-card";
import { LogoCard } from "./logo-card";

const t = fr.pro.onboarding.profile;
const MAX_PHOTOS = PORTFOLIO_MAX_PHOTOS;

export default async function ProfileStepPage() {
  const context = await getOnboardingContext();
  const { supabase, userId, artisan, avatarPath, photos, tradeCodes, territoryCodes } = context;
  // Parcours guidé (ADR 0373) : « Enregistrer et continuer » en bas, tant que le dossier se remplit.
  const guide = guideFromContext(context);
  const around = guide.active ? guideAround(guide, "profil") : null;
  const publicUrl = (bucket: string, path: string) =>
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  // « Proposer un texte » : métiers et qualification RGE en cours, pour la présentation proposée.
  const today = parisToday();
  const [trades, rge] = await Promise.all([
    supabase
      .from("trades")
      .select("label")
      .in("code", tradeCodes.length ? tradeCodes : ["-"])
      .order("sort_order"),
    supabase
      .from("artisan_rge_qualifications")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisan.id)
      .gte("date_fin", today),
  ]);
  const draft = presentationDraft(
    {
      companyName: artisan.nom_commercial ?? artisan.raison_sociale,
      legalFormCode: artisan.forme_juridique_code,
      trades: (trades.data ?? []).map((trade) => trade.label),
      city: artisan.adresse_commune,
      zoneMode: artisan.zone_mode,
      radiusKm: artisan.radius_km,
      territories: territoryCodes,
      sinceYear: artisan.date_creation_entreprise
        ? Number(artisan.date_creation_entreprise.slice(0, 4))
        : null,
      experienceYears: artisan.experience_years,
      rge: (rge.count ?? 0) > 0,
    },
    Number(today.slice(0, 4)),
  );

  const name = artisan.nom_commercial ?? artisan.raison_sociale ?? "";
  const tradeLabels = (trades.data ?? []).map((trade) => trade.label);
  const logoUrl = await documentLogoUrl(supabase, artisan.logo_path);
  // Refonte « Nette » (ADR 0254) : le formulaire à gauche, l'aperçu de la fiche à droite.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-6">
        {/* Aperçu réservé à l'espace pro : artisans validés ou suspendus. */}
        {(artisan.status === "valide" || artisan.status === "suspendu") && (
          <ButtonLink href="/pro/profil" variant="outline" className="self-start">
            {fr.pro.reviews.seePublic}
          </ButtonLink>
        )}
        {/* Une seule image, logo ou photo, facultative (lot 64, ADR 0355). */}
        <ImageCard
          userId={userId}
          imageUrl={avatarPath ? publicUrl("avatars", avatarPath) : null}
          isLogo={artisan.image_logo}
          initial={
            artisan.image_logo ||
            (!avatarPath &&
              !artisan.logo_path &&
              (artisan.status === "brouillon" || artisan.status === "refuse"))
              ? "logo"
              : "photo"
          }
          logoCard={
            <LogoCard userId={userId} logoUrl={logoUrl} hasLogo={artisan.logo_path !== null} />
          }
        />

        <Card>
          <PresentationForm
            presentation={artisan.presentation}
            draft={draft}
            guide={
              around
                ? {
                    backHref: around.backHref,
                    nextNote: around.next
                      ? fr.pro.onboarding.guide.next(fr.pro.onboarding.guide.nextNames[around.next])
                      : fr.pro.onboarding.guide.nextEnd,
                  }
                : undefined
            }
          />
        </Card>

        <Card>
          <section aria-labelledby="portfolio-title" className="flex flex-col gap-4">
            <h2 id="portfolio-title" className="text-lg">
              {t.portfolio}
            </h2>
            <p className="text-sm text-muted-foreground">{t.portfolioHint}</p>
            {photos.length === 0 ? null : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="flex flex-col gap-1">
                    <Image
                      src={publicUrl("portfolio", photo.storage_path)}
                      alt={t.portfolioAlt(index + 1)}
                      width={400}
                      height={300}
                      className="aspect-4/3 w-full rounded-input border border-border object-cover"
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
              <PortfolioUpload
                userId={userId}
                remaining={MAX_PHOTOS - photos.length}
                empty={photos.length === 0}
              />
            )}
          </section>
        </Card>
        {/* Retour au dossier en bas de page aussi : le lien du haut est loin après les envois. Dans
            le parcours guidé, la barre du bas mène à la suite. */}
        {around && (
          <div className="hidden lg:block">
            <GuideBarSpace />
          </div>
        )}
        {!around && (
          <ButtonLink href="/pro/onboarding" variant="outline" className="self-start">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {fr.pro.onboarding.documents.backToDossier}
          </ButtonLink>
        )}
      </div>
      <aside className="overflow-hidden rounded-card border border-border bg-surface shadow-card lg:sticky lg:top-6">
        <p className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground">
          <Eye aria-hidden="true" className="size-4" />
          {t.previewTitle}
        </p>
        {!avatarPath && tradeCodes[0] && TRADE_IMAGES[tradeCodes[0]] && (
          <TradeCover code={tradeCodes[0]} label={tradeLabels[0] ?? ""} className="h-28 w-full" />
        )}
        <div className="flex flex-col gap-3.5 p-5">
          {!avatarPath && tradeCodes[0] && TRADE_IMAGES[tradeCodes[0]] && (
            <p className="text-xs text-muted-foreground">{t.coverNote}</p>
          )}
          <div className="flex items-center gap-3.5">
            {avatarPath ? (
              <Image
                src={publicUrl("avatars", avatarPath)}
                alt=""
                width={64}
                height={64}
                className={
                  artisan.image_logo
                    ? "h-16 w-24 shrink-0 rounded-input border border-border bg-surface object-contain p-1.5"
                    : "size-16 shrink-0 rounded-full object-cover"
                }
              />
            ) : (
              // Sans photo : les initiales, comme sur la fiche vue par les clients.
              <ArtisanPhoto
                url={null}
                name={name}
                className="size-16 shrink-0 rounded-full"
                initialsClassName="text-xl"
              />
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-display text-lg font-bold">{name}</span>
              <span className="text-sm text-muted-foreground">
                {[...tradeLabels, artisan.adresse_commune].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-label">
            {artisan.presentation?.trim() || t.previewEmpty}
          </p>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 3).map((photo) => (
                <Image
                  key={photo.id}
                  src={publicUrl("portfolio", photo.storage_path)}
                  alt=""
                  width={160}
                  height={160}
                  className="aspect-square w-full rounded-input object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </aside>
      {/* Sur téléphone, l'aperçu vient en dernier : la place de la barre du parcours se garde après
          lui, sinon la barre le recouvre. */}
      {around && (
        <div className="lg:hidden">
          <GuideBarSpace />
        </div>
      )}
    </div>
  );
}
