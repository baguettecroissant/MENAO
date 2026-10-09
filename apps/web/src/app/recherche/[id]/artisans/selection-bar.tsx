"use client";

import { MAX_ARTISANS_PER_REQUEST } from "@menao/core";
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
    const boxes = () =>
      Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="artisan"]'));
    const update = () => {
      const checked = boxes().filter((b) => b.checked).length;
      setCount(checked);
      for (const box of boxes()) box.disabled = !box.checked && checked >= max;
    };
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, [formId, max]);

  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {count >= max ? t.limit : t.hint}
      </p>
      <Button type="submit" form={formId} disabled={count === 0}>
        {t.submit(count)}
      </Button>
    </div>
  );
}
