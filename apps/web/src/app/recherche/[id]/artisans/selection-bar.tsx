"use client";

import { MAX_ARTISANS_PER_REQUEST } from "@menao/core";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.search.selection;

/**
 * Barre d'envoi (F-11) : compte les artisans cochés dans le formulaire `formId` et bloque les
 * cases au-delà des places restantes (3 artisans au plus par projet, vérifié aussi en base). Un
 * chantier à plusieurs métiers (ADR 0170) a un groupe par métier : `key` vide pour le métier
 * principal (cases `artisan`), l'identifiant du lot sinon (cases `lot`, « <lot>.<artisan> »).
 */
export function SelectionBar({
  formId,
  groups,
}: {
  formId: string;
  groups: { key: string; slots: number }[];
}) {
  const [count, setCount] = useState(0);
  const [full, setFull] = useState(false);
  const limits = JSON.stringify(groups);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const max = new Map(
      (JSON.parse(limits) as typeof groups).map((g) => [
        g.key,
        Math.min(g.slots, MAX_ARTISANS_PER_REQUEST),
      ]),
    );
    // Les cases sont rattachées par l'attribut `form` (hors de l'arbre du formulaire) :
    // form.elements les inclut, et leurs événements remontent jusqu'au document.
    const boxes = () =>
      Array.from(form.elements).filter(
        (el): el is HTMLInputElement =>
          el instanceof HTMLInputElement &&
          el.type === "checkbox" &&
          (el.name === "artisan" || el.name === "lot"),
      );
    const groupOf = (box: HTMLInputElement) =>
      box.name === "lot" ? (box.value.split(".")[0] ?? "") : "";
    const update = () => {
      const checked = new Map<string, number>();
      for (const box of boxes()) {
        if (box.checked) checked.set(groupOf(box), (checked.get(groupOf(box)) ?? 0) + 1);
      }
      let reached = false;
      for (const box of boxes()) {
        const group = groupOf(box);
        const atMax = (checked.get(group) ?? 0) >= (max.get(group) ?? 0);
        box.disabled = !box.checked && atMax;
        if (atMax && max.has(group)) reached = true;
      }
      setCount([...checked.values()].reduce((sum, n) => sum + n, 0));
      setFull(reached);
    };
    const onChange = (e: Event) => {
      if (e.target instanceof HTMLInputElement && e.target.form === form) update();
    };
    update();
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [formId, limits]);

  const several = groups.length > 1;
  return (
    <div className="sticky bottom-4 z-20 flex flex-col items-center justify-between gap-3 rounded-card border border-border bg-surface/95 p-4 shadow-raised backdrop-blur sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {several ? (full ? t.limitLots : t.hintLots) : full ? t.limit : t.hint}
      </p>
      <Button
        type="submit"
        form={formId}
        disabled={count === 0}
        block={false}
        className="w-full shrink-0 whitespace-nowrap sm:w-auto"
      >
        {t.submit(count)}
        <Send aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
