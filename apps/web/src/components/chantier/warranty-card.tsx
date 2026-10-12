import { parisToday, warranties } from "@menao/core";
import { ShieldCheck } from "lucide-react";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";

const t = fr.warranties;

/**
 * Garanties légales après la réception (Code civil, art. 1792 et suivants ; ADR 0041) : échéances
 * calculées depuis la date de réception, assureur décennal repris du devis.
 * TODO(legal) : formulation et exemples à faire valider (garanties applicables selon les travaux).
 */
export function WarrantyCard({
  receivedOn,
  insurer,
}: {
  /** Date de réception (AAAA-MM-JJ, heure de Paris). */
  receivedOn: string;
  insurer: { name: string; policy: string | null } | null;
}) {
  const items = warranties(receivedOn, parisToday());
  return (
    <section
      aria-labelledby="garanties"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <h2 id="garanties" className="text-[1.0625rem] font-medium">
        {t.title}
      </h2>
      <p className="text-sm text-muted-foreground">{t.intro(formatDay(receivedOn))}</p>
      <ul className="flex flex-col gap-3">
        {items.map((w) => (
          <li key={w.kind} className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className={`mt-0.5 size-4 shrink-0 ${w.active ? "text-success" : "text-subtle-foreground"}`}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm">
                <span className="font-medium">{t.kinds[w.kind].label}</span>
                {" : "}
                {w.active ? t.until(formatDay(w.until)) : t.ended(formatDay(w.until))}
              </p>
              <p className="text-xs text-muted-foreground">{t.kinds[w.kind].what}</p>
            </div>
          </li>
        ))}
      </ul>
      {insurer && (
        <p className="text-xs text-muted-foreground">{t.insurer(insurer.name, insurer.policy)}</p>
      )}
      <p className="text-xs text-muted-foreground">{t.advice}</p>
    </section>
  );
}
