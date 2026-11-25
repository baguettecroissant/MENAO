import { displayPoints, type StandOutItem, type StandOutKey, type standOut } from "@menao/core";
import {
  Camera,
  Check,
  GraduationCap,
  ImageIcon,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.dossier.standOut;

const ICONS: Record<StandOutKey, LucideIcon> = {
  image: ImageIcon,
  savoir_faire: GraduationCap,
  certifications: ShieldCheck,
  realisations: Camera,
};

const LINKS: Record<StandOutKey, Route> = {
  image: "/pro/onboarding/profil#image" as Route,
  savoir_faire: "/pro/onboarding/metiers" as Route,
  certifications: "/pro/onboarding/metiers#certif-titre" as Route,
  realisations: "/pro/onboarding/profil#portfolio-title" as Route,
};

export type StandOutPreview = {
  name: string;
  subtitle: string;
  imageUrl: string | null;
  diplomaLabel: string | null;
  certificationLabel: string | null;
  specialitesCount: number;
  photoUrls: string[];
  presentation: string | null;
};

export type StandOutCardProps = {
  summary: ReturnType<typeof standOut>;
  photoCount: number;
  certificationCount: number;
  budgetLabel: string | null;
  preview: StandOutPreview;
};

/**
 * « Pour vous démarquer » (lot 81, ADR 0391) : carte ouverte, quatre atouts facultatifs avec les
 * points qu'ils rapportent au Score MENAO (calculés par `standOut`), la jauge des points à gagner,
 * l'aperçu de la fiche qui se remplit, et le budget minimum en simple ligne de réglage.
 */
export function StandOutCard({
  summary,
  photoCount,
  certificationCount,
  budgetLabel,
  preview,
}: StandOutCardProps) {
  const remaining = displayPoints(summary.remaining);
  const share = summary.max > 0 ? Math.round((summary.earned / summary.max) * 100) : 0;
  return (
    <section
      aria-labelledby="stand-out-title"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="stand-out-title" className="flex items-center gap-2 text-2xl tracking-tight">
            <Sparkles aria-hidden="true" className="size-5 shrink-0 text-primary" />
            {t.title}
          </h2>
          <p className="text-[0.9375rem] text-label">{t.lead}</p>
        </div>
        <span className="self-start rounded-pill bg-primary-soft px-2.5 py-1 text-sm font-bold whitespace-nowrap text-primary-strong">
          {t.count(summary.doneCount, summary.items.length)}
        </span>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem] lg:gap-5">
        {/* Jauge : les points de ce bloc déjà gagnés et ceux qui restent. */}
        <div className="flex flex-col gap-2 rounded-input bg-foreground px-4 py-3.5 text-surface">
          <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="font-semibold text-surface/75">{t.score}</span>
            <span className="text-surface/75">
              {remaining > 0 ? (
                <>
                  {t.toWinBefore} <b className="text-surface">{t.points(remaining)}</b>{" "}
                  {t.toWinAfter}
                </>
              ) : (
                t.allWon
              )}
            </span>
          </div>
          <div
            className="flex h-2.5 gap-1"
            role="img"
            aria-label={`${t.score} : ${t.points(displayPoints(summary.earned))} / ${t.points(displayPoints(summary.max))}`}
          >
            {share > 0 && (
              <span className="rounded-full bg-success-soft" style={{ flexGrow: share }} />
            )}
            {share < 100 && (
              <span
                className="rounded-full border border-dashed border-surface/45 bg-surface/15"
                style={{ flexGrow: 100 - share }}
              />
            )}
          </div>
          <p className="text-[0.8125rem] text-surface/75">{t.scoreHint}</p>
        </div>

        <FichePreview preview={preview} />

        <ul className="grid gap-3 sm:grid-cols-2">
          {summary.items.map((item) => (
            <li key={item.key} className="flex">
              <Tile
                item={item}
                doneLabel={
                  item.key === "realisations"
                    ? t.photosDone(photoCount)
                    : item.key === "certifications"
                      ? t.certsDone(certificationCount)
                      : t.items[item.key].done
                }
              />
            </li>
          ))}
        </ul>

        <Link
          href={"/pro/onboarding/metiers" as Route}
          className={`flex items-center gap-3 rounded-input border border-border px-3.5 py-3 hover:bg-background ${focusRing}`}
        >
          <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-sm font-semibold">{t.budgetTitle}</b>
            <span className="text-[0.8125rem] text-muted-foreground">
              {budgetLabel ? t.budgetSet(budgetLabel) : t.budgetAll}
            </span>
          </span>
          <span className="text-sm font-semibold text-muted-foreground">{t.modify}</span>
        </Link>
      </div>
    </section>
  );
}

