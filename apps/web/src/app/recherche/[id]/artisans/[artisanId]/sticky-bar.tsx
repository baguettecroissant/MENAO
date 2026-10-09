"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * En-tête compacte de la fiche artisan (maquette « Fiche artisan – Scroll ») : apparaît quand
 * le bandeau principal sort de l'écran.
 */
export function StickyProfileBar({ children, bar }: { children: ReactNode; bar: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {children}
      <div ref={sentinel} aria-hidden="true" />
      <div
        inert={!visible}
        className={`fixed inset-x-0 top-16 z-20 border-b border-border bg-surface/95 backdrop-blur transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        {bar}
      </div>
    </>
  );
}
