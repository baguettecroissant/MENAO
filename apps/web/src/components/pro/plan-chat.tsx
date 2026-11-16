"use client";

import { planNameKey, type PlanTrace } from "@menao/core";
import { CheckCircle2, FileSpreadsheet, HelpCircle, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  PlanViewer,
  type PlanFileLink,
  type PlanOverlay,
  type PlanView,
} from "@/components/pro/plan-viewer";
import { Alert, Button, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import type { PlanChatMessage, PlanChatResult } from "@/lib/artisan/plan-chat";
import { askPlanChat } from "@/lib/artisan/plan-chat-actions";
import { AiWorking } from "@/components/ai-working";

const c = fr.pro.tenders.plan.chat;
const quantity = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatPrice = (cents: number) => euros.format(cents / 100);

/** Métré en CSV (séparateur « ; », ouvert par Excel), sans rien envoyer au serveur. */
function downloadCsv(result: PlanChatResult) {
  const cell = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: (string | number | null)[][] = [
    [result.titre],
    [c.columns.label, c.columns.room, c.columns.quantity, ""],
    ...result.lignes.map((l) => [l.libelle, l.piece, quantity(l.quantite), l.unite]),
  ];
  if (result.fournitures.length) {
    rows.push(
      [],
      [c.supplies],
      [c.columns.label, c.columns.quantity, "", c.columns.unitPrice, c.columns.amount],
    );
    for (const f of result.fournitures) {
      rows.push([
        f.libelle,
        quantity(f.quantite),
        f.unite,
        f.prix_unitaire_centimes === null ? "" : formatPrice(f.prix_unitaire_centimes),
        f.total_centimes === null ? "" : formatPrice(f.total_centimes),
      ]);
    }
    if (result.total_centimes !== null)
      rows.push([c.total, "", "", "", formatPrice(result.total_centimes)]);
  }
  const csv = `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = c.csvName(result.titre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase());
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * « Demander à MENAO » (maquette du lot 59, ADR 0347) : la conversation à gauche, le plan avec le
 * repérage au centre, le métré vérifiable à droite. Les chiffres viennent des calculs de MENAO
 * (fonction plan-chat) ; une question de précision se répond en un toucher.
 */
export function PlanChat({
  tenderId,
  initialMessages,
  quota: initialQuota,
  files,
  traces,
}: {
  tenderId: string;
  initialMessages: PlanChatMessage[];
  quota: { used: number; limit: number };
  files: PlanFileLink[];
  traces: PlanTrace[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [quota, setQuota] = useState(initialQuota);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Métré affiché d'abord : celui de la dernière réponse qui en a un.
  const lastResult = [...messages]
    .reverse()
    .find(
      (m) =>
        m.role === "menao" &&
        !!m.result &&
        (m.result.lignes.length > 0 || m.result.fournitures.length > 0),
    );
  const [selectedId, setSelectedId] = useState<string | null>(lastResult?.id ?? null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [view, setView] = useState<PlanView>(() => ({ file: 0, page: traces[0]?.page ?? 1 }));
  const thread = useRef<HTMLDivElement>(null);
  const full = quota.used >= quota.limit;

  useEffect(() => {
    // Défile la conversation seule, pas la page.
    const box = thread.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages.length, asking]);

  const selected = messages.find((m) => m.id === selectedId)?.result ?? null;

  function ask(question: string) {
    const text = question.trim();
    if (!text || pending || full) return;
    setError(null);
    setAsking(text);
    setDraft("");
    startTransition(async () => {
      const reply = await askPlanChat(tenderId, text);
      setAsking(null);
      if (reply.status !== "ok") {
        const message = c.errors[reply.status] ?? c.errors.error;
        setError(typeof message === "function" ? message(quota.limit) : (message ?? null));
        if (reply.status === "quota") setQuota((q) => ({ ...q, used: q.limit }));
        if (reply.status !== "quota") setDraft(text);
        return;
      }
      const now = new Date().toISOString();
      setMessages((list) => [
        ...list,
        {
          id: `${reply.messageId}-q`,
          role: "artisan",
          content: text,
          result: null,
          createdAt: now,
        },
        {
          id: reply.messageId,
          role: "menao",
          content: reply.answer,
          result: reply.result,
          createdAt: now,
        },
      ]);
      setQuota({ used: reply.used, limit: reply.limit });
      setSelectedId(reply.messageId);
      setSelectedLine(null);
    });
  }

  // Repérage : les pièces citées par le métré sélectionné, sur le plan affiché.
  const rooms = new Set(
    (selected?.lignes ?? []).flatMap((l) => (l.piece ? [planNameKey(l.piece)] : [])),
  );
  const chosenRoom =
    selectedLine !== null && selected?.lignes[selectedLine]?.piece
      ? planNameKey(selected.lignes[selectedLine].piece ?? "")
      : null;
  const shownPage = files[view.file]?.kind === "pdf" ? view.page : 1;
  const trace = traces.find((x) => x.file === view.file + 1 && (x.page ?? 1) === shownPage);
  const overlay: PlanOverlay | null =
    trace && rooms.size > 0
      ? {
          width: trace.width,
          height: trace.height,
          anchors: [],
          shapes: trace.rooms
            .filter((r) => rooms.has(planNameKey(r.name)))
            .map((r, i) => ({
              key: `${i}-${r.name}`,
              points: r.contour,
              tone: "measured" as const,
              selected: chosenRoom === planNameKey(r.name),
            })),
        }
      : null;

  const conversation = (
    <section
      aria-label={c.conversation}
      className="flex w-full flex-col bg-background xl:w-[22rem] xl:shrink-0 xl:border-r xl:border-border"
    >
      <div
        ref={thread}
        className="flex max-h-[38rem] min-h-[20rem] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !asking && (
          <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-label">
            {c.intro}
          </p>
        )}
        {messages.map((m) =>
          m.role === "artisan" ? (
            <p
              key={m.id}
              className="max-w-[18rem] self-end rounded-[1rem] rounded-br-md bg-foreground px-3.5 py-2.5 text-[0.9063rem] text-surface"
            >
              {m.content}
            </p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2 self-start">
              {m.result && m.result.etapes.length > 0 && (
                <details className="text-[0.8438rem] text-label">
                  <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-success">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    {c.steps(m.result.etapes.length)}
                  </summary>
                  <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-border pl-3">
                    {m.result.etapes.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </details>
              )}
              {m.result?.question ? (
                <div className="flex max-w-[20rem] flex-col gap-2.5 rounded-[1rem] rounded-bl-md border-2 border-primary bg-surface px-3.5 py-3">
                  <b className="flex items-center gap-2 text-sm text-primary-strong">
                    <HelpCircle aria-hidden="true" className="size-4" />
                    {c.precision}
                  </b>
                  <p className="text-[0.9063rem]">{m.content}</p>
                  <div className="flex flex-col gap-1.5">
                    {m.result.question.choix.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        disabled={pending || full}
                        onClick={() => ask(choice)}
                        className="rounded-input border border-strong bg-surface px-3 py-2 text-left text-sm font-semibold hover:bg-background disabled:opacity-50"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.precisionNote}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(m.id);
                    setSelectedLine(null);
                  }}
                  aria-pressed={selectedId === m.id}
                  className="max-w-[20rem] rounded-[1rem] rounded-bl-md border border-border bg-surface px-3.5 py-2.5 text-left text-[0.9063rem] leading-relaxed aria-pressed:border-primary"
                >
                  {m.content}
                </button>
              )}
            </div>
          ),
        )}
        {asking && (
          <>
            <p className="max-w-[18rem] self-end rounded-[1rem] rounded-br-md bg-foreground px-3.5 py-2.5 text-[0.9063rem] text-surface">
              {asking}
            </p>
            <div className="self-start">
              <AiWorking kind="calcul" label={c.pending} />
            </div>
          </>
        )}
        {messages.length > 0 && <p className="text-xs text-muted-foreground">{c.disclaimer}</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="flex flex-col gap-2.5 border-t border-border bg-surface p-3.5"
      >
        {error && <Alert tone="error">{error}</Alert>}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending || full}
                onClick={() => ask(s)}
                className="rounded-pill border border-border bg-surface px-3 py-1.5 text-left text-[0.8125rem] font-semibold hover:bg-background disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            aria-label={c.placeholder}
            placeholder={c.placeholder}
            value={draft}
            maxLength={2000}
            rows={2}
            disabled={full}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            className="min-h-16 flex-1 resize-none rounded-input border border-strong bg-input px-3 py-2.5 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
          />
          <Button
            type="submit"
            block={false}
            aria-label={c.send}
            disabled={pending || full || draft.trim().length < 2}
            className="!size-11 !min-h-11 !rounded-full !p-0"
          >
            <Send aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-3.5" />
          {full ? c.quotaFull(quota.limit) : c.quota(quota.used, quota.limit)}
        </p>
      </form>
    </section>
  );

  const metre = (
    <section
      aria-label={c.metre}
      className="flex w-full flex-col bg-surface xl:w-[24rem] xl:shrink-0 xl:border-l xl:border-border"
    >
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{c.metre}</h2>
          {selected && (
            <StatusBadge tone={selected.question ? "warning" : "success"}>
              {selected.question ? c.waiting : c.ready}
            </StatusBadge>
          )}
        </div>
        {!selected || (selected.lignes.length === 0 && selected.fournitures.length === 0) ? (
          <p className="text-sm text-muted-foreground">{c.metreEmpty}</p>
        ) : (
          <>
            <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {selected.titre}
            </p>
            {selected.lignes.length > 0 && (
              <ul className="flex flex-col">
                {selected.lignes.map((l, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelectedLine(i)}
                      aria-pressed={selectedLine === i}
                      className="flex w-full items-baseline gap-3 border-t border-border py-2.5 text-left aria-pressed:bg-primary-softer"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{l.libelle}</span>
                        {(l.piece || l.detail) && (
                          <span className="text-xs text-muted-foreground">
                            {[l.piece, l.detail].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                      <b className="text-sm whitespace-nowrap tabular-nums">
                        {quantity(l.quantite)} {l.unite}
                      </b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected.fournitures.length > 0 && (
              <>
                <p className="pt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {c.supplies}
                </p>
                <ul className="flex flex-col">
                  {selected.fournitures.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-2 border-t border-border py-2.5 text-sm"
                    >
                      <span className="min-w-0 flex-1">{f.libelle}</span>
                      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                        {quantity(f.quantite)} {f.unite}
                      </span>
                      {f.total_centimes !== null && (
                        <b className="w-24 text-right whitespace-nowrap tabular-nums">
                          {formatPrice(f.total_centimes)}
                        </b>
                      )}
                    </li>
                  ))}
                </ul>
                {selected.total_centimes !== null && (
                  <p className="flex items-baseline justify-between rounded-card bg-foreground px-4 py-3 text-surface">
                    <span className="text-sm font-semibold">{c.total}</span>
                    <b className="text-xl tabular-nums">
                      {formatPrice(selected.total_centimes)} {c.ht}
                    </b>
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
      {selected && (selected.lignes.length > 0 || selected.fournitures.length > 0) && (
        <div className="flex gap-2 border-t border-border p-4">
          <Button type="button" variant="secondary" onClick={() => downloadCsv(selected)}>
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            {c.excel}
          </Button>
        </div>
      )}
    </section>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card xl:flex-row">
      {conversation}
      <div className="flex min-w-0 flex-1 p-3">
        <PlanViewer
          files={files}
          view={view}
          onView={setView}
          hint={c.planHint}
          overlay={overlay}
        />
      </div>
      {metre}
    </div>
  );
}
