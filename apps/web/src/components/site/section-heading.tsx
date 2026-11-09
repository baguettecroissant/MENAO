import { frenchSpacing } from "@/lib/site/typography";

/** Titre de section du site : surtitre, titre et chapeau. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "default",
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";
  return (
    <div
      className={`reveal flex flex-col gap-3 ${align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-xl"}`}
    >
      <p
        className={`text-[0.8125rem] font-bold tracking-[0.08em] uppercase ${inverse ? "text-white/70" : "text-primary-strong"}`}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className="text-[2rem] leading-[1.06] font-bold tracking-tight text-balance sm:text-[2.75rem]"
      >
        {frenchSpacing(title)}
      </h2>
      {subtitle && (
        <p
          className={`text-base text-pretty sm:text-lg ${inverse ? "text-white/80" : "text-label"}`}
        >
          {frenchSpacing(subtitle)}
        </p>
      )}
    </div>
  );
}
