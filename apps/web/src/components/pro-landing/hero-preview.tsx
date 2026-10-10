import { BellRing, CircleCheck, Clock, Signature, Sparkles, Users } from "lucide-react";
import { fr } from "@/i18n/fr";

const t = fr.pro.landing.preview;

/**
 * Aperçu illustratif de l'application dans le bandeau (données fictives) : une demande qualifiée,
 * un devis signé, un acompte reçu. Une seule image pour les lecteurs d'écran ; cartes flottantes
 * immobiles si l'utilisateur limite les animations.
 */
export function HeroPreview() {
  return (
    <div role="img" aria-label={t.label} className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-white/10 blur-3xl" />
      <div aria-hidden="true" className="relative flex flex-col gap-4">
        <div className="animate-menao-float">
          <div className="-rotate-[1.5deg] rounded-card bg-surface p-5 text-foreground shadow-raised">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-strong">
              <BellRing className="size-3.5" />
              {t.request}
            </p>
            <p className="mt-3 text-[1.0625rem] font-medium">{t.requestTrade}</p>
            <p className="text-sm text-muted-foreground">{t.requestSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft px-2 py-1 text-xs font-medium text-primary-strong">
                <Sparkles className="size-3.5" />
                {t.requestQualified}
              </span>
              <span className="inline-flex items-center gap-1 rounded-chip bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" />
                {t.requestShared}
              </span>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {t.requestDeadline}
            </p>
          </div>
        </div>
        <div className="ml-6 animate-menao-float [animation-delay:-2s] sm:ml-10">
          <div className="rotate-[1deg] rounded-card bg-surface p-5 text-foreground shadow-raised">
            <div className="flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Signature className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  {t.quote}
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {t.quoteNumber}
                  </span>
                </span>
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-chip bg-success-soft px-2 py-1 text-xs font-medium whitespace-nowrap text-success">
                <CircleCheck className="size-3.5" />
                {t.quoteSigned}
              </span>
            </div>
            <p className="mt-3 text-2xl font-medium tracking-tight">{t.quoteAmount}</p>
          </div>
        </div>
        <div className="mr-2 -mt-1 flex animate-menao-float items-center gap-2 self-end rounded-pill bg-success px-4 py-2.5 text-sm whitespace-nowrap text-white shadow-raised [animation-delay:-4s] sm:mr-6">
          <CircleCheck className="size-4 shrink-0" />
          <span>
            <span className="font-semibold">{t.payment}</span> · {t.paymentAmount}
            <span className="hidden sm:inline"> {t.paymentWhere}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
