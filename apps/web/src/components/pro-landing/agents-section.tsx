import type { Route } from "next";
import Link from "next/link";
import { BellRing, Headset, PenLine, ReceiptText, Sparkles } from "lucide-react";
import { ScenePhoto } from "@/components/site/scene-photo";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.agents;
const ICONS = [Headset, PenLine, ReceiptText, BellRing];

/**
 * « Assistants IA » de l'Espace Pro (ADR 0265) : ce que font Manon et les assistants écrits,
 * avec un exemple de compte rendu d'appel et de brouillon de devis (valeurs d'exemple), posés sur
 * la photo de l'artisan dans sa camionnette (ADR 0271).
 */
export function AgentsSection({ id }: { id: string }) {
  return (
    <section aria-labelledby={id} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 rounded-hero bg-foreground px-6 py-12 text-white sm:px-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_28rem] lg:gap-12">
        <div className="flex flex-col gap-7">
          <div className="reveal flex flex-col gap-3">
            <p className="text-[0.8125rem] font-bold tracking-[0.08em] text-[#9fb1ef] uppercase">
              {t.eyebrow}
            </p>
            <h2
              id={id}
              className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[2.5rem]"
            >
              {t.title}
            </h2>
          </div>
          <ul className="flex flex-col gap-5">
            {t.items.map((item, i) => {
              const Icon = ICONS[i] ?? Sparkles;
              return (
                <li key={item.title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] bg-white/10">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[1.0625rem] font-bold">{item.title}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-pretty text-white/75">
                      {item.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href={"/pro/formules#comparatif" as Route}
            className="self-start font-semibold text-[#aebcff] underline-offset-4 hover:underline"
          >
            {t.more}
          </Link>
        </div>
        <div className="flex flex-col">
          <div className="aspect-[4/3] overflow-hidden rounded-[1.375rem]">
            <ScenePhoto
              scene="julienVan"
              sizes="(min-width: 1024px) 448px, 92vw"
              position="42% 40%"
              className="size-full"
            />
          </div>
          <div
            aria-label={t.callLabel}
            role="img"
            className="relative mx-3 -mt-20 flex flex-col gap-3 sm:mx-5"
          >
            <div className="flex flex-col gap-3 rounded-[1.375rem] border border-white/15 bg-foreground/90 p-5 shadow-[0_20px_40px_rgb(0_0_0/0.35)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#86a0fb,#4869f6)] font-bold">
                  M
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="font-bold">{t.callTitle}</span>
                  <span className="text-sm text-white/70">{t.callMeta}</span>
                </div>
                <span className="ml-auto rounded-[0.625rem] bg-[#7ee2b0]/20 px-2.5 py-1 text-xs font-bold text-[#7ee2b0]">
                  {t.callStatus}
                </span>
              </div>
              <p className="rounded-[0.875rem] bg-white/[0.06] px-3.5 py-3 text-sm leading-relaxed text-white/85">
                {t.callText}
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-[1.125rem] bg-white p-3.5 text-foreground shadow-raised">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary text-white">
                <Sparkles aria-hidden="true" className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex justify-between gap-2 text-[0.8125rem] font-bold">
                  {t.draftTitle}
                  <span className="font-normal text-muted-foreground">{t.draftTime}</span>
                </span>
                <span className="text-[0.8125rem] text-label">{t.draftText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
