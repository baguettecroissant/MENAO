import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  CreditCard,
  Eye,
  Sparkles,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { GuideBar } from "@/components/pro/guide-bar";
import { ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";

const t = fr.pro.onboarding.guide.sent;

/**
 * « Dossier envoyé » (ADR 0373) : la fin du parcours guidé. Pendant que l'équipe vérifie, la
 * formule et les paiements, expliqués en une phrase, puis l'espace rempli d'exemples (ADR 0184).
 */
export default async function DossierSentPage() {
  const { artisan, progress } = await getOnboardingContext();
  if (artisan.status !== "en_verification") redirect("/pro/onboarding");

  const next = !progress.formule
    ? { href: "/pro/onboarding/formule", label: t.planCta }
    : !progress.paiements
      ? { href: "/pro/onboarding/paiements", label: t.payCta }
      : { href: "/pro/decouvrir/tableau-de-bord", label: fr.pro.examples.onboardingCard.open };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <span className="flex size-14 items-center justify-center rounded-full bg-success text-primary-foreground">
        <CircleCheck aria-hidden="true" className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
        <p className="leading-relaxed text-label sm:text-[1.0625rem]">{t.lead}</p>
      </div>

      <h2 className="mt-2 text-[1.1875rem] leading-snug">{t.nextTitle}</h2>
      <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <Step
          href="/pro/onboarding/formule"
          icon={<Sparkles aria-hidden="true" className="size-5" />}
          title={t.planTitle}
          text={t.planText}
          done={progress.formule}
          minutes={2}
        />
        <Step
          href="/pro/onboarding/paiements"
          icon={<CreditCard aria-hidden="true" className="size-5" />}
          title={t.payTitle}
          text={t.payText}
          done={progress.paiements}
          minutes={5}
        />
      </ul>
      <ul className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <Step
          href="/pro/decouvrir/tableau-de-bord"
          icon={<Eye aria-hidden="true" className="size-5" />}
          title={fr.pro.examples.onboardingCard.open}
          text={t.discoverText}
        />
      </ul>

      <GuideBar
        secondary={
          <ButtonLink href="/pro/onboarding" variant="ghost" block>
            {t.later}
          </ButtonLink>
        }
      >
        <ButtonLink href={next.href as Route} size="lg" block>
          {next.label}
          <ArrowRight aria-hidden="true" className="size-5" />
        </ButtonLink>
      </GuideBar>
    </div>
  );
}

function Step({
  href,
  icon,
  title,
  text,
  done = false,
  minutes,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  text: string;
  done?: boolean;
  minutes?: number;
}) {
  return (
    <li>
      <Link
        href={href as Route}
        className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-background sm:px-5 ${focusRing}`}
      >
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-input ${
            done ? "bg-success text-white" : "bg-primary-soft text-primary-strong"
          }`}
        >
          {done ? <Check aria-hidden="true" className="size-5" strokeWidth={3} /> : icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
        </span>
        {done ? (
          <span className="shrink-0 rounded-pill bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
            {t.done}
          </span>
        ) : minutes ? (
          <span className="shrink-0 pt-0.5 text-xs font-semibold text-muted-foreground">
            {t.minutes(minutes)}
          </span>
        ) : (
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        )}
      </Link>
    </li>
  );
}
