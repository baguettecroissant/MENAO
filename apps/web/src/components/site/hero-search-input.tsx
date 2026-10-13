"use client";

import { useEffect, useState } from "react";

/**
 * Champ de recherche de l'accueil (F-01) : des exemples de projets s'écrivent tout seuls dans
 * l'aide du champ. L'animation s'arrête dès que la personne clique pour écrire, et n'a pas lieu
 * si elle a demandé moins de mouvement.
 */
export function HeroSearchInput({
  id,
  name,
  placeholder,
  examples,
}: {
  id: string;
  name: string;
  placeholder: string;
  examples: readonly string[];
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (focused || value || examples.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let example = 0;
    let length = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = examples[example] ?? "";
      if (!erasing) {
        length += 1;
        setTyped(current.slice(0, length));
        if (length >= current.length) {
          erasing = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 40 + Math.random() * 45);
      } else {
        length -= 1;
        setTyped(current.slice(0, length));
        if (length <= 0) {
          erasing = false;
          example = (example + 1) % examples.length;
          timer = setTimeout(tick, 450);
          return;
        }
        timer = setTimeout(tick, 18);
      }
    };
    timer = setTimeout(tick, 1200);
    return () => {
      clearTimeout(timer);
      setTyped("");
    };
  }, [focused, value, examples]);

  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={typed || placeholder}
      autoComplete="off"
      className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground placeholder:text-subtle-foreground focus:outline-none"
    />
  );
}
