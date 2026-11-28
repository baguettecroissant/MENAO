"use client";

import { Euro, UserPlus, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { markCelebrated } from "@/lib/commercial/alert-actions";

const t = fr.commercialField.moments.celebration;
const euros = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const CONFETTI = [
  [10, 8, "bg-primary", 20],
  [22, 22, "bg-[#f5b301]", -30],
  [80, 10, "bg-success", 45],
  [88, 26, "bg-primary", -15],
  [14, 40, "bg-success", 60],
  [76, 42, "bg-[#f5b301]", 10],
  [50, 4, "bg-danger", -40],
  [36, 30, "bg-primary", 70],
] as const;

export type Celebration = {
  id: string;
  kind: "validation" | "abonnement";
  entreprise: string | null;
  montant_centimes: number | null;
  mois_centimes: number;
  valides_semaine: number;
};

/**
 * Prime gagnée (F-196, ADR 0396) : grande célébration à l'ouverture, une fois par prime, puis
 * « Voir mes gains » ou « Inscrire le suivant ».
 */
export function BonusCelebration({ celebration }: { celebration: Celebration }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  const name = celebration.entreprise ?? "";
  const validation = celebration.kind === "validation";

  const leave = (to: Route | null) =>
    startTransition(async () => {
      await markCelebrated(celebration.id);
      dialog.current?.close();
      if (to) router.push(to);
      else router.refresh();
    });

  return (
    <dialog
      ref={dialog}
      aria-labelledby="prime-titre"
      onCancel={(e) => {
        e.preventDefault();
        leave(null);
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-card border-0 bg-surface p-0 text-foreground shadow-raised backdrop:bg-[#0b1230]/55"
    >
      <div className="relative flex flex-col items-center gap-4 px-5 pt-6 pb-5 text-center">
        <button
          type="button"
          aria-label={t.close}
          onClick={() => leave(null)}
          className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-background"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        {CONFETTI.map(([left, top, color, rotate]) => (
          <span
            key={`${left}-${top}`}
            aria-hidden="true"
            className={`absolute h-3 w-1.5 rounded-[2px] opacity-80 ${color}`}
            style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${rotate}deg)` }}
          />
        ))}
        <span className="mt-3 flex size-36 flex-col items-center justify-center rounded-full bg-success-soft text-success shadow-[0_0_0_14px_rgb(23_120_78/0.08)]">
          <span className="text-[2.5rem] leading-none font-bold tracking-tight">
            {celebration.montant_centimes !== null
              ? `+${euros(celebration.montant_centimes)}`
              : "🎉"}
          </span>
          <span className="mt-1 text-xs font-bold">
            {validation ? t.kindValidation : t.kindAbonnement}
          </span>
        </span>
        <h2 id="prime-titre" className="text-[1.625rem] leading-tight font-semibold tracking-tight">
          {validation ? t.validation(name) : t.abonnement(name)}
        </h2>
        <p className="text-[0.9375rem] text-label">
          {validation ? t.textValidation : t.textAbonnement}
        </p>
        <dl className="w-full overflow-hidden rounded-card border border-border text-left text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <dt className="text-label">{t.month}</dt>
            <dd className="font-semibold">{euros(celebration.mois_centimes)}</dd>
          </div>
          <div className="flex justify-between border-t border-border px-4 py-2.5">
            <dt className="text-label">{t.week}</dt>
            <dd className="font-semibold">{celebration.valides_semaine}</dd>
          </div>
          {validation && (
            <div className="flex justify-between border-t border-border px-4 py-2.5">
              <dt className="text-label">{t.toCome}</dt>
              <dd className="font-semibold">{t.toComeValue}</dd>
            </div>
          )}
        </dl>
        <div className="flex w-full flex-col gap-2">
          <Button
            type="button"
            size="lg"
            disabled={pending}
            onClick={() => leave("/commercial/resultats" as Route)}
          >
            <Euro aria-hidden="true" className="size-4" />
            {t.gains}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => leave("/commercial/inscrire" as Route)}
          >
            <UserPlus aria-hidden="true" className="size-4" />
            {t.next}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
