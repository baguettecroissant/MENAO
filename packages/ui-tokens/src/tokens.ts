/**
 * Design tokens MENAO (spec §5), relevés sur les maquettes Figma (captures du 8 octobre 2026) :
 * bleu MENAO #4869F6, fond crème #F9F7F0, cartes blanches, police Inter.
 * Quelques teintes sont légèrement assombries pour respecter le contraste AA (vérifié par les
 * tests) : `primary-strong` sert aux petits textes bleus sur fond clair (puces, liens).
 * Toute modification doit être reportée dans `theme.css` (les tests vérifient l'égalité).
 */
export const colors = {
  primary: "#4869f6",
  "primary-hover": "#3b5be8",
  "primary-strong": "#3451d1",
  "primary-foreground": "#ffffff",
  "primary-soft": "#e4eafd",
  "primary-softer": "#f1f4fe",
  background: "#f9f7f0",
  surface: "#ffffff",
  input: "#fbfbfc",
  foreground: "#111728",
  "muted-foreground": "#636b78",
  "subtle-foreground": "#9aa1ad",
  border: "#e6e9ef",
  "border-strong": "#d5dae3",
  success: "#17784e",
  "success-soft": "#e8f4ee",
  danger: "#c0392b",
  "danger-soft": "#fbeaea",
  warning: "#b45309",
  "warning-soft": "#fef3c7",
  // Données d'exemple (ADR 0184) : orange, distinct des couleurs de l'application.
  example: "#c2410c",
  "example-soft": "#ffedd5",
  "example-strong": "#9a3412",
  // Paiement au démarrage des travaux (F-146, lot 40) : violet de l'échéancier.
  violet: "#7c3aed",
  "violet-soft": "#f3efff",
} as const;

export type ColorToken = keyof typeof colors;

export const radius = {
  button: "9999px",
  input: "0.75rem",
  card: "1rem",
  hero: "1.75rem",
  chip: "0.375rem",
  pill: "9999px",
} as const;

export const shadow = {
  card: "0 1px 2px rgb(17 23 40 / 0.04), 0 1px 3px rgb(17 23 40 / 0.04)",
  raised: "0 8px 24px rgb(17 23 40 / 0.08)",
  focus: "0 0 0 4px rgb(72 105 246 / 0.18)",
} as const;

const systemFonts =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const fontFamily = {
  // Refonte « Nette » (ADR 0245, 0261) : Inter partout, site public compris, chargée par next/font
  // (variables posées par apps/web/src/lib/fonts.ts) ; Inter Tight pour les titres et les grands
  // chiffres ; repli système.
  sans: `var(--font-inter), ${systemFonts}`,
  app: `var(--font-inter), ${systemFonts}`,
  display: `var(--font-inter-tight), var(--font-inter), ${systemFonts}`,
} as const;

/**
 * Refonte « Nette » (ADR 0245) : textes secondaires plus foncés dans les espaces connectés et
 * l'application (l'ancien gris paraissait « pâlot »). Le site public garde `muted-foreground`.
 * Reprise telle quelle dans la classe `.app-nette` de apps/web/src/app/globals.css.
 */
export const netteColors = {
  "muted-foreground": "#4a5263",
  /** Libellés des chiffres et des champs, entre le texte et le gris secondaire. */
  label: "#2b3242",
} as const;

/** Taille tactile minimale (spec §5 : 44 px). */
export const minTouchTarget = "2.75rem";

/** Valeurs numériques pour l'application native (React Native, phase 6) : mêmes rayons et cible tactile. */
export const nativeRadius = {
  button: 999,
  input: 12,
  card: 16,
  hero: 28,
  chip: 6,
  pill: 999,
} as const;

export const nativeTouchTarget = 44;

/** Paires texte / fond utilisées par l'interface : contraste AA (≥ 4,5:1) exigé. */
export const contrastPairs: ReadonlyArray<readonly [text: ColorToken, background: ColorToken]> = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["foreground", "input"],
  ["muted-foreground", "background"],
  ["muted-foreground", "surface"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-hover"],
  ["primary", "surface"],
  ["primary-strong", "background"],
  ["primary-strong", "primary-soft"],
  ["primary-strong", "primary-softer"],
  ["primary-foreground", "success"],
  ["primary-foreground", "danger"],
  ["primary-foreground", "warning"],
  ["success", "surface"],
  ["success", "success-soft"],
  ["danger", "surface"],
  ["danger", "danger-soft"],
  ["warning", "surface"],
  ["warning", "warning-soft"],
  ["primary-foreground", "example"],
  ["example-strong", "example-soft"],
  ["example-strong", "surface"],
];
