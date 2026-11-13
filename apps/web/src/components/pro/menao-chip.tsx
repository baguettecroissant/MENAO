import { BookOpen } from "lucide-react";
import { fr } from "@/i18n/fr";

/** Pastille « MENAO » : ouvrage repris de la bibliothèque MENAO (F-147, lot 41). */
export function MenaoChip() {
  return (
    <span className="inline-flex h-[1.375rem] items-center gap-[0.3125rem] rounded-[6px] bg-primary-soft px-2 text-xs font-bold text-primary-strong">
      <BookOpen aria-hidden="true" className="size-3" />
      {fr.pro.library.menao.chip}
    </span>
  );
}
