import { ArrowRight, Clock } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.launch;

/**
 * Demandes de devis fermées jusqu'au lancement (F-188, ADR 0387) : à la place de la saisie, de la
 * demande préparée et du widget des partenaires.
 */
export function RequestsSoon({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby="demandes-bientot"
      className={`mx-auto flex w-full max-w-2xl flex-col items-center gap-4 text-center ${
        compact ? "py-6" : "px-4 py-16 sm:py-24"
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
        <Clock aria-hidden="true" className="size-6" />
      </span>
      <h1
        id="demandes-bientot"
        className={compact ? "text-xl font-bold" : "text-[2rem] leading-tight sm:text-[2.5rem]"}
      >
        {t.requestsTitle}
      </h1>
      <p className="max-w-xl text-label">{t.requestsText}</p>
      <ButtonLink href="/pro" size={compact ? "md" : "lg"} variant="dark">
        {t.requestsArtisan}
        <ArrowRight aria-hidden="true" className="size-4" />
      </ButtonLink>
    </section>
  );
}

/** Étapes de paiement de l'inscription fermées jusqu'au lancement (ADR 0387). */
export function PaymentsSoonCard() {
  return (
    <Card className="flex gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
        <Clock aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{t.paymentsTitle}</h2>
        <p className="text-sm text-label">{t.paymentsText}</p>
      </div>
    </Card>
  );
}
