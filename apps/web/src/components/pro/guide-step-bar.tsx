import { ArrowRight } from "lucide-react";
import { GuideBar, GuideBarSpace } from "@/components/pro/guide-bar";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { getOnboardingContext } from "@/lib/artisan/context";
import { guideAround, guideFromContext, suiteHref } from "@/lib/artisan/guide";

const g = fr.pro.onboarding.guide;

/**
 * Barre du bas des étapes « formule » et « paiements » du parcours (ADR 0376) : l'action de
 * l'étape est dans la page (choisir une formule, ouvrir Stripe) ; la barre permet de continuer,
 * ou de remettre l'étape à plus tard sans être bloqué. Rien pour un artisan déjà validé.
 */
export async function GuideStepBar({ step }: { step: "formule" | "paiements" }) {
  const guide = guideFromContext(await getOnboardingContext());
  if (!guide.active) return null;
  const around = guideAround(guide, step);
  const done = guide.steps.find((s) => s.key === step)?.done === true;
  return (
    <>
      <GuideBarSpace />
      <GuideBar
        backHref={around.backHref}
        note={around.next ? g.next(g.nextNames[around.next]) : g.nextEnd}
      >
        <ButtonLink href={suiteHref(step)} variant={done ? "primary" : "outline"} size="lg" block>
          {done ? g.continue : g.later}
          <ArrowRight aria-hidden="true" className="size-5" />
        </ButtonLink>
      </GuideBar>
    </>
  );
}
