"use client";

import { ArrowUp, X } from "lucide-react";
import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { focusRing, inputClasses } from "@/components/ui";

/**
 * Éléments communs des assistants MENAO (pages Pro, ADR 0218 ; particuliers, ADR 0220) : fenêtre
 * plein écran sur téléphone (page derrière figée) et en bas à droite sur grand écran, bulles,
 * questions à poser d'un toucher, points « en train d'écrire », champ de saisie.
 */
export function AssistantDialog({
  id,
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Plein écran sur téléphone : la page derrière ne défile plus.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 39.99rem)").matches) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="animate-menao-assistant fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-surface text-left sm:inset-auto sm:right-6 sm:bottom-6 sm:h-auto sm:max-h-[min(42rem,85dvh)] sm:w-[25rem] sm:rounded-card sm:border sm:border-border sm:shadow-raised"
    >
      <header className="flex items-center gap-3 bg-[linear-gradient(120deg,#0b1438_0%,#1a2b85_50%,#4869f6_100%)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-white/15">
          <LogoMark tone="white" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={`${id}-title`} className="font-medium">
            {title}
          </h2>
          <p className="text-xs text-white/75">{subtitle}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={`inline-flex size-10 items-center justify-center rounded-pill text-white/90 hover:bg-white/15 ${focusRing}`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>
      {children}
    </section>
  );
}

/** Message de la conversation ; l'auteur est annoncé aux lecteurs d'écran. */
export function Bubble({
  role,
  speaker,
  children,
}: {
  role: "user" | "assistant";
  speaker: string;
  children: string;
}) {
  return role === "user" ? (
    <p className="max-w-[85%] self-end rounded-card rounded-br-md bg-primary px-3.5 py-2.5 text-[0.9375rem] whitespace-pre-line text-white">
      <span className="sr-only">{speaker} : </span>
      {children}
    </p>
  ) : (
    <p className="max-w-[90%] self-start rounded-card rounded-bl-md bg-background px-3.5 py-2.5 text-[0.9375rem] whitespace-pre-line">
      <span className="sr-only">{speaker} : </span>
      {children}
    </p>
  );
}

/** Questions à poser d'un toucher (questions fréquentes, puis relances proposées). */
export function Chips({
  items,
  onPick,
  label,
}: {
  items: readonly string[];
  onPick: (text: string) => void;
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs text-subtle-foreground">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className={`min-h-10 rounded-pill border border-primary/25 bg-primary-soft px-3.5 text-left text-sm text-primary-strong transition hover:border-primary/50 active:scale-[0.98] ${focusRing}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/** « L'assistant écrit… » : trois points qui s'animent (fixes si les animations sont réduites). */
export function Typing({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="animate-menao-fade-up flex items-center gap-1 self-start rounded-card rounded-bl-md bg-background px-4 py-3.5"
    >
      <span className="sr-only">{label}</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          className="animate-menao-typing size-2 rounded-pill bg-muted-foreground"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </p>
  );
}

/** Champ de saisie et bouton d'envoi. */
export function Composer({
  id,
  value,
  onChange,
  onSubmit,
  pending,
  maxLength,
  placeholder,
  label,
  sendLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  maxLength: number;
  placeholder: string;
  label: string;
  sendLabel: string;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="send"
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        aria-label={sendLabel}
        className={`inline-flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary text-white transition hover:bg-primary-strong active:scale-95 disabled:opacity-50 ${focusRing}`}
      >
        <ArrowUp aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}
