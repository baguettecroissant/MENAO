import {
  Axe,
  BrickWall,
  Building2,
  Droplet,
  Flame,
  Grid2x2,
  Hammer,
  House,
  KeyRound,
  Paintbrush,
  Ruler,
  Snowflake,
  Tractor,
  Trees,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icône et dégradé de remplacement par métier (en attendant les photos des maquettes). */
export const TRADE_VISUALS: Record<string, { icon: LucideIcon; gradient: string }> = {
  electricien: { icon: Zap, gradient: "from-[#2b3a8f] via-[#4869f6] to-[#8aa2fb]" },
  plombier: { icon: Droplet, gradient: "from-[#123a6b] via-[#1f6fd1] to-[#6fb3f5]" },
  chauffagiste: { icon: Flame, gradient: "from-[#5b2a1a] via-[#c4532f] to-[#f2a36b]" },
  climaticien: { icon: Snowflake, gradient: "from-[#173b5c] via-[#2b86b9] to-[#9fd4ee]" },
  macon: { icon: BrickWall, gradient: "from-[#4a3226] via-[#9a6a4f] to-[#d9b79a]" },
  peintre: { icon: Paintbrush, gradient: "from-[#3b2a6b] via-[#7a5bd6] to-[#c4b3f7]" },
  plaquiste: { icon: Ruler, gradient: "from-[#3a3f4b] via-[#7b8496] to-[#cfd5df]" },
  carreleur: { icon: Grid2x2, gradient: "from-[#1d4a4a] via-[#2f8f8a] to-[#9ad7cf]" },
  menuisier: { icon: Hammer, gradient: "from-[#4b2e1c] via-[#a66a3f] to-[#e5bb8f]" },
  charpentier: { icon: Axe, gradient: "from-[#3d2b1f] via-[#8a5a35] to-[#d2a679]" },
  couvreur: { icon: House, gradient: "from-[#3b1f2b] via-[#a3405c] to-[#e8a2b5]" },
  facadier: { icon: Building2, gradient: "from-[#2c3346] via-[#5f6f96] to-[#b9c4de]" },
  serrurier: { icon: KeyRound, gradient: "from-[#3a3418] via-[#9c8a2e] to-[#e2d48c]" },
  terrassier: { icon: Tractor, gradient: "from-[#3d3115] via-[#a37b23] to-[#e8c56e]" },
  paysagiste: { icon: Trees, gradient: "from-[#173d27] via-[#2f8a52] to-[#9ad5a8]" },
};

export const DEFAULT_TRADE_VISUAL = TRADE_VISUALS.electricien!;
