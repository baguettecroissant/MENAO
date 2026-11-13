"use client";

import { type ImportKind, type ImportRole, importRolesFor } from "@menao/core";
import { Check, CircleCheck, Upload } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { Alert, Button, Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  type CatalogCheck,
  type CatalogReading,
  checkCatalog,
  discardCatalog,
  importCatalog,
  readCatalog,
} from "@/lib/artisan/library-import-actions";
import { createClient } from "@/lib/supabase/client";

const t = fr.pro.library.importer;
const units = fr.pro.quote.unitsShort as Record<string, string>;
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const money = (cents: number) => euros.format(cents / 100);
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
} as const;

type File1 = { path: string; name: string };

/**
 * Import du catalogue (F-148, ADR 0310, maquette lot 42) : fichier déposé dans l'espace privé de
 * l'entreprise, colonnes reconnues et modifiables, vérification, puis import d'un bloc.
 */
export function LibraryImport({
  artisanId,
  initialKind,
}: {
  artisanId: string;
  initialKind: ImportKind;
}) {
  const [kind, setKind] = useState<ImportKind>(initialKind);
  const [file, setFile] = useState<File1 | null>(null);
  const [reading, setReading] = useState<CatalogReading | null>(null);
  const [roles, setRoles] = useState<ImportRole[]>([]);
  const [check, setCheck] = useState<CatalogCheck | null>(null);
  const [update, setUpdate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const step = check ? 3 : reading ? 2 : 1;
  const fail = (code: string) => setError(t.errors[code] ?? t.errors.generic ?? null);

  async function onFile(chosen: File | undefined) {
    if (!chosen) return;
    setError(null);
    const ext = chosen.name.toLowerCase().endsWith(".csv")
      ? "csv"
      : chosen.name.toLowerCase().endsWith(".xlsx")
        ? "xlsx"
        : null;
    if (!ext) return fail("type");
    if (chosen.size > MAX_BYTES) return fail("size");
    start(async () => {
      const path = `${artisanId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await createClient()
        .storage.from("library-imports")
        .upload(path, chosen, { contentType: TYPES[ext], upsert: false });
      if (uploadError) return fail("upload");
      const result = await readCatalog(path, kind);
      if (!result.ok) {
        await discardCatalog(path);
        return fail(result.error);
      }
      setFile({ path, name: chosen.name });
      setReading(result.data);
      setRoles(result.data.columns.map((c) => c.role));
    });
  }

  function changeFile() {
    if (file) void discardCatalog(file.path);
    setFile(null);
    setReading(null);
    setCheck(null);
    setError(null);
  }

  function setRole(index: number, role: ImportRole) {
    setRoles((list) =>
      list.map((r, i) => (i === index ? role : role !== "ignore" && r === role ? "ignore" : r)),
    );
  }

  const ready = roles.includes("designation") && roles.includes("price");
  const onCheck = () =>
    start(async () => {
      if (!file || !reading) return;
      setError(null);
      const result = await checkCatalog(file.path, kind, reading.headerRow, roles);
      if (!result.ok) return fail(result.error);
      setCheck(result.data);
    });
  const onImport = () =>
    start(async () => {
      if (!file || !reading) return;
      setError(null);
      const result = await importCatalog(file.path, kind, reading.headerRow, roles, update);
      if (result && !result.ok) fail(result.error);
    });

  return (
    <div className="flex flex-col gap-5">
      <Steps step={step} />
      {error && <Alert tone="error">{error}</Alert>}
      {step === 1 && (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
          <Card className="flex flex-col gap-4">
            <CardTitle title={t.kindTitle} />
            <div
              role="radiogroup"
              aria-label={t.kindTitle}
              className="flex flex-wrap gap-1 self-start rounded-pill border border-border bg-surface p-1"
            >
              {(["ouvrages", "fournitures"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className="min-h-10 rounded-pill px-4 text-sm font-medium aria-checked:bg-foreground aria-checked:font-semibold aria-checked:text-surface"
                >
                  {t.kinds[k]}
                </button>
              ))}
            </div>
            <DropZone busy={pending} onFile={onFile} />
            <p className="rounded-input bg-background px-3 py-2.5 text-sm text-muted-foreground">
              {t.dropNote}
            </p>
          </Card>
          <Card className="flex flex-col gap-2.5">
            <CardTitle title={t.knownTitle} description={t.knownLead} />
            <dl className="text-sm">
              {t.known.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 border-t border-border py-2 first:border-t-0"
                >
                  <dt className="font-semibold">{k}</dt>
                  <dd className="text-right text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {step === 2 && reading && file && (
        <>
          <p
            role="status"
            className="flex items-center gap-3.5 rounded-card bg-success-soft px-[1.125rem] py-3.5 text-[0.90625rem]"
          >
            <CircleCheck aria-hidden="true" className="size-[1.375rem] shrink-0 text-success" />
            <span>
              <b>
                {t.recognizedBanner(
                  reading.columns.filter((c) => c.recognized).length,
                  reading.columns.length,
                )}
              </b>{" "}
              {t.recognizedNext}
            </span>
          </p>
          {reading.tooLong && <Alert tone="info">{t.tooLong}</Alert>}
          <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
              <h2 className="text-lg font-semibold">{t.fileSummary(file.name, reading.total)}</h2>
              <span className="text-[0.8125rem] text-muted-foreground">
                {t.sheetInfo(reading.sheet, reading.headerRow)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background">
                  <tr>
                    {reading.columns.map((c, i) => (
                      <th key={c.letter} scope="col" className="min-w-36 px-2.5 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {t.column(c.letter, c.title)}
                          </span>
                          <select
                            aria-label={t.roleOf(c.letter)}
                            value={roles[i] ?? "ignore"}
                            onChange={(e) => setRole(i, e.target.value as ImportRole)}
                            className={`min-h-[2.375rem] rounded-input border bg-surface px-2.5 text-sm font-semibold ${
                              roles[i] !== "ignore"
                                ? "border-border-strong text-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {importRolesFor(kind).map((r) => (
                              <option key={r} value={r}>
                                {t.roles[r === "price" ? `price_${kind}` : r]}
                              </option>
                            ))}
                          </select>
                          {roles[i] !== "ignore" && c.recognized && roles[i] === c.role ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                              <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                              {t.recognized}
                            </span>
                          ) : roles[i] === "ignore" ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                              {t.unused}
                            </span>
                          ) : (
                            <span className="text-xs">&nbsp;</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reading.preview.map((row, r) => (
                    <tr key={r} className="border-t border-border">
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={`px-2.5 py-2.5 ${roles[i] === "ignore" ? "text-muted-foreground" : ""}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border px-4 py-3 text-[0.8125rem] text-muted-foreground">
              {t.previewCount(reading.preview.length, reading.total)}
            </p>
          </section>
          {!ready && <p className="text-sm text-warning">{t.needColumns}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              block={false}
              onClick={changeFile}
              disabled={pending}
            >
              {t.changeFile}
            </Button>
            <Button type="button" block={false} onClick={onCheck} disabled={pending || !ready}>
              {t.next}
            </Button>
          </div>
        </>
      )}

      {step === 3 && check && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Figure value={check.fresh} label={t.figures.fresh(kind)} />
            <Figure value={check.existing} label={t.figures.existing} />
            <Figure value={check.issueCount} label={t.figures.issues} warn />
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="flex min-w-0 flex-col gap-[1.125rem]">
              {check.existing > 0 && (
                <Card className="flex flex-col gap-3">
                  <CardTitle
                    title={t.existingTitle(check.existing, kind)}
                    description={t.existingLead}
                  />
                  <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                    <Choice
                      on={update}
                      onSelect={() => setUpdate(true)}
                      title={t.update}
                      hint={t.updateHint(kind)}
                    />
                    <Choice
                      on={!update}
                      onSelect={() => setUpdate(false)}
                      title={t.keep}
                      hint={t.keepHint}
                    />
                  </div>
                </Card>
              )}
              {check.issueCount > 0 && (
                <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                  <div className="px-4 py-4">
                    <h2 className="text-lg font-semibold">{t.issuesTitle(check.issueCount)}</h2>
                    <p className="mt-1 text-[0.84375rem] text-muted-foreground">{t.issuesLead}</p>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {check.issues.map((issue) => (
                        <tr key={issue.line} className="border-t border-border">
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                            {t.line(issue.line)}
                          </td>
                          <td className="px-2 py-2.5 font-semibold">{issue.designation || "—"}</td>
                          <td className="px-4 py-2.5 text-warning">
                            {t.reasons[issue.reason]?.(issue.value) ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {check.issueCount > check.issues.length && (
                    <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                      {t.issuesMore(check.issueCount - check.issues.length)}
                    </p>
                  )}
                </section>
              )}
            </div>
            <Card className="flex flex-col gap-2.5">
              <CardTitle title={t.summaryTitle} />
              {check.fresh + check.existing === 0 ? (
                <p className="text-sm text-muted-foreground">{t.nothing}</p>
              ) : (
                <>
                  <dl className="text-sm">
                    {check.sample.map((s) => (
                      <div
                        key={`${s.designation}-${s.unit}`}
                        className="flex justify-between gap-3 border-t border-border py-2 first:border-t-0"
                      >
                        <dt>{s.designation}</dt>
                        <dd className="font-bold whitespace-nowrap">
                          {money(s.priceCents)} / {units[s.unit] ?? s.unit}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-[0.8125rem] text-muted-foreground">
                    {[
                      t.summaryMore(check.fresh - check.sample.length),
                      kind === "ouvrages" ? t.vatNote : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                  <Button
                    type="button"
                    onClick={onImport}
                    disabled={pending || (check.fresh === 0 && !(update && check.existing > 0))}
                  >
                    {check.fresh === 0
                      ? t.updateButton(check.existing)
                      : t.importButton(check.fresh, kind)}
                  </Button>
                  {update && check.existing > 0 && (
                    <p className="text-center text-[0.78125rem] text-muted-foreground">
                      {t.updateNote(check.existing)}
                    </p>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setCheck(null)}
                className="self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                ← {t.back}
              </button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Steps({ step }: { step: number }) {
  return (
    <ol aria-label={t.stepsLabel} className="flex flex-wrap items-center gap-3">
      {t.steps.map((name, i) => {
        const n = i + 1;
        const done = n < step;
        const on = n === step;
        return (
          <li key={name} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden="true" className="h-px w-9 bg-border-strong" />}
            <span
              aria-current={on ? "step" : undefined}
              className={`inline-flex items-center gap-2 text-sm ${on ? "font-bold" : "font-medium"} ${on || done ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-[0.78125rem] font-bold ${
                  on
                    ? "bg-foreground text-surface"
                    : done
                      ? "bg-success text-surface"
                      : "border-[1.5px] border-border-strong bg-surface text-muted-foreground"
                }`}
              >
                {done ? <Check aria-hidden="true" className="size-3" strokeWidth={3} /> : n}
              </span>
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DropZone({ busy, onFile }: { busy: boolean; onFile: (file: File | undefined) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) onFile(e.dataTransfer.files[0]);
      }}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed px-6 py-11 text-center ${
        over ? "border-primary bg-primary-softer" : "border-border-strong bg-background"
      }`}
    >
      <span className="inline-flex size-[3.25rem] items-center justify-center rounded-[14px] border border-border bg-surface">
        <Upload aria-hidden="true" className="size-6" />
      </span>
      <b className="text-[1.0625rem]">{busy ? t.reading : t.drop}</b>
      <span className="text-sm text-muted-foreground">{t.dropHint}</span>
      <span className="inline-flex min-h-[2.625rem] items-center rounded-pill bg-foreground px-[1.125rem] text-sm font-semibold text-surface">
        {t.choose}
      </span>
      <input
        type="file"
        aria-label={t.fileLabel}
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Figure({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-card px-[1.125rem] py-4 ${
        warn && value > 0 ? "bg-warning-soft" : "border border-border bg-surface"
      }`}
    >
      <b className={`text-[1.875rem] leading-tight ${warn && value > 0 ? "text-warning" : ""}`}>
        {value}
      </b>
      <span className="text-sm text-label">{label}</span>
    </div>
  );
}

function Choice({
  on,
  onSelect,
  title,
  hint,
}: {
  on: boolean;
  onSelect: () => void;
  title: string;
  hint: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-input bg-surface px-3.5 py-3 text-left ${
        on ? "border-2 border-foreground" : "border border-border"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 size-[1.125rem] shrink-0 rounded-full ${
          on ? "border-[5px] border-foreground" : "border-[1.5px] border-border-strong"
        }`}
      />
      <span className="flex flex-col gap-0.5">
        <b className="text-[0.90625rem]">{title}</b>
        <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
