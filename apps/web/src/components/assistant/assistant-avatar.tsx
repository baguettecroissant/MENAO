import { useId } from "react";

/**
 * Avatar de l'assistant écrit de MENAO (ADR 0272) : une petite maison souriante en relief, tirée
 * du logo (le toit et le sourire). Dessin vectoriel décoratif ; le nom de l'assistant est porté
 * par le texte voisin. `blink` : clignement discret des yeux (aucun si les animations sont réduites).
 */
export function AssistantAvatar({
  className = "size-10",
  blink = false,
}: {
  className?: string;
  blink?: boolean;
}) {
  const id = useId();
  const g = (name: string) => `${id}-${name}`;
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={`rounded-full ${className}`}>
      <defs>
        <linearGradient
          id={g("fond")}
          x1="32"
          y1="0"
          x2="32"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e9eefe" />
          <stop offset="1" stopColor="#cfd9fc" />
        </linearGradient>
        <linearGradient
          id={g("toit")}
          x1="32"
          y1="12"
          x2="32"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6f8cfb" />
          <stop offset="1" stopColor="#3a57e0" />
        </linearGradient>
        <linearGradient
          id={g("mur")}
          x1="32"
          y1="20"
          x2="32"
          y2="53"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffefb" />
          <stop offset="1" stopColor="#ebe5d6" />
        </linearGradient>
        <linearGradient
          id={g("cheminee")}
          x1="44"
          y1="12"
          x2="44"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a9bbfd" />
          <stop offset="1" stopColor="#7f98fa" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill={`url(#${g("fond")})`} />
      <g transform="translate(32 35.5) scale(1.18) translate(-32 -35.5)">
        {/* Ombre portée. */}
        <ellipse cx="32" cy="54.3" rx="15.5" ry="2.4" fill="#4869f6" fillOpacity="0.16" />
        <ellipse cx="32" cy="54.1" rx="11.5" ry="1.7" fill="#4869f6" fillOpacity="0.16" />
        <rect x="40.2" y="12.6" width="7.2" height="13" rx="2.6" fill={`url(#${g("cheminee")})`} />
        {/* Mur, puis son ombre basse pour le relief. */}
        <path
          d="M17.5 33.5 32 20.5l14.5 13V46a6.5 6.5 0 0 1-6.5 6.5H24a6.5 6.5 0 0 1-6.5-6.5Z"
          fill={`url(#${g("mur")})`}
        />
        <path
          d="M17.5 46a6.5 6.5 0 0 0 6.5 6.5h16a6.5 6.5 0 0 0 6.5-6.5v-2.5c-2 4-6 5.6-14.5 5.6S19.5 47.5 17.5 43.5Z"
          fill="#d9d1bd"
          fillOpacity="0.45"
        />
        {/* Toit du logo, avec son reflet. */}
        <path
          d="M12.8 32.6 32 15.6l19.2 17"
          stroke={`url(#${g("toit")})`}
          strokeWidth="8.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.6 29.3 31.2 14.6"
          stroke="#b9c8fe"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />
        <g className={blink ? "animate-menao-blink" : undefined}>
          <circle cx="25.6" cy="37.8" r="3.5" fill="#111728" />
          <circle cx="38.4" cy="37.8" r="3.5" fill="#111728" />
          <circle cx="26.7" cy="36.7" r="1.05" fill="#ffffff" />
          <circle cx="39.5" cy="36.7" r="1.05" fill="#ffffff" />
        </g>
        {/* Sourire du logo. */}
        <path
          d="M26.2 43.6c3.4 3.7 8.2 3.7 11.6 0"
          stroke="#111728"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