function Tile({ item, doneLabel }: { item: StandOutItem; doneLabel: string }) {
  const Icon = ICONS[item.key];
  const texts = t.items[item.key];
  const gain = displayPoints(item.gain);
  const earned = displayPoints(item.earned);
  return (
    <div
      className={`flex w-full flex-col gap-2.5 rounded-input border border-border p-4 sm:p-4.5 ${
        item.done ? "bg-background" : "bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            item.done ? "bg-success-soft text-success" : "bg-foreground text-surface"
          }`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        {item.done ? (
          <span className="rounded-pill bg-success-soft px-2.5 py-1 text-[0.8125rem] font-bold whitespace-nowrap text-success">
            {t.gained(earned)}
          </span>
        ) : gain > 0 ? (
          <span className="rounded-pill bg-primary-soft px-2.5 py-1 text-[0.8125rem] font-bold whitespace-nowrap text-primary-strong">
            {item.key === "savoir_faire" ? t.upTo(gain) : t.points(gain)}
          </span>
        ) : null}
      </div>
      <h3 className="text-[1.0625rem] leading-tight font-bold tracking-tight">{texts.title}</h3>
      <p className="text-sm text-label">{texts.text}</p>
      <div className="mt-auto flex items-center justify-between gap-2.5 pt-1">
        {item.done ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-success">
              <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
              {doneLabel}
            </span>
            <Link
              href={LINKS[item.key]}
              aria-label={`${t.modify} : ${texts.title}`}
              className={`rounded-sm text-sm font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
            >
              {t.modify}
            </Link>
          </>
        ) : (
          <ButtonLink
            href={LINKS[item.key]}
            variant="secondary"
            size="sm"
            className="!rounded-pill"
            aria-label={`${texts.action} : ${texts.title}`}
          >
            <Plus aria-hidden="true" className="size-4" />
            {texts.action}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function Slot({ label }: { label: string }) {
  return (
    <span className="rounded-md border-[1.5px] border-dashed border-border-strong px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-strong">
      {label}
    </span>
  );
}

function FichePreview({ preview }: { preview: StandOutPreview }) {
  const photos = preview.photoUrls.slice(0, 3);
  return (
    <aside
      aria-label={t.preview}
      className="flex flex-col gap-3 rounded-input border border-border bg-background p-4 lg:col-start-2 lg:row-span-3 lg:row-start-1"
    >
      <span className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {t.preview}
      </span>
      <div className="flex flex-col gap-2.5 rounded-input border border-border bg-surface p-3.5">
        <div className="flex items-center gap-3">
          {preview.imageUrl ? (
            <Image
              src={preview.imageUrl}
              alt=""
              width={104}
              height={104}
              className="size-13 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <span
              aria-label={t.previewImage}
              className="flex size-13 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-dashed border-border-strong text-muted-foreground"
            >
              <ImageIcon aria-hidden="true" className="size-5" />
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <b className="truncate text-[0.9375rem] font-semibold">{preview.name}</b>
            <span className="truncate text-[0.8125rem] text-muted-foreground">
              {preview.subtitle}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {preview.diplomaLabel ? (
            <Badge label={preview.diplomaLabel} />
          ) : (
            <Slot label={t.slots.diploma} />
          )}
          {preview.certificationLabel ? (
            <Badge label={preview.certificationLabel} />
          ) : (
            <Slot label={t.slots.certification} />
          )}
          {preview.specialitesCount > 0 ? (
            <Badge label={t.specialites(preview.specialitesCount)} />
          ) : (
            <Slot label={t.slots.specialites} />
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) =>
            photos[i] ? (
              <Image
                key={i}
                src={photos[i]}
                alt={t.previewPhoto(i + 1)}
                width={200}
                height={150}
                className="h-16 w-full rounded-lg object-cover"
              />
            ) : (
              <span
                key={i}
                className="flex h-16 items-center justify-center rounded-lg border-[1.5px] border-dashed border-border-strong text-[0.6875rem] text-muted-foreground"
              >
                {t.slots.photo}
              </span>
            ),
          )}
        </div>
        {preview.presentation && (
          <p className="line-clamp-2 text-[0.8125rem] text-label">{preview.presentation}</p>
        )}
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">{t.previewHint}</p>
    </aside>
  );
}
