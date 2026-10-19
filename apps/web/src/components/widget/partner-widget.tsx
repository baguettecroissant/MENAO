"use client";

import { normalizePartnerCode } from "@menao/core";
import { ArrowUpRight, CircleCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/brand/logo";
import { Select, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { frenchSpacing } from "@/lib/site/typography";

const t = fr.widget;

/**
 * Widget des partenaires (ADR 0138), affiché dans une iframe chez eux : le visiteur décrit son
 * projet, puis la recherche MENAO s'ouvre pré-remplie dans un nouvel onglet, avec le code du
 * partenaire dans l'adresse. Rien n'est enregistré ici : ni cookie, ni stockage, ni donnée.
 */
export function PartnerWidget({ trades }: { trades: { code: string; label: string }[] }) {
  const params = useSearchParams();
  const partnerCode = normalizePartnerCode(params.get("p"));
  const metier = params.get("metier");
  const initialTrade = metier && trades.some((tr) => tr.code === metier) ? metier : "";
  const root = useRef<HTMLDivElement>(null);

  // Hauteur réelle envoyée à la page hôte (widget.js ajuste l'iframe) : aucune autre donnée.
  useEffect(() => {
    const element = root.current;
    if (!element || window.parent === window) return;
    const send = () =>
      window.parent.postMessage(
        { type: "menao:widget-height", height: element.getBoundingClientRect().height },
        "*",
      );
    const observer = new ResizeObserver(send);
    observer.observe(element);
    send();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="p-2">
      <form
        action="/recherche"
        method="get"
        target="_blank"
        rel="noopener"
        className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
      >
        {partnerCode && <input type="hidden" name="p" value={partnerCode} />}
        <div className="flex flex-col gap-1.5">
          <Logo className="origin-left scale-75" />
          <h1 className="text-xl leading-tight font-medium tracking-tight text-balance">
            {frenchSpacing(t.title)}
          </h1>
          <p className="text-sm text-muted-foreground">{frenchSpacing(t.lead)}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="widget-metier" className="text-sm font-medium">
            {t.trade}
          </label>
          <Select id="widget-metier" name="metier" defaultValue={initialTrade}>
            <option value="">{t.anyTrade}</option>
            {trades.map((trade) => (
              <option key={trade.code} value={trade.code}>
                {trade.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="widget-projet" className="text-sm font-medium">
            {t.description}
          </label>
          <textarea
            id="widget-projet"
            name="q"
            rows={3}
            required
            maxLength={5000}
            placeholder={t.placeholder}
            className={`${inputClasses} py-3`}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none"
        >
          {t.submit}
          <ArrowUpRight aria-hidden="true" className="size-4" />
          <span className="sr-only">{t.opensNewTab}</span>
        </button>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {t.reassurance.map((item) => (
            <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleCheck aria-hidden="true" className="size-3.5 text-primary" />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-center text-[0.6875rem] text-subtle-foreground">
          {t.poweredBy}
          {partnerCode && ` · ${t.partner}`}
        </p>
      </form>
    </div>
  );
}
