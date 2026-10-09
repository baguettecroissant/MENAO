"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FieldError, Hint, inputClasses } from "@/components/ui";
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
  placeholder?: string;
  /** Loupe à droite du champ (maquettes « Adresse exacte »). */
  searchIcon?: boolean;
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
  placeholder,
  searchIcon = false,
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
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
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
          placeholder={placeholder}
          className={`${inputClasses} ${searchIcon ? "pr-11" : ""}`}
        />
        {searchIcon && (
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!open}
          className="absolute top-full z-20 mt-1 max-h-72 w-full overflow-auto rounded-input border border-border bg-surface py-1 shadow-raised"
        >
          {loading && items.length === 0 && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">
              {fr.pro.onboarding.zone.searching}
            </li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">
              {fr.pro.onboarding.zone.noResults}
            </li>
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
              className={`cursor-pointer px-4 py-2.5 text-sm ${index === active ? "bg-primary-softer text-primary-strong" : ""}`}
            >
              {getLabel(item)}
            </li>
          ))}
        </ul>
      </div>
      {errorId && <FieldError id={errorId}>{errors?.[0]}</FieldError>}
      {hint && <Hint id={hintId}>{hint}</Hint>}
    </div>
  );
}
