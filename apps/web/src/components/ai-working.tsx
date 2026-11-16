import { FileText, Sparkles } from "lucide-react";

/**
 * Attente d'une lecture ou d'un calcul par l'IA (lot 61) : une feuille balayée par un trait de
 * lecture, le message, trois points qui clignotent. Discret, et immobile si l'utilisateur a
 * demandé moins d'animations.
 */
export function AiWorking({
  label,
  kind = "document",
}: {
  label: string;
  kind?: "document" | "calcul";
}) {
  const Icon = kind === "document" ? FileText : Sparkles;
  return (
    <p
      role="status"
      className="flex items-center gap-3 rounded-input border border-primary/20 bg-primary-softer px-3.5 py-3 text-sm font-medium text-primary-strong"
    >
      <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-input bg-surface">
        <Icon aria-hidden="true" className="size-5 motion-safe:animate-menao-pulse" />
        {kind === "document" && (
          <span
            aria-hidden="true"
            style={{ ["--scan" as string]: "30px" }}
            className="animate-menao-scan absolute inset-x-1 top-0.5 h-0.5 rounded-full bg-primary motion-reduce:hidden"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <span aria-hidden="true" className="flex shrink-0 gap-1 motion-reduce:hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-menao-blink rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
    </p>
  );
}
