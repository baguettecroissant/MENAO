"use client";

import { useState, type ReactNode } from "react";

/**
 * Sur mobile, deux onglets (maquette « Mes chantiers - Mobile » : chantiers en cours / terminés) ;
 * sur ordinateur, les deux sections l'une sous l'autre.
 */
export function SectionTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly [{ label: string; panel: ReactNode }, { label: string; panel: ReactNode }];
}) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-pill bg-border p-1 sm:hidden"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={active === i}
            onClick={() => setActive(i)}
            className={`min-h-10 rounded-pill px-3 text-sm font-medium transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none ${
              active === i
                ? "bg-surface text-primary-strong shadow-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} className={active === i ? "contents" : "hidden sm:contents"}>
          {tab.panel}
        </div>
      ))}
    </>
  );
}
