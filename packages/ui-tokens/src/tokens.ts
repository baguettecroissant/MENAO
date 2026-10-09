/**
 * Design tokens MENAO (spec §5).
 *
 * Valeurs PROVISOIRES : la maquette Figma n'est plus accessible. Elles respectent
 * les repères de la spec (bleu MENAO, fond crème, cartes blanches, vert / rouge /
 * orange sémantiques) et le contraste AA (vérifié par les tests).
 * Toute modification doit être reportée dans `theme.css` (les tests vérifient l'égalité).
 */
export const colors = {
  primary: "#1d4ed8",
  "primary-hover": "#1e40af",
  "primary-foreground": "#ffffff",
  "primary-soft": "#e8eefc",
  background: "#faf7f0",
  surface: "#ffffff",
  foreground: "#1a1d23",
  "muted-foreground": "#5b6170",
  border: "#e4e0d6",
  success: "#15803d",
  "success-soft": "#dcfce7",
  danger: "#b91c1c",
  "danger-soft": "#fee2e2",
  warning: "#b45309",
  "warning-soft": "#fef3c7",
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  button: "0.75rem",
  card: "1rem",
  chip: "9999px",
} as const;

export const fontFamily = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

/** Taille tactile minimale (spec §5 : 44 px). */
export const minTouchTarget = "2.75rem";

/** Paires texte / fond utilisées par l'interface : contraste AA (≥ 4,5:1) exigé. */
export const contrastPairs: ReadonlyArray<readonly [text: ColorToken, background: ColorToken]> = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["muted-foreground", "background"],
  ["muted-foreground", "surface"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-hover"],
  ["primary", "surface"],
  ["primary", "background"],
  ["primary", "primary-soft"],
  ["primary-foreground", "success"],
  ["primary-foreground", "danger"],
  ["primary-foreground", "warning"],
  ["success", "surface"],
  ["success", "success-soft"],
  ["danger", "surface"],
  ["danger", "danger-soft"],
  ["warning", "surface"],
  ["warning", "warning-soft"],
];
