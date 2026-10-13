/**
 * Étapes numérotées reliées par un trait : en ligne sur grand écran, en colonne sur mobile.
 * Quatre étapes au plus sur une ligne ; « inverse » pour les bandeaux sombres.
 */
export function Steps({
  items,
  tone = "default",
}: {
  items: readonly { title: string; text: string }[];
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  const columns = items.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3";
  const inset = items.length >= 4 ? "right-[12.5%] left-[12.5%]" : "right-[16.66%] left-[16.66%]";
  const line = inverse ? "bg-white/20" : "bg-border-strong";
  // Le trait se remplit au fil du défilement (sans prise en charge : il reste plein).
  const fill = inverse ? "bg-white" : "bg-primary";
  return (
    <ol className={`relative grid gap-8 md:gap-6 ${columns}`}>
      <span aria-hidden="true" className={`absolute top-6 hidden h-px md:block ${inset} ${line}`}>
        <span className={`fill-x-on-scroll block h-full origin-left ${fill}`} />
      </span>
      {items.map((step, i) => (
        <li
          key={step.title}
          className="reveal relative flex gap-4 md:flex-col md:items-center md:text-center"
          // Cascade : chaque étape apparaît un peu après la précédente.
          style={{ animationRange: `entry ${i * 6}% cover ${22 + i * 6}%` }}
        >
          {i < items.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute top-12 -bottom-8 left-6 w-px md:hidden ${line}`}
            >
              <span className={`fill-y-on-scroll block h-full origin-top ${fill}`} />
            </span>
          )}
          <span
            className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-medium shadow-raised ${
              inverse ? "bg-white text-primary-strong" : "bg-primary text-primary-foreground"
            }`}
          >
            {i + 1}
          </span>
          <div className="flex flex-col gap-2">
            <h3 className="text-[1.0625rem] font-medium text-balance">{step.title}</h3>
            <p
              className={`text-sm leading-relaxed text-pretty ${inverse ? "text-white/75" : "text-muted-foreground"}`}
            >
              {step.text}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
