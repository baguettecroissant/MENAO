"use client";

import { whatsAppShareUrl } from "@menao/core";
import { Check, Copy, Maximize2, MessageCircle, Printer, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { QrSvg } from "@/components/pro/share-card";
import { Button, buttonClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.commercialSpace.code;

/**
 * Code du commercial (ADR 0205) : à saisir dans l'application, ou repris tout seul par le lien et
 * le QR code d'inscription. Le QR code s'agrandit pour être scanné par le téléphone de l'artisan.
 */
export function CodeCard({
  code,
  link,
  qr,
}: {
  code: string;
  link: string;
  qr: { size: number; path: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le lien reste sélectionnable.
    }
  }

  return (
    <section
      aria-labelledby="code-commercial"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <button
          type="button"
          aria-label={`${t.qrAlt}, ${t.expand}`}
          onClick={() => dialog.current?.showModal()}
          className="relative shrink-0 rounded-card border border-border bg-white p-2 transition-opacity hover:opacity-90 focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
        >
          <QrSvg qr={qr} label={t.qrAlt} className="size-40" />
          <Maximize2
            aria-hidden="true"
            className="absolute right-2 bottom-2 size-5 rounded-full bg-white p-0.5 text-muted-foreground"
          />
        </button>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 id="code-commercial" className="text-sm font-medium text-muted-foreground">
            {t.title}
          </h2>
          <p className="text-3xl font-medium tracking-[0.12em] break-all text-primary-strong">
            {code}
          </p>
          <ul className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
            {t.howTo.map((line) => (
              <li key={line} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t.link}</p>
        <p className="rounded-input border border-border bg-background px-3 py-2 text-sm break-all select-all">
          {link}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" block={false} onClick={copy}>
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? t.copied : t.copy}
          </Button>
          <a
            href={whatsAppShareUrl(t.whatsappMessage(link))}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary", block: false })}
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {t.whatsapp}
          </a>
          <Link
            href="/commercial/cartes"
            className={buttonClasses({ variant: "secondary", block: false })}
          >
            <Printer aria-hidden="true" className="size-4" />
            {t.cards}
          </Link>
        </div>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="code-plein-ecran"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(92vw,30rem)] rounded-hero bg-white p-0 text-foreground backdrop:bg-foreground/60"
      >
        <div className="flex flex-col items-center gap-5 px-6 pt-4 pb-8 text-center">
          <button
            type="button"
            aria-label={t.close}
            onClick={() => dialog.current?.close()}
            className="flex size-11 items-center justify-center self-end rounded-full bg-background hover:bg-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <h3 id="code-plein-ecran" className="text-2xl font-medium tracking-tight">
            {t.fullscreenTitle}
          </h3>
          <QrSvg qr={qr} label={t.qrAlt} className="aspect-square w-full max-w-[22rem]" />
          <p className="text-3xl font-medium tracking-[0.12em] break-all text-primary-strong">
            {code}
          </p>
          <p className="text-muted-foreground">{t.fullscreenHint}</p>
        </div>
      </dialog>
    </section>
  );
}
