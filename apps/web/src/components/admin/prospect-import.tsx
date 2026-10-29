"use client";

import {
  PROSPECT_APE_CODES,
  companySearchUrl,
  isDepartementCode,
  nextImportStep,
  parseCompanySearch,
  type ProspectImportRow,
} from "@menao/core";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Field, Hint } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { importProspectsBatch } from "@/lib/admin/prospect-actions";

const t = fr.admin.prospects;

/** Environ 4 appels par seconde : l'API refuse au-delà de 7 (réponse 429). */
const MIN_INTERVAL_MS = 250;
/** Sur 429 ou panne passagère : attente de 2 s, puis 4, 6, 8 ; 5 essais en tout. */
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 5;
/** Lots envoyés à la base, qui en accepte 1 000 au plus. */
const BATCH_SIZE = 500;

type Progress = { code: string; apeIndex: number; page: number; pages: number };
type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done" }
  | { kind: "stopped" }
  | { kind: "error"; message: string };
type PageResult = { kind: "ok"; body: unknown } | { kind: "aborted" } | { kind: "failed" };

/** Erreur à afficher telle quelle (texte de fr.admin.prospects.errors). */
class ImportError extends Error {}

/** Attente interrompue par l'arrêt de l'import. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done);
  });
}

/** Espace les appels à l'API d'au moins MIN_INTERVAL_MS. */
function throttler(signal: AbortSignal) {
  let last = 0;
  return async () => {
    const wait = last + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait, signal);
    last = Date.now();
  };
}

/**
 * Une page de l'API « Recherche d'entreprises ». Trop d'appels (429), erreur du serveur ou du
 * réseau : nouvel essai après une attente croissante. Autre refus : échec immédiat.
 */
async function fetchPage(
  url: string,
  signal: AbortSignal,
  throttle: () => Promise<void>,
): Promise<PageResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    if (signal.aborted) return { kind: "aborted" };
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return { kind: "ok", body: await res.json() };
      if (res.status !== 429 && res.status < 500) return { kind: "failed" };
    } catch {
      if (signal.aborted) return { kind: "aborted" };
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt, signal);
  }
  return signal.aborted ? { kind: "aborted" } : { kind: "failed" };
}

/**
 * Import d'un département (F-65, lot 2, ADR 0206) : pour chaque code APE ciblé, toutes les pages
 * de l'API ; les établissements retenus par parseCompanySearch partent à la base par lots de 500
 * (chaque SIRET une seule fois). À l'arrêt ou si l'API ne répond plus, ce qui a déjà été lu est
 * enregistré avant de rendre la main. Un enregistrement refusé lève une ImportError.
 */
async function runImport(
  departement: string,
  signal: AbortSignal,
  onProgress: (progress: Progress) => void,
  onSaved: (saved: number) => void,
): Promise<void> {
  const throttle = throttler(signal);
  const sent = new Set<string>();
  let buffer: ProspectImportRow[] = [];
  let saved = 0;

  const flush = async (all: boolean) => {
    while (buffer.length >= BATCH_SIZE || (all && buffer.length > 0)) {
      const batch = buffer.slice(0, BATCH_SIZE);
      const result = await importProspectsBatch(batch).catch(() => null);
      if (!result || "error" in result) throw new ImportError(result?.error ?? t.errors.save);
      buffer = buffer.slice(batch.length);
      saved += result.count;
      onSaved(saved);
    }
  };

  let step: { apeIndex: number; page: number } | null = { apeIndex: 0, page: 1 };
  let apiFailed = false;
  while (step && !signal.aborted) {
    const ape = PROSPECT_APE_CODES[step.apeIndex];
    if (!ape) break;
    const result = await fetchPage(
      companySearchUrl(departement, ape.code, step.page),
      signal,
      throttle,
    );
    if (result.kind === "aborted") break;
    if (result.kind === "failed") {
      apiFailed = true;
      break;
    }
    const { rows, totalPages } = parseCompanySearch(result.body, departement);
    for (const row of rows) {
      if (sent.has(row.siret)) continue;
      sent.add(row.siret);
      buffer.push(row);
    }
    onProgress({
      code: ape.code,
      apeIndex: step.apeIndex,
      page: step.page,
      pages: Math.max(totalPages, step.page),
    });
    await flush(false);
    step = nextImportStep(step, totalPages);
  }
  await flush(true);
  if (apiFailed) throw new ImportError(t.errors.api);
}

/**
 * Import ou mise à jour de la base de prospects d'un département, depuis le navigateur de
 * l'admin (l'API publique n'a pas de clé) : progression, arrêt possible, chiffres de la page
 * rafraîchis à la fin.
 */
export function ProspectImport() {
  const router = useRouter();
  const labelId = useId();
  const [departement, setDepartement] = useState("06");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saved, setSaved] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const running = status.kind === "running";

  // Départ de la page (navigation dans le back-office) : l'import s'arrête.
  useEffect(() => {
    const ref = controller;
    return () => ref.current?.abort();
  }, []);

  // Fermeture de l'onglet pendant l'import : le navigateur demande confirmation.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.current) return;
    const code = departement.trim().toUpperCase();
    if (!isDepartementCode(code)) {
      setFieldError(t.errors.departement);
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setFieldError(null);
    setDepartement(code);
    setStatus({ kind: "running" });
    setStopping(false);
    setProgress(null);
    setSaved(0);
    try {
      await runImport(code, abort.signal, setProgress, setSaved);
      setStatus({ kind: abort.signal.aborted ? "stopped" : "done" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof ImportError ? error.message : t.errors.save,
      });
    } finally {
      controller.current = null;
      router.refresh();
    }
  }

  function stop() {
    setStopping(true);
    controller.current?.abort();
  }

  const percent = progress
    ? Math.round(
        ((progress.apeIndex + progress.page / progress.pages) / PROSPECT_APE_CODES.length) * 100,
      )
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={start} noValidate className="flex flex-col gap-4">
        <div className="sm:max-w-56">
          <Field
            label={t.departementLabel}
            name="departement"
            hint={t.departementHint}
            value={departement}
            onChange={(event) => setDepartement(event.target.value)}
            maxLength={3}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={running}
            errors={fieldError ? [fieldError] : undefined}
            required
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={running} className="sm:w-auto sm:px-6">
            {t.start}
          </Button>
          {running && (
            <Button
              type="button"
              variant="secondary"
              disabled={stopping}
              onClick={stop}
              className="sm:w-auto sm:px-6"
            >
              {t.stop}
            </Button>
          )}
        </div>
      </form>

      {running && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
            <span id={labelId} className="font-medium">
              {progress && t.running(progress.code, progress.page, progress.pages)}
            </span>
            <span className="tabular-nums text-muted-foreground">{t.progress(saved)}</span>
          </div>
          <div
            role="progressbar"
            aria-labelledby={labelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 overflow-hidden rounded-pill bg-primary-soft"
          >
            <div
              className="h-full rounded-pill bg-primary transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <Hint>{t.keepOpen}</Hint>
        </div>
      )}

      {status.kind === "done" && <Alert tone="success">{t.done(saved)}</Alert>}
      {status.kind === "stopped" && <Alert tone="info">{t.stopped(saved)}</Alert>}
      {status.kind === "error" && (
        <Alert tone="error">
          {status.message} {saved > 0 && t.progress(saved)}
        </Alert>
      )}
    </div>
  );
}
