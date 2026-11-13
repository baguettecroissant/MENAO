import type { PaymentTranche, PaymentTrigger } from "@menao/core";

/**
 * Pièces de l'échéancier de paiement (F-146, maquette lot 40), communes à « Mes paiements », à
 * l'envoi du devis et aux pages du client : couleur de chaque moment de paiement, barre
 * segmentée, lignes de montants et ligne réglable d'une tranche. Calculs dans @menao/core.
 */

/** Couleur de chaque moment : acompte (bleu), démarrage (violet), réception (encre). */
export const TRANCHE_COLORS: Record<PaymentTrigger, string> = {
  signature: "bg-primary",
  demarrage: "bg-violet",
  reception: "bg-foreground",
};

export function TrancheDot({
  trigger,
  size = "size-2.5",
}: {
  trigger: PaymentTrigger;
  size?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${size} ${TRANCHE_COLORS[trigger]}`}
    />
  );
}

/** Barre segmentée : une part par tranche, proportionnelle à son pourcentage. */
export function ScheduleBar({
  tranches,
  height = "h-3.5",
}: {
  tranches: readonly Pick<PaymentTranche, "percent" | "trigger">[];
  height?: string;
}) {
  return (
    <div aria-hidden="true" className={`flex gap-[3px] overflow-hidden rounded-pill ${height}`}>
      {tranches
        .filter((tranche) => tranche.percent > 0)
        .map((tranche) => (
          <span
            key={tranche.trigger}
            style={{ flexGrow: tranche.percent }}
            className={`h-full basis-0 transition-[flex-grow] duration-300 ${TRANCHE_COLORS[tranche.trigger]}`}
          />
        ))}
    </div>
  );
}

/** Lignes « pastille, libellé, montant » sous une barre (exemple chiffré, récapitulatif). */
export function ScheduleLines({
  lines,
  divided = false,
}: {
  lines: readonly { trigger: PaymentTrigger; label: string; amount: string }[];
  divided?: boolean;
}) {
  return (
    <dl className={`flex flex-col ${divided ? "" : "gap-2"}`}>
      {lines.map((line) => (
        <div
          key={line.trigger}
          className={`flex items-center justify-between gap-3 text-sm ${divided ? "border-t border-border py-2.5" : ""}`}
        >
          <dt className="inline-flex items-center gap-2 text-label">
            <TrancheDot trigger={line.trigger} size="size-2.5" />
            {line.label}
          </dt>
          <dd className="font-bold tabular-nums">{line.amount}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Ligne d'une tranche : pastille, titre et explication, pourcentage (champ, ou valeur calculée
 * pour le solde) et montant facultatif.
 */
export function TrancheRow({
  trigger,
  title,
  hint,
  percent,
  amount,
  input,
}: {
  trigger: PaymentTrigger;
  title: string;
  hint: string;
  percent: number;
  amount?: string;
  /** Champ du pourcentage ; sans champ, la part est calculée (solde). */
  input?: {
    id: string;
    name: string;
    value: string;
    label: string;
    onChange: (value: string) => void;
    invalid?: boolean;
  };
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-3.5 sm:gap-3.5">
      <TrancheDot trigger={trigger} size="size-3" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.9375rem] font-bold">{title}</span>
        <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
      </span>
      {input ? (
        <span className="relative shrink-0">
          <input
            id={input.id}
            name={input.name}
            inputMode="numeric"
            maxLength={2}
            value={input.value}
            onChange={(event) => input.onChange(event.target.value.replace(/\D/g, ""))}
            aria-label={input.label}
            aria-invalid={input.invalid ? true : undefined}
            className="h-11 w-[5.75rem] rounded-input border border-border-strong bg-surface pr-8 pl-3 text-right text-base font-bold tabular-nums outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 aria-invalid:border-danger"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground"
          >
            %
          </span>
        </span>
      ) : (
        <span className="flex h-11 w-[5.75rem] shrink-0 items-center justify-end rounded-input bg-background px-3 text-base font-bold text-label tabular-nums">
          {percent} %
        </span>
      )}
      {amount !== undefined && (
        <span className="hidden w-28 shrink-0 text-right text-[0.9375rem] font-bold tabular-nums sm:block">
          {amount}
        </span>
      )}
    </div>
  );
}

/** Pourcentage saisi : entier, sinon 0 (champ vide). */
export const percentOf = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : 0;
};
