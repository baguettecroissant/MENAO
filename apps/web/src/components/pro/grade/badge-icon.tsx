import {
  BADGE_FACE,
  BADGE_RING,
  BADGE_SHINE,
  BADGE_STYLES,
  BADGE_VIEWBOX,
  badgeStyle,
} from "@menao/ui-tokens";
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
import { useId } from "react";

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
 * Badge MENAO (maquettes « Mon grade Menao », ADR 0096) : hexagone bleu à liseré argenté une fois
 * obtenu, liseré doré pour « Main d'or », gris tant qu'il est à obtenir. Dessin partagé avec
 * l'application (`@menao/ui-tokens`).
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
  const id = useId();
  const Icon = ICONS[code] ?? Award;
  const style = BADGE_STYLES[badgeStyle(code, unlocked)];
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${className}`}>
      <svg
        viewBox={`0 0 ${BADGE_VIEWBOX} ${BADGE_VIEWBOX}`}
        className={`absolute inset-0 size-full ${unlocked ? "drop-shadow-[0_2px_4px_rgb(52_81_209/0.25)]" : ""}`}
      >
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={style.ring[0]} />
            <stop offset="1" stopColor={style.ring[1]} />
          </linearGradient>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={style.face[0]} />
            <stop offset="1" stopColor={style.face[1]} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity={style.shine} />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={BADGE_RING}
          fill={`url(#${id}-ring)`}
          stroke={`url(#${id}-ring)`}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d={BADGE_FACE}
          fill={`url(#${id}-face)`}
          stroke={`url(#${id}-face)`}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d={BADGE_SHINE} fill={`url(#${id}-shine)`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <Icon className="size-[40%]" color={style.icon} fill={style.iconFill} strokeWidth={2.2} />
      </span>
    </span>
  );
}
