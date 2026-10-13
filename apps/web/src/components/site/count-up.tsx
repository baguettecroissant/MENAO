"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Chiffre qui compte jusqu'à sa valeur quand il apparaît à l'écran (« 100 % », « 48 h »). La
 * valeur finale est rendue côté serveur et lue telle quelle par les lecteurs d'écran ; pas
 * d'animation si le chiffre est déjà visible au chargement ou si la personne a demandé moins de
 * mouvement.
 */
export function CountUp({ value, durationMs = 1200 }: { value: string; durationMs?: number }) {
  const match = /^(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : 0;
  const suffix = match ? (match[2] ?? "") : "";
  const ref = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || target === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = element.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;
    setCurrent(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          setCurrent(Math.round(target * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) frame = requestAnimationFrame(step);
          else setCurrent(null);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  return (
    <span ref={ref}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="tabular-nums">
        {current === null ? value : `${current}${suffix}`}
      </span>
    </span>
  );
}
