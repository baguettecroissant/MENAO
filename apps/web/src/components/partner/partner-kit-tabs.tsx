"use client";

import { useId, useState } from "react";
import { CopyButton } from "@/components/copy-snippet";
import { fr } from "@/i18n/fr";

const t = fr.partnerSpace;

type Kit = { link: string; button: string; widget: string; iframe: string };
const TABS = ["link", "button", "widget", "iframe"] as const;
const LABELS: Record<(typeof TABS)[number], string> = {
  link: t.kitLink,
  button: t.kitButton,
  widget: t.kitWidget,
  iframe: t.kitIframe,
};

/**
 * Kit du partenaire en onglets (maquette du lot 38) : l'aperçu à gauche, le code à coller à
 * droite. Lien et bouton prévisualisés dans un cadre isolé (sans script) ; widget et iframe par
 * la vraie page du widget.
 */
export function PartnerKitTabs({ kit, widgetUrl }: { kit: Kit; widgetUrl: string }) {
  const id = useId();
  const [tab, setTab] = useState<(typeof TABS)[number]>("button");
  const code = kit[tab];
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={t.kitTabs}
        className="flex gap-1 self-start overflow-x-auto rounded-pill border border-border bg-surface p-1"
      >
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`${id}-${value}`}
            aria-selected={tab === value}
            aria-controls={`${id}-panel`}
            onClick={() => setTab(value)}
            className="min-h-9 rounded-pill px-3.5 text-sm font-medium whitespace-nowrap hover:bg-background aria-selected:bg-foreground aria-selected:font-semibold aria-selected:text-surface"
          >
            {LABELS[value]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${tab}`}
        className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-semibold text-muted-foreground">{t.preview}</span>
          {tab === "widget" || tab === "iframe" ? (
            <iframe
              src={widgetUrl}
              title={t.previewNote}
              loading="lazy"
              className="h-[27rem] w-full rounded-card border border-dashed border-border-strong bg-background"
            />
          ) : (
            <iframe
              sandbox=""
              srcDoc={`<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif">${code}</body>`}
              title={t.preview}
              className="h-32 w-full rounded-card border border-dashed border-border-strong bg-surface"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span
            id={`${id}-code-label`}
            className="text-[0.8125rem] font-semibold text-muted-foreground"
          >
            {t.code}
          </span>
          <div className="relative min-h-32 rounded-card bg-foreground p-4 pb-14">
            <pre
              aria-labelledby={`${id}-code-label`}
              className="font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-[#e6e9ef]"
            >
              {code}
            </pre>
            <span className="absolute right-3 bottom-3">
              <CopyButton value={code} copyLabel={t.copy} copiedLabel={t.copied} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
