"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.admin.followUp;

/**
 * Tableau long mais borné (ADR 0146) : les lignes, rendues par le serveur, s'affichent par lots de
 * 20 ; « Afficher plus » montre le lot suivant, sans recharger la page.
 */
export function ShowMoreTable({
  head,
  rows,
  step = 20,
}: {
  head: ReactNode;
  rows: ReactNode[];
  step?: number;
}) {
  const [visible, setVisible] = useState(step);
  const remaining = rows.length - visible;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {head}
          <tbody>{rows.slice(0, visible)}</tbody>
        </table>
      </div>
      {remaining > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block={false}
          className="self-start"
          onClick={() => setVisible((v) => v + step)}
        >
          {t.showMore(Math.min(step, remaining), remaining)}
        </Button>
      )}
    </div>
  );
}
