import { redirect } from "next/navigation";

/** Entrée des exemples (ADR 0184) : le tableau de bord. */
export default function ExamplesHome() {
  redirect("/pro/decouvrir/tableau-de-bord");
}
