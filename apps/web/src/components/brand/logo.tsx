import { useId } from "react";

/**
 * Logo MENAO redessiné en SVG d'après les maquettes : un toit (chevron) au-dessus d'un sourire,
 * en dégradé bleu, suivi du mot « menao ».
 */
export function LogoMark({
  className = "size-7",
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "white";
}) {
  const id = useId();
  const stroke = tone === "white" ? "#ffffff" : `url(#${id})`;
  return (
    <svg viewBox="0 0 32 28" fill="none" aria-hidden="true" className={className}>
      {tone === "brand" && (
        <defs>
          <linearGradient id={id} x1="16" y1="2" x2="16" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#86a0fb" />
            <stop offset="1" stopColor="#4869f6" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M9.5 10.5 16 5.5l6.5 5"
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5c5.8 7.2 16.2 7.2 22 0"
        stroke={stroke}
        strokeWidth="4.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  tone = "brand",
  className = "",
}: {
  tone?: "brand" | "white";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark tone={tone} />
      <span
        className={`text-[1.5rem] leading-none font-semibold tracking-[-0.03em] ${
          tone === "white" ? "text-white" : "text-foreground"
        }`}
      >
        menao
      </span>
    </span>
  );
}
