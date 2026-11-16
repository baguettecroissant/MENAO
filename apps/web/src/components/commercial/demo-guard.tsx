"use client";

import { Eye, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fr } from "@/i18n/fr";

const t = fr.commercialDemo;

type Kind = keyof typeof t.toast;

/** Ce que ferait l'élément touché dans le vrai espace, ou null s'il reste utilisable. */
function blockedKind(target: Element): Kind | null {
  const marked = target.closest<HTMLElement>("[data-demo-block]");
  if (marked) return (marked.dataset.demoBlock as Kind) || "save";
  const link = target.closest<HTMLAnchorElement>("a[href]");
  if (link) {
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("tel:")) return "call";
    if (/^(sms:|mailto:)|wa\.me|whatsapp/.test(href)) return "message";
    if (/maps\.|waze\.com|maps:/.test(href)) return "route";
    return null;
  }
  const button = target.closest<HTMLButtonElement>("button");
  if (button && button.type === "submit" && button.form) return "save";
  return null;
}

/**
 * Démo de l'espace commercial (ADR 0344) : bandeau orange en haut de chaque page, puis les actions
 * gardées à leur place, mais arrêtées avant d'agir (appel, message, itinéraire, enregistrement,
 * copilote) avec un message qui dit ce qu'elles font dans le vrai espace. Les écritures sont de
 * toute façon refusées : la démo n'a ni compte ni base.
 */
export function CommercialDemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-example-soft bg-example-soft px-4 py-2.5 text-sm text-example-strong sm:px-6">
      <span className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-example px-2.5 text-xs font-bold tracking-wide text-white uppercase">
        <Eye aria-hidden="true" className="size-3.5" />
        {t.badge}
      </span>
      <span>
        <b>{t.banner}</b> {t.bannerDetail}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={"/pro/decouvrir" as Route} className="font-bold whitespace-nowrap">
          {t.artisan} →
        </Link>
        {/* Route qui retire le cookie : navigation complète, pas de navigation client. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/commercial/demo/sortir" className="font-semibold whitespace-nowrap underline">
          {t.exit}
        </a>
      </span>
    </div>
  );
}

export function CommercialDemoGuard({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = (next: Kind) => {
      setKind(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setKind(null), 6000);
    };
    // Phase de capture sur le document : avant les gestionnaires de React et l'envoi du formulaire.
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const blocked = target && blockedKind(target);
      if (!blocked) return;
      event.preventDefault();
      event.stopPropagation();
      show(blocked);
    };
    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopPropagation();
      show("save");
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <>
      {children}
      {kind && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] items-start gap-2.5 rounded-card bg-foreground px-4 py-3.5 text-surface shadow-lg"
        >
          <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <b className="text-sm">{t.toastTitle}</b>
            <span className="text-[0.8125rem] leading-snug opacity-85">{t.toast[kind]}</span>
          </span>
          <button
            type="button"
            aria-label={t.close}
            onClick={() => setKind(null)}
            className="rounded-full p-1 opacity-70 hover:opacity-100"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
