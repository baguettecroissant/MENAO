/**
 * Bandeau des chiffres clés d'un onglet de la rubrique « Argent » (refonte « Nette », ADR 0247) :
 * deux ou trois chiffres en grand, côte à côte en grand écran, empilés sur téléphone. Les
 * valeurs viennent des calculs de @menao/core (quoteFigures, invoiceFigures…).
 */
export function MoneyFigures({
  label,
  cells,
}: {
  label: string;
  cells: readonly { label: string; value: string; hint?: string }[];
}) {
  return (
    <section
      aria-label={label}
      className={`grid overflow-hidden rounded-card border border-border bg-surface shadow-card ${
        cells.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      }`}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={`flex flex-col gap-1.5 px-5 py-4 sm:px-6 sm:py-5 ${
            i > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""
          }`}
        >
          <span className="text-sm font-semibold text-label">{cell.label}</span>
          <span className="font-display text-[1.875rem] leading-none font-bold tracking-[-0.03em] tabular-nums sm:text-[2.25rem]">
            {cell.value}
          </span>
          {cell.hint && <span className="text-[0.8125rem] text-muted-foreground">{cell.hint}</span>}
        </div>
      ))}
    </section>
  );
}
