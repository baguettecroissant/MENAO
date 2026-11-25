"use client";

import { useEffect } from "react";
import { clickEventFor } from "@/lib/site/click-events";

type Umami = { track: (event: string, data?: Record<string, string>) => void };

/** Texte du bouton, court : il aide à savoir lequel a été touché (« Essayer gratuitement »…). */
function labelOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Suivi des clics sur les boutons principaux (F-189, ADR 0388) : liens et formulaires dont la
 * destination est suivie (`click-events.ts`), envoyés à Umami avec la page d'origine.
 */
export function ClickTracking() {
  useEffect(() => {
    const send = (event: string, element: Element) => {
      const umami = (window as unknown as { umami?: Umami }).umami;
      umami?.track(event, { page: window.location.pathname, bouton: labelOf(element) });
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const event = clickEventFor(link.getAttribute("href") ?? "", window.location.origin);
      if (event) send(event, link);
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      const action = form?.getAttribute("action");
      if (!form || !action) return;
      const event = clickEventFor(action, window.location.origin);
      if (event) send(event, e.submitter ?? form);
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
    };
  }, []);
  return null;
}
