import { Wallet } from "lucide-react";
import { sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.connect;

/** « Comment vous êtes payé » (refonte « Nette », ADR 0254) : colonne de droite des paiements. */
export function PaymentHow() {
  return (
    <aside aria-labelledby="comment-paye" className={sheetCard}>
      <span className="flex size-10 items-center justify-center rounded-input bg-success-soft text-success">
        <Wallet aria-hidden="true" className="size-5" />
      </span>
      <h2 id="comment-paye" className="text-[1.0625rem]">
        {t.how.title}
      </h2>
      <ol className="flex flex-col divide-y divide-border">
        {t.how.steps.map((step, index) => (
          <li key={step} className="flex gap-3 py-2.5 text-sm leading-relaxed text-label">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
}
