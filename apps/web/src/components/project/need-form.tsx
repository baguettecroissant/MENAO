"use client";

import { MAX_PROJECT_PHOTOS, PROJECT_TEXT_MAX_LENGTH, needHelpLevel } from "@menao/core";
import { Paperclip, Search, Sparkles, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Alert, Button, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { PHOTO_ACCEPT, selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";
import { DictationButton, type DictationState } from "./dictation-button";
import { TradeChips } from "./trade-chips";

const t = fr.search;

type AnalyzeResult = { status: "ok"; projectId: string } | { status: string };

/**
 * Saisie du besoin (F-05, maquettes « Page de recherche – Saisie et dictée ») : texte ou dictée,
 * photos (trombone ou glisser-déposer), raccourcis métiers, puis écran « Analyse en cours ».
 */
export function NeedForm({
  trades,
  initialText = "",
  initialTrade = null,
}: {
  trades: { code: string; label: string }[];
  initialText?: string;
  initialTrade?: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [tradeHint, setTradeHint] = useState<string | null>(initialTrade);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "photos">("idle");
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dictation, setDictation] = useState<DictationState>("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const help = needHelpLevel(text);
  const canAddPhotos = photos.length < MAX_PROJECT_PHOTOS;

  function addFiles(files: File[]) {
    const selection = selectPhotos(files, photos.length, t.photos);
    setPhotos((prev) => [...prev, ...selection.accepted]);
    setErrors(selection.errors);
  }

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
    router.push(`/recherche/${result.projectId}${failed ? "?photos=erreur" : ""}` as Route);
  }

  const active = focused || text.length > 0 || dictation === "listening";

  return (
    <>
      <form onSubmit={submit} className="flex w-full flex-col items-center gap-4" noValidate>
        {errors.map((message) => (
          <div key={message} className="w-full">
            <Alert tone="error">{message}</Alert>
          </div>
        ))}

        <div
          className="relative w-full"
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (canAddPhotos) addFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <div
            className={`rounded-[1.25rem] border bg-surface text-left shadow-card transition-[border-color,box-shadow] ${
              active ? "border-primary shadow-focus" : "border-border"
            }`}
          >
            {photos.length > 0 && (
              <ul
                aria-label={t.photos.count(photos.length)}
                className="flex flex-wrap gap-2 px-4 pt-4"
              >
                {previews.map((url, index) => (
                  <li key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
                    <img src={url} alt="" className="size-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={t.photos.remove(index + 1)}
                      className="absolute -top-1.5 -right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-foreground text-white shadow-raised"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="description" className="sr-only">
              {t.label}
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={PROJECT_TEXT_MAX_LENGTH}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={dictation === "listening" ? t.listening : t.placeholder}
              aria-describedby="description-help"
              className="block min-h-24 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[0.9375rem] leading-relaxed text-foreground placeholder:text-subtle-foreground focus:outline-none sm:min-h-20"
            />
            <div className="flex items-center justify-between gap-3 px-3 pb-3">
              <label
                className={`inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20 ${
                  canAddPhotos ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
                title={t.photos.hint}
              >
                <Paperclip aria-hidden="true" className="size-4" />
                <span className="sr-only">{t.attach}</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={PHOTO_ACCEPT}
                  multiple
                  disabled={!canAddPhotos}
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
              </label>
              <DictationButton
                onText={(spoken) =>
                  setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                }
                onError={(message) => setErrors(message ? [message] : [])}
                onStateChange={setDictation}
              />
            </div>
          </div>

          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border-2 border-dashed border-primary bg-primary-soft/95 text-sm font-medium text-primary-strong">
              <Paperclip aria-hidden="true" className="size-5" />
              {t.dropHere}
            </div>
          )}
        </div>

        <div id="description-help" aria-live="polite" className="w-full">
          {help === "suffisant" ? (
            <p className="flex items-start gap-1.5 text-xs text-primary-strong">
              <Sparkles aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              {t.helpEnough}
            </p>
          ) : (
            <Hint>{help === "vide" ? t.helpEmpty : t.helpShort}</Hint>
          )}
        </div>

        <TradeChips
          trades={trades}
          selected={tradeHint}
          onToggle={(code) => setTradeHint((current) => (current === code ? null : code))}
        />

        <Button
          type="submit"
          size="lg"
          block={false}
          disabled={!text.trim() || phase !== "idle"}
          className="mt-2"
        >
          {t.submit}
          <Search aria-hidden="true" className="size-4" />
        </Button>
        <p className="max-w-xl text-center text-xs text-muted-foreground">{t.privacy}</p>
      </form>

      {phase !== "idle" && <AnalysisScreen photos={phase === "photos"} />}
    </>
  );
}

/** Écran « Analyse de votre projet en cours » (maquette « Recherche en cours »). */
export function AnalysisScreen({ photos = false }: { photos?: boolean }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col items-center justify-center gap-5 bg-background px-6 text-center"
    >
      <span className="inline-flex size-16 items-center justify-center rounded-full border border-primary/40 bg-surface">
        <LogoMark className="size-8 animate-menao-pulse" />
      </span>
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-medium">{photos ? t.uploadingPhotos : t.analyzing}</p>
        <p className="text-sm text-muted-foreground">{t.analyzingHint}</p>
      </div>
    </div>
  );
}
