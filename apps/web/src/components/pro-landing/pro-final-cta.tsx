import type { ReactNode } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { CallbackLink } from "./callback-link";

const t = fr.pro.landing;

/** Appel final des pages Pro (ADR 0265) : inscription ou rappel, sur fond bleu nuit. */
export function ProFinalCta({
  id,
  action,
}: {
  id: string;
  /** Bouton d'inscription à la place du lien simple (code suivi des campagnes, ADR 0266). */
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="px-2 py-2 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-5 rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_58%,#2a3fb8_100%)] px-6 py-16 text-center text-white sm:py-20">
        <h2
          id={id}
          className="reveal text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[3rem]"
        >
          {t.finalTitle}
        </h2>
        <p className="max-w-2xl text-pretty text-white/80 sm:text-lg">{t.finalText}</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {action ?? (
            <ButtonLink href="/pro/inscription" size="lg">
              {t.hero.signUp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          )}
          <CallbackLink tone="dark" />
        </div>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/85">
          {t.finalReassurance.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <CircleCheck aria-hidden="true" className="size-4 text-[#7ee2b0]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
