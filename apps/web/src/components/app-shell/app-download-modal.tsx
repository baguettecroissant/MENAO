"use client";

import { CalendarCheck, FileSignature, MessagesSquare, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/logo";
import { fr } from "@/i18n/fr";

const t = fr.appDownload;
const SEEN_KEY = "menao-fenetre-application-vue";

const noSubscription = () => () => {};
function shouldShow(): boolean {
  try {
    return !localStorage.getItem(SEEN_KEY) && window.matchMedia("(min-width: 640px)").matches;
  } catch {
    return false;
  }
}

/**
 * Maquette « Mes chantiers - Modale » : « Suivez tous vos chantiers, depuis votre poche. », avec
 * le QR code (calculé côté serveur) et les liens des stores. Affichée une fois par navigateur,
 * sur ordinateur, quand l'application est publiée (liens configurés). Élément <dialog> natif.
 */
export function AppDownloadModal({
  qr,
  appStoreUrl,
  playStoreUrl,
}: {
  qr: { size: number; path: string };
  appStoreUrl: string | null;
  playStoreUrl: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Ordinateur seulement (le QR code se scanne avec le téléphone), et une seule fois ; jamais au
  // rendu serveur.
  const wanted = useSyncExternalStore(noSubscription, shouldShow, () => false);
  const [dismissed, setDismissed] = useState(false);
  const open = wanted && !dismissed;

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Stockage indisponible (navigation privée) : la fenêtre reviendra, sans gêne.
    }
    ref.current?.close();
    setDismissed(true);
  }

  if (!open) return null;
  const features = [
    { icon: <MessagesSquare />, text: t.features[0] },
    { icon: <FileSignature />, text: t.features[1] },
    { icon: <CalendarCheck />, text: t.features[2] },
  ];
  return (
    <dialog
      ref={ref}
      aria-labelledby="app-download-title"
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-[min(46rem,calc(100%-2rem))] overflow-hidden rounded-card bg-surface p-0 shadow-raised backdrop:bg-foreground/40"
    >
      <div className="grid sm:grid-cols-[15rem_1fr]">
        <div className="hidden items-center justify-center bg-gradient-to-br from-primary to-primary-strong p-8 sm:flex">
          {/* Téléphone stylisé avec le logo, comme la maquette. */}
          <div className="flex h-64 w-36 -rotate-12 items-center justify-center rounded-[1.75rem] border-4 border-white/80 bg-primary shadow-raised">
            <Logo tone="white" className="scale-75" />
          </div>
        </div>
        <div className="relative flex flex-col gap-5 p-6 sm:p-8">
          <button
            type="button"
            onClick={close}
            aria-label={t.close}
            className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <h2 id="app-download-title" className="pr-8 text-xl font-medium text-primary-strong">
            {t.title}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {features.map((feature) => (
              <li key={feature.text} className="flex items-center gap-2.5 text-sm">
                <span aria-hidden="true" className="text-primary [&>svg]:size-4">
                  {feature.icon}
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <figure className="flex flex-col items-center gap-1.5">
              <svg
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                role="img"
                aria-label={t.qrAlt}
                className="size-32 rounded-input border border-border bg-white"
                shapeRendering="crispEdges"
              >
                <path d={qr.path} fill="#111728" />
              </svg>
              <figcaption className="text-xs text-muted-foreground">{t.scan}</figcaption>
            </figure>
            <div className="flex flex-col gap-2">
              {appStoreUrl && (
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-input bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Smartphone aria-hidden="true" className="size-4" />
                  {t.appStore}
                </a>
              )}
              {playStoreUrl && (
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-input bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <Smartphone aria-hidden="true" className="size-4" />
                  {t.playStore}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
