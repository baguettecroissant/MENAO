"use client";

import {
  AVATAR_MAX_ZOOM,
  AVATAR_SIDE,
  type AvatarFraming,
  centeredFraming,
  clampFraming,
  edgeColor,
  fillScale,
  fitScale,
  initialFraming,
  rescaleFraming,
  zoomFraming,
} from "@menao/core";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.avatarFramer;
/** Côté du carré d'aperçu, en pixels CSS. */
const PREVIEW = 288;

type Loaded = { url: string; width: number; height: number; background: string };

/** Image du fichier, ses dimensions et la couleur de son bord (fond autour d'une image entière). */
async function load(file: File): Promise<Loaded> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const small = 48;
  canvas.width = small;
  canvas.height = small;
  const context = canvas.getContext("2d");
  context?.drawImage(bitmap, 0, 0, small, small);
  const pixels = context?.getImageData(0, 0, small, small).data;
  const loaded = {
    url: URL.createObjectURL(file),
    width: bitmap.width,
    height: bitmap.height,
    background: pixels ? edgeColor(pixels, small, small) : "#ffffff",
  };
  bitmap.close();
  return loaded;
}

/** Image enregistrée : carré de 512 px, fond de la couleur du bord, cadrage choisi. */
async function render(file: File, image: Loaded, framing: AvatarFraming): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIDE;
  canvas.height = AVATAR_SIDE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  const f = rescaleFraming(framing, PREVIEW, AVATAR_SIDE);
  context.fillStyle = image.background;
  context.fillRect(0, 0, AVATAR_SIDE, AVATAR_SIDE);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, f.x, f.y, image.width * f.scale, image.height * f.scale);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encodage impossible"))),
      "image/jpeg",
      0.9,
    ),
  );
}

/**
 * Cadrage de la photo de profil (ADR 0202), comme WhatsApp ou LinkedIn : l'image glisse et se
 * zoome dans un carré, le rond montre la bulle de profil. « Image entière » garde tout un logo,
 * sur un fond de la couleur de son bord.
 */
export function AvatarFramer({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<Loaded | null>(null);
  const [framing, setFraming] = useState<AvatarFraming | null>(null);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ x: number; y: number; start: AvatarFraming } | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    let url: string | null = null;
    let active = true;
    load(file)
      .then((loaded) => {
        url = loaded.url;
        if (!active) return URL.revokeObjectURL(loaded.url);
        setImage(loaded);
        setFraming(initialFraming(loaded.width, loaded.height, PREVIEW));
      })
      .catch(onCancel);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, onCancel]);

  const min = image ? fitScale(image.width, image.height, PREVIEW) : 1;
  const max = image ? fillScale(image.width, image.height, PREVIEW) * AVATAR_MAX_ZOOM : 1;

  function zoomTo(scale: number) {
    if (!image || !framing) return;
    setFraming(zoomFraming(framing, scale, image.width, image.height, PREVIEW));
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cadrage-titre"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-5 shadow-card backdrop:bg-foreground/40"
    >
      <div className="flex flex-col gap-4">
        <h2 id="cadrage-titre" className="text-lg font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
        <div
          className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-card select-none active:cursor-grabbing"
          style={{
            width: PREVIEW,
            height: PREVIEW,
            backgroundColor: image?.background ?? "#ffffff",
          }}
          onPointerDown={(e) => {
            if (!framing) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, start: framing };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !image) return;
            setFraming(
              clampFraming(
                { ...d.start, x: d.start.x + e.clientX - d.x, y: d.start.y + e.clientY - d.y },
                image.width,
                image.height,
                PREVIEW,
              ),
            );
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => framing && zoomTo(framing.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {image && framing && (
            // eslint-disable-next-line @next/next/no-img-element -- image locale du fichier choisi
            <img
              src={image.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
              style={{
                width: image.width,
                height: image.height,
                transform: `translate(${framing.x}px, ${framing.y}px) scale(${framing.scale})`,
              }}
            />
          )}
          {/* Bulle de profil : le rond reste clair, le reste du carré est voilé. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 999px rgb(0 0 0 / 0.45)" }}
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className="font-medium">{t.zoom}</span>
          <input
            type="range"
            min={0}
            max={1000}
            disabled={!framing}
            // Échelle logarithmique : le zoom avance au même rythme sur toute la course.
            value={
              framing
                ? Math.round((Math.log(framing.scale / min) / Math.log(max / min || 2)) * 1000)
                : 0
            }
            onChange={(e) => zoomTo(min * Math.pow(max / min || 2, Number(e.target.value) / 1000))}
            className="grow accent-primary"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            block={false}
            disabled={!image}
            onClick={() =>
              image && setFraming(centeredFraming(min, image.width, image.height, PREVIEW))
            }
          >
            {t.fit}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            block={false}
            disabled={!image}
            onClick={() =>
              image &&
              setFraming(
                centeredFraming(
                  fillScale(image.width, image.height, PREVIEW),
                  image.width,
                  image.height,
                  PREVIEW,
                ),
              )
            }
          >
            {t.fill}
          </Button>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" block={false} onClick={onCancel}>
            {t.cancel}
          </Button>
          <Button
            type="button"
            block={false}
            disabled={!image || !framing || saving}
            onClick={async () => {
              if (!image || !framing) return;
              setSaving(true);
              try {
                const blob = await render(file, image, framing);
                onConfirm(blob, URL.createObjectURL(blob));
              } catch {
                onCancel();
              } finally {
                setSaving(false);
              }
            }}
          >
            {t.confirm}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
