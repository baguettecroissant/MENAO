"use client";

import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Hint, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

type Option = { code: string; label: string };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Sélection multiple par recherche (maquettes « Pièce des travaux », « Travaux attendus ») :
 * champ de recherche, suggestions au clavier, puces retirables.
 */
export function TokenPicker({
  label,
  description,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  description?: string;
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    const q = normalize(query.trim());
    return options
      .filter((o) => !selected.includes(o.code) && (!q || normalize(o.label).includes(q)))
      .slice(0, 8);
  }, [options, selected, query]);

  function add(option: Option) {
    onChange([...selected, option.code]);
    setQuery("");
    setActive(0);
  }

  const listId = `${id}-list`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {description && <p className="-mt-1 text-xs text-muted-foreground">{description}</p>}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && suggestions[active] ? `${id}-opt-${active}` : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              const option = suggestions[active];
              if (open && option) {
                e.preventDefault();
                add(option);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={inputClasses}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!open || suggestions.length === 0}
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-input border border-border bg-surface py-1 shadow-raised"
        >
          {suggestions.map((option, index) => (
            <li
              key={option.code}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => {
                e.preventDefault();
                add(option);
              }}
              className={`cursor-pointer px-4 py-2.5 text-sm ${
                index === active ? "bg-primary-softer text-primary-strong" : ""
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {selected.map((code) => {
            const option = options.find((o) => o.code === code);
            if (!option) return null;
            return (
              <li key={code}>
                <span className="inline-flex items-center gap-1 rounded-chip bg-primary-soft py-1 pr-1 pl-2.5 text-xs font-medium text-primary-strong">
                  {option.label}
                  <button
                    type="button"
                    onClick={() => onChange(selected.filter((c) => c !== code))}
                    aria-label={fr.search.review.remove(option.label)}
                    className="inline-flex size-5 items-center justify-center rounded-full hover:bg-primary/15"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {options.length === 0 && <Hint>{fr.search.review.noMatch}</Hint>}
    </div>
  );
}
