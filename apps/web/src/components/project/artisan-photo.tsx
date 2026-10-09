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
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-[linear-gradient(135deg,#dfe6fe_0%,#b9c7fc_55%,#8ea4fb_100%)] ${className}`}
    >
      <span className={`font-medium tracking-tight text-primary-strong ${initialsClassName}`}>
        {initials}
      </span>
    </div>
  );
}
