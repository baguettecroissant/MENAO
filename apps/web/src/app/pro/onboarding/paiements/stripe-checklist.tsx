import { STRIPE_CHECKLIST } from "@menao/core";
import { Calendar, IdCard, Landmark, Smartphone } from "lucide-react";
import { sheetCard } from "@/components/pro/sheet";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.help.stripe;
const icons = [IdCard, Landmark, Smartphone, Calendar] as const;

/** « Avant Stripe » (lot 60, ADR 0347) : ce que le formulaire demande, avant de l'ouvrir. */
export function StripeChecklist() {
  return (
    <section aria-labelledby="sous-la-main" className={sheetCard}>
      <div className="flex flex-col gap-1">
        <h2 id="sous-la-main" className="text-[1.0625rem]">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {STRIPE_CHECKLIST.map((item, index) => {
          const Icon = icons[index] ?? IdCard;
          return (
            <li key={item.title} className="flex items-center gap-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-background text-label">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.hint}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
