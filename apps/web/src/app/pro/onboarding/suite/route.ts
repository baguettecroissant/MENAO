import { guideStepPath, isGuideStepKey, nextGuideStep } from "@menao/core";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getOnboardingContext } from "@/lib/artisan/context";
import { guideFromContext } from "@/lib/artisan/guide";

/**
 * « Étape suivante » du parcours guidé (ADR 0373) : la première étape qui reste à faire après
 * `?apres=` ; sans paramètre, la première tout court. À la fin, ou une fois le dossier envoyé,
 * « Mon dossier ».
 */
export async function GET(request: NextRequest) {
  const context = await getOnboardingContext();
  const guide = guideFromContext(context);
  const after = request.nextUrl.searchParams.get("apres");
  const next = guide.active
    ? nextGuideStep(guide.steps, isGuideStepKey(after) ? after : null)
    : null;
  redirect((next ? guideStepPath(next) : "/pro/onboarding") as Route);
}
