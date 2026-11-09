import { Inter, Inter_Tight } from "next/font/google";

// Refonte « Nette » (F-91, ADR 0245) : Inter pour les textes, Inter Tight pour les titres et les
// grands chiffres. Depuis le lot 16 (ADR 0261), sur tout le site : la racine porte `appTheme`.
// Polices variables auto-hébergées par next/font.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

/** Classes de la racine du site (et des anciens espaces) : variables des polices et thème « Nette ». */
export const appTheme = `${inter.variable} ${interTight.variable} app-nette`;
