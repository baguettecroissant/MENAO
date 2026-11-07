import { Inter, Inter_Tight } from "next/font/google";

// Refonte « Nette » (F-91, ADR 0245) : Inter pour les textes, Inter Tight pour les titres et les
// grands chiffres, dans les espaces connectés seulement (le site public garde Google Sans).
// Polices variables auto-hébergées par next/font, préchargées sur les pages qui les utilisent.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

/** Classes à poser sur la racine d'un espace connecté : variables des polices et thème « Nette ». */
export const appTheme = `${inter.variable} ${interTight.variable} app-nette`;
