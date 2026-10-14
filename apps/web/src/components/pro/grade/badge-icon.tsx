import {
  AlarmClock,
  Award,
  Camera,
  Hand,
  Heart,
  HeartHandshake,
  type LucideIcon,
  PenLine,
  Sparkles,
  SprayCan,
} from "lucide-react";

/** Pictogramme de chaque badge du référentiel (comme l'application) ; sinon la médaille. */
const ICONS: Record<string, LucideIcon> = {
  artisan_exceptionnel: Heart,
  toujours_a_l_heure: AlarmClock,
  maitre_des_finitions: Sparkles,
  expert_de_la_photo: Camera,
  pro_du_nettoyage: SprayCan,
  artisan_applique: PenLine,
  artisan_attentionne: HeartHandshake,
  main_d_argent: Hand,
  main_d_or: Hand,
};

/**
 * Badge MENAO (maquettes « Mon grade Menao ») : hexagone bleu une fois obtenu, gris tant qu'il est
 * à obtenir ; « Main d'or » en doré.
 */
export function BadgeIcon({
  code,
  unlocked,
  className = "size-14",
}: {
  code: string;
  unlocked: boolean;
  className?: string;
}) {
  const Icon = ICONS[code] ?? Award;
  const gold = code === "main_d_or";
  const shape = unlocked
    ? gold
      ? "fill-warning stroke-warning"
      : "fill-primary stroke-primary-strong"
    : "fill-border stroke-border-strong";
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" strokeWidth="4" className={shape} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <Icon
          className={`size-[42%] ${unlocked ? "text-primary-foreground" : "text-muted-foreground"}`}
        />
      </span>
    </span>
  );
}
