import { LogoMark } from "@/components/brand/logo";

/** Photo de l'artisan en grand (cartes et fiche) ; à défaut, dégradé MENAO et initiales. */
export function ArtisanPhoto({
  url,
  name,
  className = "",
  initialsClassName = "text-4xl",
}: {
  url: string | null;
  name: string;
  className?: string;
  initialsClassName?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- images non optimisées par Vercel (spec §4.4)
    return <img src={url} alt="" className={`object-cover ${className}`} />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  // Dans un grand cadre (cartes, fiche) : initiales dans un médaillon blanc et toit du logo en
  // filigrane ; dans une pastille (messages, menus), les initiales seules.
  return (
    <div
      aria-hidden="true"
      className={`@container relative flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] ${className}`}
    >
      <LogoMark
        tone="white"
        className="absolute -right-[6%] -bottom-[14%] hidden w-1/2 opacity-30 @min-[8rem]:block"
      />
      <span
        className={`relative flex items-center justify-center font-medium tracking-tight text-primary-strong @min-[8rem]:size-24 @min-[8rem]:rounded-full @min-[8rem]:bg-white/80 @min-[8rem]:shadow-card @min-[8rem]:ring-8 @min-[8rem]:ring-white/30 ${initialsClassName}`}
      >
        {initials}
      </span>
    </div>
  );
}
