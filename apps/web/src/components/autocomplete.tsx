"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fr } from "@/i18n/fr";

type AutocompleteProps<T> = {
  label: string;
  hint?: string;
  name?: string;
  defaultQuery?: string;
  errors?: readonly string[] | undefined;
  /** Recherche (annulable) : appelée après une courte pause de frappe, à partir de 3 caractères. */
  search: (query: string, signal: AbortSignal) => Promise<T[]>;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  /** Vider le champ après une sélection (ajout à une liste). */
  clearOnSelect?: boolean;
};

/** Champ d'autocomplétion accessible (motif « combobox » ARIA, navigation au clavier). */
export function Autocomplete<T>({
  label,
  hint,
  name,
  defaultQuery = "",
  errors,
  search,
  getKey,
  getLabel,
  onSelect,
  clearOnSelect = false,
}: AutocompleteProps<T>) {
  const id = useId();
  const [query, setQuery] = useState(defaultQuery);
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const selectedLabel = useRef(defaultQuery);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === selectedLabel.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await search(q, controller.signal);
        setItems(results);
        setActive(results.length ? 0 : -1);
        setOpen(true);
      } catch {
        // Requête annulée ou réseau indisponible : on garde l'état précédent.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, search]);

  function choose(item: T) {
    onSelect(item);
    const next = clearOnSelect ? "" : getLabel(item);
    selectedLabel.current = next;
    setQuery(next);
    setOpen(false);
    setItems([]);
  }

  const listId = `${id}-list`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + items.length) % items.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            const item = items[active];
            if (item) choose(item);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="min-h-touch rounded-button border border-border bg-surface px-3 aria-invalid:border-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-sm text-danger">
          {errors?.[0]}
        </p>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute top-full z-10 mt-1 max-h-72 w-full overflow-auto rounded-button border border-border bg-surface shadow-sm"
      >
        {loading && items.length === 0 && (
          <li className="px-3 py-2 text-muted-foreground">{fr.pro.onboarding.zone.searching}</li>
        )}
        {!loading && items.length === 0 && (
          <li className="px-3 py-2 text-muted-foreground">{fr.pro.onboarding.zone.noResults}</li>
        )}
        {items.map((item, index) => (
          <li
            key={getKey(item)}
            id={`${id}-opt-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(item);
            }}
            className={`cursor-pointer px-3 py-2 ${index === active ? "bg-primary-soft text-primary" : ""}`}
          >
            {getLabel(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
