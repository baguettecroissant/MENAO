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
      className={`flex flex-col gap-3 ${align === "center" ? "mx-auto max-w-2xl items-center text-center" : "max-w-xl"}`}
    >
      <p
        className={`text-xs font-semibold tracking-[0.14em] uppercase ${inverse ? "text-white/70" : "text-primary-strong"}`}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className="text-[1.75rem] leading-[1.15] font-medium tracking-tight text-balance sm:text-[2.25rem]"
      >
        {frenchSpacing(title)}
      </h2>
      {subtitle && (
        <p
          className={`text-base text-pretty ${inverse ? "text-white/80" : "text-muted-foreground"}`}
        >
          {frenchSpacing(subtitle)}
        </p>
      )}
    </div>
  );
}
