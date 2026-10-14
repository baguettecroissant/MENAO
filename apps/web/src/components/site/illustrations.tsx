/**
 * Illustrations maison aux couleurs MENAO (trait bleu, aplats bleu clair), en SVG : page
 * introuvable et erreur. Le toit reprend le chevron du logo. Décoratives (aria-hidden).
 */
export function LostIllustration({ className = "w-64" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20 192h280"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        className="stroke-border-strong"
      />
      {/* Maison, toit du logo. */}
      <rect
        x="62"
        y="96"
        width="112"
        height="96"
        rx="14"
        strokeWidth="4"
        className="fill-primary-soft stroke-primary"
      />
      <path
        d="M50 104 118 52l68 52"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
      />
      <rect
        x="104"
        y="140"
        width="28"
        height="52"
        rx="8"
        strokeWidth="4"
        className="fill-surface stroke-primary"
      />
      <rect
        x="78"
        y="114"
        width="20"
        height="18"
        rx="4"
        strokeWidth="3"
        className="fill-surface stroke-primary"
      />
      <rect
        x="140"
        y="114"
        width="20"
        height="18"
        rx="4"
        strokeWidth="3"
        className="fill-surface stroke-primary"
      />
      {/* Loupe et point d'interrogation. */}
      <circle
        cx="226"
        cy="104"
        r="40"
        strokeWidth="6"
        className="fill-surface stroke-primary-strong"
      />
      <path
        d="m255 133 32 32"
        strokeWidth="12"
        strokeLinecap="round"
        className="stroke-primary-strong"
      />
      <path
        d="M213 93a13 13 0 1 1 19 11.5c-4 2.2-6 5-6 9.5"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <circle cx="226" cy="128" r="4" className="fill-primary" />
      {/* Étincelles. */}
      <path
        d="M268 40v14M261 47h14"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <path
        d="M36 62v10M31 67h10"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-border-strong"
      />
    </svg>
  );
}

export function ErrorIllustration({ className = "w-64" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20 192h280"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        className="stroke-border-strong"
      />
      {/* Panneau de chantier. */}
      <path
        d="M160 36 252 180H68L160 36Z"
        strokeWidth="5"
        strokeLinejoin="round"
        className="fill-primary-soft stroke-primary"
      />
      <path
        d="M160 86v46"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-primary-strong"
      />
      <circle cx="160" cy="154" r="6" className="fill-primary-strong" />
      {/* Clé et cône. */}
      <path
        d="m252 116 26-26m-8-10 18 18"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <path
        d="M40 192 54 140h12l14 52"
        strokeWidth="4"
        strokeLinejoin="round"
        className="fill-surface stroke-primary"
      />
      <path d="M48 166h24" strokeWidth="4" strokeLinecap="round" className="stroke-primary" />
      <path
        d="M268 40v14M261 47h14"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-primary"
      />
    </svg>
  );
}
