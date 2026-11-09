import { fr } from "@/i18n/fr";

const t = fr.pro.landing.proofStrip;

/** Bande de preuves sous le bandeau de l'Espace Pro (ADR 0265) : engagements réels, aucun chiffre inventé. */
export function ProofStrip() {
  return (
    <section aria-label={t.label} className="relative z-10 -mt-6 px-4 sm:-mt-9 sm:px-6">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 overflow-hidden rounded-[1.375rem] border border-border bg-surface shadow-raised lg:grid-cols-4">
        {t.items.map((item, i) => (
          <li
            key={item.label}
            className={`flex flex-col gap-1 p-4 sm:px-6 sm:py-5 ${i % 2 === 1 ? "border-l border-border" : ""} ${i >= 2 ? "border-t border-border lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <span className="font-display text-[1.75rem] leading-none font-bold tracking-tight sm:text-[2.25rem]">
              {item.value}
            </span>
            <span className="text-xs font-semibold text-balance text-label sm:text-sm">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
