import { Inbox, PenLine, Wallet, type LucideIcon } from "lucide-react";
import { PhoneMockup } from "@/components/site/device-mockups";
import { fr } from "@/i18n/fr";
import { APP_SCREENS } from "@/lib/site/app-screens";

const m = fr.site.mockups;

const TONES = {
  primary: { icon: "bg-primary-soft text-primary-strong", label: "text-primary-strong" },
  neutral: { icon: "bg-background text-foreground", label: "text-foreground" },
  success: { icon: "bg-success-soft text-success", label: "text-success" },
} as const;

/** Carte d'une étape du parcours (valeurs d'exemple, décorative : le téléphone porte la description). */
function FlowCard({
  step,
  icon: Icon,
  tone,
  card,
  className = "",
}: {
  step: number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  card: { eyebrow: string; title: string; sub: string; pill?: string };
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute flex items-start gap-3 rounded-[1.25rem] bg-surface p-3.5 text-foreground shadow-[0_24px_50px_-12px_rgb(4_8_30/0.5)] sm:gap-3.5 sm:p-4 ${className}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 ${TONES[tone].icon}`}
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`text-[0.6875rem] font-bold tracking-[0.06em] uppercase ${TONES[tone].label}`}
        >
          {card.eyebrow}
        </span>
        <span className="font-display text-[0.9375rem] leading-tight font-bold tracking-tight sm:text-[1.0625rem]">
          {card.title}
        </span>
        <span className="text-xs leading-snug text-label sm:text-[0.8125rem]">{card.sub}</span>
        {card.pill && (
          <span className="mt-1.5 self-start rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-strong">
            {card.pill}
          </span>
        )}
      </span>
      <span className="absolute -top-2.5 -left-2.5 hidden size-6 items-center justify-center rounded-full border-2 border-white bg-foreground text-xs font-bold text-white xl:flex">
        {step}
      </span>
    </div>
  );
}

/**
 * Visuel du bandeau de l'Espace Pro (ADR 0270) : le vrai accueil de l'application dans un grand
 * téléphone, et le parcours en cartes (demande, devis signé, acompte). Très grand écran : trois
 * cartes à côté du téléphone ; en dessous : deux cartes sur le téléphone, coupé en bas sur mobile.
 */
export function HeroFlow() {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] max-lg:-mb-16 sm:max-lg:-mb-24 xl:max-w-none">
      <span
        aria-hidden="true"
        className="absolute top-16 left-[5.5rem] hidden h-[25rem] border-l-2 border-dashed border-white/40 xl:block"
      />
      <div className="mx-auto w-64 max-lg:h-[27rem] max-lg:overflow-hidden lg:w-60 xl:mr-0 xl:w-[19rem]">
        <PhoneMockup screen={APP_SCREENS.proAccueil} alt={m.screens.proAccueil} priority />
      </div>
      <FlowCard
        step={1}
        icon={Inbox}
        tone="primary"
        card={m.flow.request}
        className="top-[16.25rem] left-0 w-[15.5rem] lg:top-[21rem] xl:top-11 xl:w-[16.5rem]"
      />
      <FlowCard
        step={2}
        icon={PenLine}
        tone="neutral"
        card={m.flow.signed}
        className="top-[15.5rem] left-8 w-[16.5rem] max-xl:hidden"
      />
      <FlowCard
        step={3}
        icon={Wallet}
        tone="success"
        card={m.flow.deposit}
        className="top-[9.75rem] right-0 w-[13.25rem] lg:top-[12.5rem] xl:top-[26rem] xl:right-auto xl:left-0 xl:w-[16.5rem]"
      />
    </div>
  );
}
