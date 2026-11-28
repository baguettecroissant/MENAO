"use client";

import { BadgeCheck, Map as MapIcon } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { markBadgeSeen } from "@/lib/commercial/onboarding-actions";

const t = fr.commercialField.start.ready;

const CONFETTI = [
  [8, 12, "bg-primary", 20],
  [22, 34, "bg-[#f5b301]", -30],
  [78, 10, "bg-success", 45],
  [88, 38, "bg-primary", -15],
  [14, 70, "bg-success", 60],
  [72, 76, "bg-[#f5b301]", 10],
  [50, 6, "bg-danger", -40],
  [40, 52, "bg-primary", 70],
] as const;

/**
 * Badge « Prêt pour le terrain » obtenu (ADR 0394) : l'écran s'affiche une fois, puis on part
 * préparer la première tournée (ou plus tard). Confettis fixes, sans animation qui distrait.
 */
export function ReadyCelebration({
  firstName,
  score,
  code,
}: {
  firstName: string | null;
  score: number;
  code: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const leave = (to: Route | null) =>
    startTransition(async () => {
      await markBadgeSeen();
      if (to) router.push(to);
      else router.refresh();
    });
  return (
    <section
      aria-labelledby="pret-terrain"
      className="relative flex flex-col items-center gap-4 overflow-hidden rounded-card border border-border bg-surface px-5 py-8 text-center shadow-card sm:px-10"
    >
      {CONFETTI.map(([left, top, color, rotate]) => (
        <span
          key={`${left}-${top}`}
          aria-hidden="true"
          className={`absolute h-3 w-1.5 rounded-[2px] opacity-80 ${color}`}
          style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${rotate}deg)` }}
        />
      ))}
      <span className="flex size-28 items-center justify-center rounded-full bg-success-soft text-success shadow-[0_0_0_12px_rgb(23_120_78/0.08)]">
        <BadgeCheck aria-hidden="true" className="size-14" strokeWidth={1.6} />
      </span>
      <h2 id="pret-terrain" className="text-[1.75rem] leading-tight font-semibold tracking-tight">
        {t.title(firstName)}
      </h2>
      <p className="max-w-lg text-[0.9375rem] text-label">{t.text(score, code)}</p>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => leave("/commercial/tournee" as Route)}
        >
          <MapIcon aria-hidden="true" className="size-4" />
          {t.cta}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => leave(null)}>
          {t.later}
        </Button>
      </div>
    </section>
  );
}
