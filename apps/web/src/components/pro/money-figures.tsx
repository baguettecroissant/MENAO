/**
 * Bandeau des chiffres clés en tête d'une liste (refonte « Nette ») : onglets de la rubrique
 * « Argent » (ADR 0247), listes « Demandes » et « Chantiers » (ADR 0248). Les valeurs viennent
 * des calculs de @menao/core (quoteFigures, requestFigures, chantierFigures…).
 *
 * Par défaut, les chiffres sont côte à côte en grand écran et empilés sur téléphone. `dense` :
 * trois chiffres serrés sur une ligne sur téléphone (valeur puis intitulé court, sans détail) ;
 * une case `desktopOnly` n'apparaît qu'en grand écran, une case `phoneOnly` que sur téléphone.
 */
export type FigureCell = {
  label: string;
  value: string;
  hint?: string;
  /** Intitulé court sous la valeur, sur téléphone (`dense`). */
  short?: string;
  tone?: "danger";
  desktopOnly?: boolean;
  phoneOnly?: boolean;
};

const COLUMNS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const;

export function MoneyFigures({
  label,
  cells,
  dense = false,
}: {
  label: string;
  cells: readonly FigureCell[];
  dense?: boolean;
}) {
  const wide = cells.filter((cell) => !cell.phoneOnly).length;
  const columns = COLUMNS[Math.min(4, Math.max(2, wide)) as 2 | 3 | 4];
  return (
    <section
      aria-label={label}
      className={`grid overflow-hidden rounded-card border border-border bg-surface shadow-card ${columns} ${
        dense ? "grid-cols-3" : ""
      }`}
    >
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={`flex flex-col gap-1.5 ${
            dense
              ? `px-3 py-3.5 sm:px-6 sm:py-5 ${i > 0 ? "border-l border-border" : ""}`
              : `px-5 py-4 sm:px-6 sm:py-5 ${i > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`
          } ${cell.desktopOnly ? "max-sm:hidden" : ""} ${cell.phoneOnly ? "sm:hidden" : ""}`}
        >
          <span
            className={`text-sm font-semibold text-label ${dense && cell.short ? "max-sm:hidden" : ""}`}
          >
            {cell.label}
          </span>
          <span
            className={`font-display leading-none font-bold tracking-[-0.03em] tabular-nums ${
              dense ? "text-[1.625rem] sm:text-[2.25rem]" : "text-[1.875rem] sm:text-[2.25rem]"
            } ${cell.tone === "danger" ? "text-danger" : ""}`}
          >
            {cell.value}
          </span>
          {dense && cell.short && (
            <span className="text-xs leading-snug font-semibold text-label sm:hidden">
              {cell.short}
            </span>
          )}
          {cell.hint && (
            <span
              className={`text-[0.8125rem] text-muted-foreground ${dense ? "max-sm:hidden" : ""}`}
            >
              {cell.hint}
            </span>
          )}
        </div>
      ))}
    </section>
  );
}
