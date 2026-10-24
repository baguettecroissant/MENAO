"use client";

import {
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  appendIdea,
  matchNeedPhrases,
  needHelpLevel,
  remainingCompletion,
  type NeedIdea,
  type NeedPhrase,
} from "@menao/core";
import {
  ArrowRight,
  Clock,
  House,
  MapPin,
  Paperclip,
  Plus,
  Ruler,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { ensureSession, invokeFunction } from "@/lib/project/client";
import { PHOTO_ACCEPT, selectPhotos, uploadProjectPhoto } from "@/lib/project/photos";
import { useNeedSuggestions } from "@/lib/project/suggestions";
import { AnalysisScreen } from "./analysis-screen";
import { DictationButton, type DictationState } from "./dictation-button";
import { TradeChips } from "./trade-chips";

const t = fr.search;
const s = fr.search.suggestions;
const p = fr.search.proposals;
const u = fr.search.understanding;

type AnalyzeResult = { status: "ok"; projectId: string } | { status: string };

/**
 * Saisie du besoin (F-05, maquettes « Page de recherche – Saisie et dictée ») : texte ou dictée,
 * photos (trombone ou glisser-déposer), raccourcis métiers, puis écran « Analyse en cours ».
 */
export function NeedForm({
  trades,
  initialText = "",
  initialTrade = null,
  rehire = null,
  fromPage = null,
  partnerCode = null,
}: {
  trades: { code: string; label: string }[];
  initialText?: string;
  initialTrade?: string | null;
  /** « Redemander un devis » : artisan d'un chantier précédent, proposé en premier. */
  rehire?: { artisanId: string; chantierId: string; name: string } | null;
  /** Recherche lancée depuis la fiche publique d'un artisan (ADR 0173) : proposé en premier. */
  fromPage?: { artisanId: string; name: string } | null;
  /** Programme Partenaires (F-59) : code lu dans l'adresse (`?p=`), transmis avec la demande. */
  partnerCode?: string | null;
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
  const field = useRef<HTMLTextAreaElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  // Suggestions pendant la saisie (ADR 0177) : suite grisée dans le champ, idées en pastilles.
  const suggestion = useNeedSuggestions(text, phase === "idle" && dictation !== "listening");
  const [caretAtEnd, setCaretAtEnd] = useState(true);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [usedIdeas, setUsedIdeas] = useState<string[]>([]);
  // Propositions instantanées (ADR 0178) : demandes types dès les premiers mots, sans IA.
  const proposals = useMemo(() => (phase === "idle" ? matchNeedPhrases(text) : []), [phase, text]);
  const [highlight, setHighlight] = useState(-1);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const showProposals = focused && proposals.length > 0 && closedFor !== text;
  const completion =
    suggestion && focused && caretAtEnd && !showProposals && dismissed !== suggestion.base
      ? remainingCompletion(suggestion.base, suggestion.completion, text)
      : null;
  const ideas =
    suggestion && text.trim().length >= SUGGESTION_MIN_LENGTH
      ? suggestion.ideas.filter((idea) => !usedIdeas.includes(`${suggestion.base}|${idea.label}`))
      : [];

  // Curseur à placer dès que le champ affiche le nouveau texte, avant la frappe suivante.
  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const element = field.current;
    if (!selection || !element) return;
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(selection[0], selection[1]);
  }, [text]);

  /** Texte modifié par une suggestion, puis curseur placé (fin du texte ou endroit à compléter). */
  function replaceText(next: string, select: [number, number] | null = null) {
    const value = next.slice(0, PROJECT_TEXT_MAX_LENGTH);
    const selection = select ?? [value.length, value.length];
    pendingSelection.current = selection;
    setText(value);
    setCaretAtEnd(selection[1] === value.length);
  }

  function chooseProposal(proposal: NeedPhrase) {
    const next = `${proposal.text} `;
    setClosedFor(next);
    setHighlight(-1);
    replaceText(next);
  }

  function acceptCompletion() {
    if (completion) replaceText(text + completion);
  }

  // Compréhension en direct (ADR 0179) : ce qui a été compris, et la question qui manque.
  const [answered, setAnswered] = useState<string[]>([]);
  const understood =
    suggestion && text.trim().length >= SUGGESTION_MIN_LENGTH ? suggestion.understood : null;
  const understoodItems = understood
    ? [
        {
          icon: Wrench,
          label: understood.trade
            ? (trades.find((trade) => trade.code === understood.trade)?.label ?? null)
            : null,
        },
        { icon: House, label: understood.room },
        { icon: MapPin, label: understood.city },
        { icon: Ruler, label: understood.surface },
        { icon: Clock, label: understood.timing },
      ].filter((item): item is { icon: typeof Wrench; label: string } => Boolean(item.label))
    : [];
  const question =
    understood && suggestion?.question && !answered.includes(`${suggestion.base}|q`)
      ? suggestion.question
      : null;

  function answerQuestion(answer: NeedIdea) {
    if (suggestion) setAnswered((done) => [...done, `${suggestion.base}|q`]);
    const next = appendIdea(text, answer.insert);
    replaceText(next.text, next.select);
  }

  function addIdea(idea: NeedIdea) {
    if (suggestion) setUsedIdeas((used) => [...used, `${suggestion.base}|${idea.label}`]);
    const next = appendIdea(text, idea.insert);
    replaceText(next.text, next.select);
  }

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
      ...(rehire
        ? { preferredArtisanId: rehire.artisanId, fromChantierId: rehire.chantierId }
        : fromPage
          ? { preferredArtisanId: fromPage.artisanId, fromPublicPage: true }
          : {}),
      ...(partnerCode ? { partnerCode } : {}),
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
        {(rehire ?? fromPage) && (
          <div className="w-full text-left">
            <Alert tone="info">{t.rehire((rehire ?? fromPage)!.name)}</Alert>
          </div>
        )}
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
            <div className="relative">
              {/* Suite proposée, en gris derrière le texte (même police, même retour à la ligne). */}
              <div
                ref={mirror}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden px-4 pt-4 pb-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap"
              >
                <span className="text-transparent">{text}</span>
                {completion && <span className="text-subtle-foreground">{completion}</span>}
              </div>
              <textarea
                ref={field}
                id="description"
                name="description"
                rows={3}
                maxLength={PROJECT_TEXT_MAX_LENGTH}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setHighlight(-1);
                  setCaretAtEnd(e.target.selectionEnd === e.target.value.length);
                }}
                onSelect={(e) =>
                  setCaretAtEnd(
                    e.currentTarget.selectionStart === e.currentTarget.value.length &&
                      e.currentTarget.selectionEnd === e.currentTarget.value.length,
                  )
                }
                onKeyDown={(e) => {
                  if (showProposals) {
                    const count = proposals.length;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlight((current) =>
                        e.key === "ArrowDown"
                          ? (current + 1) % count
                          : current <= 0
                            ? count - 1
                            : current - 1,
                      );
                      return;
                    }
                    const chosen = proposals[highlight];
                    if (e.key === "Enter" && chosen) {
                      e.preventDefault();
                      chooseProposal(chosen);
                      return;
                    }
                    if (e.key === "Escape") {
                      setClosedFor(text);
                      return;
                    }
                  }
                  if (!completion || !suggestion) return;
                  if ((e.key === "Tab" && !e.shiftKey) || e.key === "ArrowRight") {
                    e.preventDefault();
                    acceptCompletion();
                  } else if (e.key === "Escape") {
                    setDismissed(suggestion.base);
                  }
                }}
                onScroll={(e) => {
                  if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop;
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={dictation === "listening" ? t.listening : t.placeholder}
                aria-describedby="description-help"
                aria-autocomplete="list"
                aria-controls={showProposals ? "need-proposals" : undefined}
                aria-activedescendant={
                  showProposals && highlight >= 0 ? `need-proposal-${highlight}` : undefined
                }
                className="relative block min-h-24 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[0.9375rem] leading-relaxed text-foreground placeholder:text-subtle-foreground focus:outline-none sm:min-h-20"
              />
            </div>
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
              {completion && (
                <button
                  type="button"
                  // Le champ garde le focus : la suite reste affichée jusqu'au clic.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={acceptCompletion}
                  aria-label={s.acceptAria(completion.trim())}
                  className="mr-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary-strong transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                  {s.accept}
                  <kbd className="hidden rounded border border-current/30 px-1 font-sans text-[0.6875rem] sm:inline">
                    Tab
                  </kbd>
                </button>
              )}
              <DictationButton
                onText={(spoken) =>
                  setText((prev) => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken))
                }
                onError={(message) => setErrors(message ? [message] : [])}
                onStateChange={setDictation}
              />
            </div>
          </div>

          {showProposals && (
            <ul
              id="need-proposals"
              role="listbox"
              aria-label={p.label}
              className="absolute inset-x-0 top-full z-20 mt-2 animate-menao-fade-up overflow-hidden rounded-[1.25rem] border border-border bg-surface py-1.5 text-left shadow-raised"
            >
              {proposals.map((proposal, index) => (
                <li
                  key={proposal.text}
                  id={`need-proposal-${index}`}
                  role="option"
                  aria-selected={index === highlight}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => chooseProposal(proposal)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.9375rem] ${
                    index === highlight ? "bg-primary-soft text-primary-strong" : "text-foreground"
                  }`}
                >
                  <Search aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
                  {proposal.text}
                </li>
              ))}
            </ul>
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border-2 border-dashed border-primary bg-primary-soft/95 text-sm font-medium text-primary-strong">
              <Paperclip aria-hidden="true" className="size-5" />
              {t.dropHere}
            </div>
          )}
        </div>

        {(understoodItems.length > 0 || question) && (
          <div className="flex w-full animate-menao-fade-up flex-col gap-2.5 text-left">
            {understoodItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
                <span className="inline-flex items-center gap-1 font-medium text-primary-strong">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {u.title}
                </span>
                {understoodItems.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 font-medium text-primary-strong"
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            )}
            {question && (
              <div
                role="group"
                aria-label={question.label}
                className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-primary/20 bg-surface px-3.5 py-2.5 shadow-card"
              >
                <span className="mr-1 text-sm font-medium text-foreground">{question.label}</span>
                {question.answers.map((answer) => (
                  <button
                    key={answer.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => answerQuestion(answer)}
                    className="inline-flex min-h-8 items-center rounded-full border border-border-strong bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-strong"
                  >
                    {answer.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {ideas.length > 0 && (
          <div
            role="group"
            aria-label={s.ideasAria}
            className="flex w-full animate-menao-fade-up flex-wrap items-center gap-2 text-left"
          >
            <span className="text-xs font-medium text-muted-foreground">{s.ideas}</span>
            {ideas.map((idea) => (
              <button
                key={idea.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addIdea(idea)}
                aria-label={s.addIdea(idea.label)}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-primary/30 bg-surface px-3 text-xs font-medium text-primary-strong transition-colors hover:border-primary hover:bg-primary-soft"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                {idea.label}
              </button>
            ))}
          </div>
        )}

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
