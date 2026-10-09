"use client";

import { MAX_PROJECT_PHOTOS, PROJECT_TEXT_MAX_LENGTH, needHelpLevel } from "@menao/core";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";
import { DictationButton } from "./dictation-button";
import { PhotoDropzone } from "./photo-dropzone";

const t = fr.search;

type AnalyzeResult = { status: "ok"; projectId: string } | { status: string };

/** Saisie du besoin (F-05) : texte ou dictée, photos, puces de métiers. */
export function NeedForm({ trades }: { trades: { code: string; label: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tradeHint, setTradeHint] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "photos">("idle");

  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const help = needHelpLevel(text);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setErrors([]);
    setPhase("analyzing");
    const session = await ensureSession();
    if (!session) {
      setPhase("idle");
      return setErrors([t.errors.session]);
    }
    const result = await invokeFunction<AnalyzeResult>(session.supabase, "analyze-need", {
      description: text,
      tradeHint,
    });
    if (result.status !== "ok" || !("projectId" in result)) {
      setPhase("idle");
      const key = result.status as keyof typeof t.errors;
      return setErrors([t.errors[key] ?? t.errors.unavailable]);
    }
    let failed = false;
    if (photos.length) {
      setPhase("photos");
      for (const photo of photos) {
        if ((await uploadProjectPhoto(session, result.projectId, photo)) !== "ok") failed = true;
      }
    }
    const next = `/recherche/${result.projectId}${failed ? "?photos=erreur" : ""}`;
    router.push(next as Route);
  }

  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-4 text-left" noValidate>
        {errors.map((message) => (
          <Alert key={message} tone="error">
            {message}
          </Alert>
        ))}
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-lg font-semibold">
            {t.label}
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            maxLength={PROJECT_TEXT_MAX_LENGTH}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.placeholder}
            aria-describedby="description-help"
            className="rounded-button border border-border bg-surface p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
          <p
            id="description-help"
            aria-live="polite"
            className={`text-sm ${help === "suffisant" ? "text-success" : "text-muted-foreground"}`}
          >
            {help === "vide" ? t.helpEmpty : help === "insuffisant" ? t.helpShort : t.helpEnough}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <DictationButton
            onText={(spoken) =>
              setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
            }
            onError={(message) => setErrors(message ? [message] : [])}
          />
          <div className="flex-1">
            <PhotoDropzone
              disabled={photos.length >= MAX_PROJECT_PHOTOS}
              onFiles={(files) => {
                const selection = selectPhotos(files, photos.length, t.photos);
                setPhotos((prev) => [...prev, ...selection.accepted]);
                setErrors(selection.errors);
              }}
            />
          </div>
        </div>

        {photos.length > 0 && (
          <ul
            aria-label={t.photos.count(photos.length)}
            className="grid grid-cols-4 gap-2 sm:grid-cols-5"
          >
            {previews.map((url, index) => (
              <li key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                <img
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-button object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={t.photos.remove(index + 1)}
                  className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full bg-surface text-foreground shadow-sm"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{t.tradesLegend}</legend>
          <div className="flex flex-wrap gap-2">
            {trades.map((trade) => {
              const selected = tradeHint === trade.code;
              return (
                <button
                  key={trade.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTradeHint(selected ? null : trade.code)}
                  className={`min-h-touch rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface hover:bg-background"
                  }`}
                >
                  {trade.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <p className="text-sm text-muted-foreground">{t.privacy}</p>
        <Button type="submit" disabled={!text.trim() || phase !== "idle"}>
          {t.submit}
        </Button>
      </form>

      {phase !== "idle" && (
        <div
          role="status"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 px-6 text-center"
        >
          <span
            aria-hidden="true"
            className="size-12 animate-spin rounded-full border-4 border-primary-soft border-t-primary"
          />
          <p className="text-xl font-semibold">
            {phase === "photos" ? t.uploadingPhotos : t.analyzing}
          </p>
          <p className="text-muted-foreground">{t.analyzingHint}</p>
        </div>
      )}
    </>
  );
}
