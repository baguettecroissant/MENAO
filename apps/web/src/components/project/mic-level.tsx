/** Seuils d'allumage des cinq barres (niveau de 0 à 1 sur 60 dB). */
const BARS = [0.15, 0.3, 0.45, 0.6, 0.75];

/** Niveau du micro : cinq barres qui s'allument avec la voix (indication visuelle seulement). */
export function MicLevel({ level, className = "" }: { level: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-4 items-end gap-0.5 ${className}`}>
      {BARS.map((threshold, i) => (
        <span
          key={threshold}
          className={`w-1 rounded-full transition-colors duration-100 ${level > threshold ? "bg-primary" : "bg-border-strong"}`}
          style={{ height: `${(i + 1) * 20}%` }}
        />
      ))}
    </span>
  );
}
