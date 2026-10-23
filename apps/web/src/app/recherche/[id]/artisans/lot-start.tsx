"use client";

import type { DateSouhaitMode } from "@menao/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert, Button, RadioGroup, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { saveLotStart } from "@/lib/project/actions";

const t = fr.search.results.lots.start;
const dayFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

type Choice = DateSouhaitMode | "chantier";

/**
 * Date de début d'un lot (ADR 0169) : celle du chantier, ou une date propre au métier (le
 * carreleur après le plombier). Modifiable tant que le lot n'a pas été envoyé.
 */
export function LotStart({
  projectId,
  tradeCode,
  trade,
  dateMode,
  dateSouhaitee,
  own,
  editable,
  today,
}: {
  projectId: string;
  tradeCode: string;
  trade: string;
  dateMode: DateSouhaitMode;
  dateSouhaitee: string | null;
  own: boolean;
  editable: boolean;
  today: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<Choice>(own ? dateMode : "chantier");
  const [date, setDate] = useState(own && dateSouhaitee ? dateSouhaitee : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const when =
    dateMode === "date" && dateSouhaitee
      ? dayFormat.format(new Date(`${dateSouhaitee}T00:00:00Z`))
      : dateMode === "des_que_possible"
        ? t.asap
        : t.unknown;

  const save = () =>
    startTransition(async () => {
      const result = await saveLotStart(
        projectId,
        tradeCode,
        choice === "chantier" ? null : choice,
        choice === "date" ? date || null : null,
      );
      if (!result.ok) return setError(result.error);
      setError(null);
      setEditing(false);
      router.refresh();
    });

  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>
          {t.label(when)}
          {!own && editable ? ` (${t.same})` : ""}
        </span>
        {editable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t.editLabel(trade)}
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {t.edit}
          </button>
        )}
      </p>
    );
  }
  const id = `lot-start-${tradeCode}`;
  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="error">{error}</Alert>}
      <RadioGroup
        legend={t.legend(trade)}
        name={id}
        value={choice}
        onChange={(v) => setChoice(v as Choice)}
        options={(["chantier", "des_que_possible", "date", "inconnue"] as const).map((value) => ({
          value,
          label: t.options[value],
        }))}
        renderSelected={(value) =>
          value === "date" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-date`} className="text-sm font-medium">
                {t.pick}
              </label>
              <input
                id={`${id}-date`}
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClasses} bg-surface`}
              />
            </div>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          block={false}
          onClick={save}
          disabled={pending || (choice === "date" && !date)}
        >
          {t.save}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          block={false}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
