"use client";

import { MAX_ARTISANS_PER_REQUEST } from "@menao/core";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.selection;

/**
 * Barre d'envoi (F-11) : compte les artisans cochés dans le formulaire `formId` et bloque les
 * cases au-delà des places restantes (3 artisans au plus par projet, vérifié aussi en base).
 */
export function SelectionBar({ formId, slots }: { formId: string; slots: number }) {
  const [count, setCount] = useState(0);
  const max = Math.min(slots, MAX_ARTISANS_PER_REQUEST);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    // Les cases sont rattachées par l'attribut `form` (hors de l'arbre du formulaire) :
    // form.elements les inclut, et leurs événements remontent jusqu'au document.
    const boxes = () =>
      Array.from(form.elements).filter(
        (el): el is HTMLInputElement =>
          el instanceof HTMLInputElement && el.type === "checkbox" && el.name === "artisan",
      );
    const update = () => {
      const checked = boxes().filter((b) => b.checked).length;
      setCount(checked);
      for (const box of boxes()) box.disabled = !box.checked && checked >= max;
    };
    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement && e.target.form === form) update();
    };
    update();
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [formId, max]);

  return (
    <div className="sticky bottom-4 z-20 flex flex-col items-center justify-between gap-3 rounded-card border border-border bg-surface/95 p-4 shadow-raised backdrop-blur sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {count >= max ? t.limit : t.hint}
      </p>
      <Button
        type="submit"
        form={formId}
        disabled={count === 0}
        block={false}
        className="w-full sm:w-auto"
      >
        {t.submit(count)}
        <Send aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
