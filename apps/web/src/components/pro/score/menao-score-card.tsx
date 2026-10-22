import { menaoScoreTips, type MenaoScoreTip } from "@menao/core";
import type { MyMenaoScore } from "@menao/validation";
import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { MenaoScore } from "@/components/artisan-profile/menao-score";
import { Card, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { PlanningConfirm } from "./planning-confirm";

const t = fr.pro.score;

/** Écran où l'artisan gagne les points de chaque conseil. */
const TIP_HREF: Record<MenaoScoreTip["key"], Route> = {
  verifie: "/pro/onboarding/documents",
  diplome: "/pro/onboarding/metiers",
  qualification: "/pro/onboarding/metiers",
  profil: "/pro/onboarding/profil",
};

/**
 * Score MENAO de l'artisan (ADR 0155) : total et points de chaque critère, comme sur sa fiche,
 * puis ce qui lui rapporterait des points tout de suite.
 */
export function MenaoScoreCard({ score }: { score: MyMenaoScore }) {
  const tips = menaoScoreTips(score.parts, {
    verified: score.facts.verified,
    diploma: score.facts.diplome,
    qualification: score.facts.qualification,
  });
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <MenaoScore score={{ score: score.score, ...score.parts }} />
      {tips.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <h3 className="text-sm font-medium">{t.tipsTitle}</h3>
          <ul className="flex flex-col gap-1">
            {tips.map((tip) => (
              <li key={tip.key}>
                <Link
                  href={TIP_HREF[tip.key]}
                  className="flex items-center gap-3 rounded-input px-2 py-2 text-sm hover:bg-background"
                >
                  <span className="flex-1">{t.tips[tip.key]}</span>
                  <span className="shrink-0 font-medium whitespace-nowrap text-success">
                    {t.tipPoints(tip.points)}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-subtle-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t.progressHint}</p>
      <TextLink href={"/criteres-de-classement" as Route} className="self-start text-sm">
        {t.learnMore}
      </TextLink>
    </Card>
  );
}

const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

/** Planning à confirmer chaque semaine (« Mes disponibilités »). */
export function PlanningCard({ updatedAt }: { updatedAt: string | null }) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {updatedAt ? t.planningUpdated(day.format(new Date(updatedAt))) : t.planningNever}{" "}
        {t.planningHint}
      </p>
      <PlanningConfirm />
    </Card>
  );
}
