import type { TestFillRow } from "@menao/core";
import { FlaskConical, Zap } from "lucide-react";
import { focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { clearTestAttestations, fillTestRow, fillTestUntil } from "@/lib/artisan/test-actions";

const t = fr.pro.onboarding.dossier.essai;

/**
 * Compte d'essai (lot 82, ADR 0392) : bandeau violet de « Mon inscription » avec « Tout remplir »
 * jusqu'à l'étape choisie. Rendu seulement pour un compte d'essai ; la base refuse les autres.
 */
export function TestBanner({ rows }: { rows: { key: TestFillRow; label: string }[] }) {
  const last = rows.at(-1);
  return (
    <section
      aria-label={t.title}
      className="flex flex-col gap-3 rounded-card bg-violet-soft p-4 text-violet sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[0.625rem] bg-violet text-white">
          <FlaskConical aria-hidden="true" className="size-4" />
        </span>
        <span className="flex flex-col gap-0.5">
          <b className="text-[0.9375rem]">{t.title}</b>
          <span className="text-sm">{t.text}</span>
        </span>
      </div>
      {last && (
        <form action={fillTestUntil} className="flex flex-wrap items-center gap-2.5">
          <label className="flex min-h-10 items-center gap-2 rounded-input border border-border-strong bg-surface px-3 text-sm whitespace-nowrap text-foreground">
            <span>{t.until}</span>
            <select
              name="row"
              defaultValue={last.key}
              className="bg-transparent font-semibold text-violet focus:outline-none"
            >
              {rows.map((row) => (
                <option key={row.key} value={row.key}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={`inline-flex min-h-10 items-center gap-2 rounded-pill bg-foreground px-4 text-sm font-semibold text-surface hover:bg-foreground/90 ${focusRing}`}
          >
            <Zap aria-hidden="true" className="size-4" />
            {t.fillAll}
          </button>
        </form>
      )}
    </section>
  );
}

/** « Remplir » à droite d'une ligne du parcours. */
export function FillRowButton({ row, label }: { row: TestFillRow; label: string }) {
  return (
    <form action={fillTestRow} className="shrink-0">
      <input type="hidden" name="row" value={row} />
      <button
        type="submit"
        aria-label={t.fillLabel(label)}
        className={`inline-flex min-h-touch items-center gap-1.5 rounded-input px-2 text-sm font-semibold text-violet hover:bg-violet-soft ${focusRing}`}
      >
        <FlaskConical aria-hidden="true" className="size-3.5" />
        {t.fill}
      </button>
    </form>
  );
}

/** Étape des attestations d'un compte d'essai : remplir, ou vider les documents d'exemple. */
export function TestAttestationsBanner({ filled }: { filled: boolean }) {
  return (
    <section
      aria-label={t.title}
      className="flex flex-col gap-2.5 rounded-card bg-violet-soft p-4 text-violet"
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <FlaskConical aria-hidden="true" className="size-4" />
        {t.title}
      </span>
      <span className="text-sm">{filled ? t.attestationsFilled : t.attestationsTodo}</span>
      {filled ? (
        <form action={clearTestAttestations}>
          <button
            type="submit"
            className={`rounded-sm text-sm font-semibold underline-offset-2 hover:underline ${focusRing}`}
          >
            {t.clear}
          </button>
        </form>
      ) : (
        <form action={fillTestRow}>
          <input type="hidden" name="row" value="attestations" />
          <button
            type="submit"
            className={`inline-flex min-h-10 items-center gap-2 rounded-pill bg-violet px-4 text-sm font-semibold text-white ${focusRing}`}
          >
            <FlaskConical aria-hidden="true" className="size-4" />
            {t.fillStep}
          </button>
        </form>
      )}
    </section>
  );
}
