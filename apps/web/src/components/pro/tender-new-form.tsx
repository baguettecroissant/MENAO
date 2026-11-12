"use client";

import {
  Check,
  FileSpreadsheet,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Map as MapIcon,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { startTransition, useActionState, useId, useState, type ReactNode } from "react";
import { ReadingScreen } from "@/components/pro/reading-screen";
import { Alert, Button, Field, FieldError } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createPlanTender, createTender } from "@/lib/artisan/tender-actions";
import { type FormState, initialFormState } from "@/lib/auth/form";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/upload/client";

const t = fr.pro.tenders;
const TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PLANS = 10;
/** Photo d'un plan : réduite et réencodée en JPEG avant l'envoi (5 Mo au plus pour le modèle). */
const PHOTO_SIDE = 2400;

export type TradeOption = { code: string; label: string };
type Mode = "dpgf" | "plans";

/**
 * Nouvel appel d'offres (ADR 0287, 0288, 0291), maquettes du lot 35 : le choix « J'ai le DPGF de
 * l'architecte » ou « J'ai seulement les plans » en deux cartes, les champs du projet, les fichiers
 * déposés (photo signalée), les lots à préparer en pastilles, et « Comment ça marche » à côté.
 * Les fichiers partent directement du navigateur dans le dossier privé de l'entreprise
 * (tender-files), puis la Server Action crée l'appel d'offres et fait lire le DPGF ou les plans.
 */
export function TenderNewForm({
  artisanId,
  trades = [],
  myTrades = [],
}: {
  artisanId: string;
  /** Métiers proposés pour les lots du DPGF créé depuis les plans. */
  trades?: readonly TradeOption[];
  /** Métiers de l'entreprise, cochés d'office. */
  myTrades?: readonly string[];
}) {
  const [mode, setMode] = useState<Mode>("dpgf");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-xl font-semibold">{t.newTitle}</h2>
        <div role="radiogroup" aria-label={t.modes.legend} className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            selected={mode === "dpgf"}
            title={t.modes.dpgf}
            hint={t.modes.dpgfHint}
            onSelect={() => setMode("dpgf")}
          />
          <ModeCard
            selected={mode === "plans"}
            title={t.modes.plans}
            hint={t.modes.plansHint}
            badge={t.modes.new}
            onSelect={() => setMode("plans")}
          />
        </div>
        {mode === "dpgf" ? (
          <DpgfTenderForm artisanId={artisanId} />
        ) : (
          <PlanTenderForm artisanId={artisanId} trades={trades} myTrades={myTrades} />
        )}
      </section>
      <HowItWorks mode={mode} />
    </div>
  );
}

function ModeCard({
  selected,
  title,
  hint,
  badge,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-card p-4 text-left transition-colors focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none ${
        selected
          ? "border-2 border-primary bg-primary-soft"
          : "border border-border bg-surface hover:bg-background"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 size-5 shrink-0 rounded-full bg-surface ${
          selected ? "border-[6px] border-primary" : "border-[1.5px] border-border-strong"
        }`}
      />
      <span className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[0.9375rem] font-semibold">{title}</span>
          {badge && (
            <span className="rounded-chip bg-surface px-2 py-0.5 text-xs font-bold text-primary-strong">
              {badge}
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/** « Comment ça marche » (maquette du lot 35), selon ce que l'architecte a envoyé. */
function HowItWorks({ mode }: { mode: Mode }) {
  const steps = mode === "plans" ? t.how.plans : t.how.dpgf;
  return (
    <aside className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-lg font-semibold">{t.how.title}</h2>
      <ol className="flex flex-col gap-3 text-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="w-4 shrink-0 font-bold text-primary-strong">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <HelpCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{mode === "plans" ? t.how.plansNote : t.responsibility}</span>
      </p>
    </aside>
  );
}

function ProjectFields({ state }: { state: FormState }) {
  const v = state.values;
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1.6fr_1.1fr]">
      <Field
        label={t.fields.name}
        name="name"
        required
        maxLength={160}
        placeholder={t.fields.namePlaceholder}
        defaultValue={v?.name}
        errors={state.fieldErrors?.name}
      />
      <Field label={t.fields.client} name="client" maxLength={160} defaultValue={v?.client} />
      <Field label={t.fields.dueShort} name="due" type="date" defaultValue={v?.due} />
    </div>
  );
}

/** Zone de dépôt en pointillés (maquette) : clic ou glisser-déposer. */
function DropZone({
  id,
  label,
  multiple,
  accept,
  title,
  hint,
  onFiles,
}: {
  id: string;
  /** Nom du champ de fichier (lecteurs d'écran). */
  label: string;
  multiple: boolean;
  accept: string;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-input border-[1.5px] border-dashed px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/60 ${
        over ? "border-primary bg-primary-softer" : "border-border-strong"
      }`}
    >
      <FolderOpen aria-hidden="true" className="size-5 shrink-0" />
      <span>
        <span className="font-semibold text-primary-strong">{title}</span> · {hint}
      </span>
      <input
        id={id}
        type="file"
        aria-label={label}
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function FileItem({
  icon,
  name,
  info,
  warn = false,
  onRemove,
  removeLabel,
}: {
  icon: ReactNode;
  name: string;
  info: string;
  warn?: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-input border border-border bg-surface px-3.5 py-2.5">
      <span
        aria-hidden="true"
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          warn ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary-strong"
        }`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span
          className={`text-xs ${warn ? "font-semibold text-warning" : "text-muted-foreground"}`}
        >
          {info}
        </span>
      </span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

function DpgfTenderForm({ artisanId }: { artisanId: string }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(createTender, initialFormState);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;

  async function submit(formData: FormData) {
    setFileError(null);
    const extension = file ? file.name.toLowerCase().split(".").pop() : null;
    // Excel, ou PDF lu par l'IA (ADR 0288).
    const kind = extension === "xlsx" || extension === "pdf" ? extension : null;
    if (!file || file.size === 0 || !kind) {
      setFileError(t.errors.file ?? null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(t.errors.tooLarge ?? null);
      return;
    }
    setUploading(true);
    const path = `${artisanId}/${crypto.randomUUID()}.${kind}`;
    const { error } = await createClient()
      .storage.from("tender-files")
      .upload(path, file, { contentType: TYPES[kind], upsert: false });
    setUploading(false);
    if (error) {
      setFileError(t.errors.upload ?? null);
      return;
    }
    formData.set("path", path);
    formData.set("fileName", file.name.slice(0, 200));
    // Après l'envoi du fichier (await) : on repasse dans une transition pour l'action.
    startTransition(() => formAction(formData));
  }

  return (
    <form action={submit} className="flex flex-col gap-5">
      {/* Un PDF est lu par l'IA (environ une minute) ; un Excel est repris en quelques secondes. */}
      {busy && (
        <ReadingScreen
          kind="dpgf"
          uploading={uploading}
          quick={!file?.name.toLowerCase().endsWith(".pdf")}
        />
      )}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <ProjectFields state={state} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.fields.file}</span>
        {file ? (
          <ul>
            <FileItem
              icon={<FileSpreadsheet className="size-4" />}
              name={file.name}
              info={`${file.name.toLowerCase().endsWith(".pdf") ? t.drop.pdfDpgf : t.drop.xlsx} · ${sizeLabel(file.size)}`}
              onRemove={() => setFile(null)}
              removeLabel={t.drop.remove(file.name)}
            />
          </ul>
        ) : (
          <DropZone
            id={`${id}-dpgf`}
            label={t.fields.file}
            multiple={false}
            accept=".xlsx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
            title={t.drop.choose}
            hint={t.drop.dpgfHint}
            onFiles={(files) => setFile(files[0] ?? null)}
          />
        )}
        {(fileError ?? state.fieldErrors?.file?.[0]) && (
          <FieldError>{fileError ?? state.fieldErrors?.file?.[0]}</FieldError>
        )}
        <p className="text-sm text-muted-foreground">{t.fields.fileHint}</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy} block={false}>
          <Sparkles aria-hidden="true" className="size-4" />
          {busy ? t.reading : t.submit}
        </Button>
      </div>
    </form>
  );
}

/** Extension retenue pour un plan : PDF tel quel, photos réencodées en JPEG. */
function planKind(file: File): "pdf" | "jpg" | null {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (extension === "pdf" || file.type === "application/pdf") return "pdf";
  if (["jpg", "jpeg", "png"].includes(extension) || /^image\/(jpeg|png)$/.test(file.type)) {
    return "jpg";
  }
  return null;
}

function PlanTenderForm({
  artisanId,
  trades,
  myTrades,
}: {
  artisanId: string;
  trades: readonly TradeOption[];
  myTrades: readonly string[];
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState(createPlanTender, initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [chosen, setChosen] = useState<string[]>(() => [...myTrades]);
  const [showOthers, setShowOthers] = useState(myTrades.length === 0);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;
  const mine = trades.filter((tr) => myTrades.includes(tr.code));
  const others = trades.filter((tr) => !myTrades.includes(tr.code));

  function addFiles(added: File[]) {
    setFileError(null);
    const valid = added.filter((f) => planKind(f));
    if (valid.length < added.length) setFileError(t.plan.errors.files);
    setFiles((current) => [...current, ...valid].slice(0, MAX_PLANS));
    if (files.length + valid.length > MAX_PLANS) setFileError(t.plan.errors.tooMany);
  }

  async function submit(formData: FormData) {
    setFileError(null);
    if (files.length === 0) {
      setFileError(t.plan.errors.files);
      return;
    }
    if (files.some((f) => f.size > MAX_BYTES)) {
      setFileError(t.plan.errors.tooLarge);
      return;
    }
    if (chosen.length === 0) {
      setFileError(t.plan.errors.trades);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const uploaded: { path: string; name: string }[] = [];
    for (const file of files) {
      const kind = planKind(file);
      if (!kind) continue;
      const body = kind === "pdf" ? file : await resizeImage(file, PHOTO_SIDE, { quality: 0.9 });
      const path = `${artisanId}/${crypto.randomUUID()}.${kind}`;
      const { error } = await supabase.storage.from("tender-files").upload(path, body, {
        contentType: kind === "pdf" ? "application/pdf" : "image/jpeg",
        upsert: false,
      });
      if (error) {
        // Fichiers déjà envoyés retirés : rien ne reste sans appel d'offres.
        if (uploaded.length) {
          await supabase.storage.from("tender-files").remove(uploaded.map((u) => u.path));
        }
        setUploading(false);
        setFileError(t.errors.upload ?? null);
        return;
      }
      uploaded.push({ path, name: file.name.slice(0, 200) });
    }
    setUploading(false);
    formData.set("files", JSON.stringify(uploaded));
    formData.delete("trades");
    for (const code of chosen) formData.append("trades", code);
    startTransition(() => formAction(formData));
  }

  const toggle = (code: string) =>
    setChosen((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));
  const tradeChip = (tr: TradeOption) => {
    const on = chosen.includes(tr.code);
    return (
      <button
        key={tr.code}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => toggle(tr.code)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-input border px-3 text-sm font-semibold transition-colors ${
          on ? "border-primary/30 bg-primary-soft" : "border-border bg-surface hover:bg-background"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex size-5 items-center justify-center rounded-md ${
            on ? "bg-primary text-white" : "border-[1.5px] border-border-strong bg-surface"
          }`}
        >
          {on && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        {tr.label}
      </button>
    );
  };
  const message = fileError ?? state.fieldErrors?.files?.[0] ?? state.fieldErrors?.trades?.[0];

  return (
    <form action={submit} className="flex flex-col gap-5">
      {busy && <ReadingScreen kind="plan" uploading={uploading} />}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <ProjectFields state={state} />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t.plan.files}</span>
        {files.length > 0 && (
          <ul className="flex flex-col gap-2">
            {files.map((file, i) => {
              const pdf = planKind(file) === "pdf";
              return (
                <FileItem
                  key={`${file.name}-${i}`}
                  icon={pdf ? <MapIcon className="size-4" /> : <ImageIcon className="size-4" />}
                  name={file.name}
                  info={pdf ? `${t.drop.pdfPlan} · ${sizeLabel(file.size)}` : t.drop.photo}
                  warn={!pdf}
                  onRemove={() => setFiles((list) => list.filter((_, j) => j !== i))}
                  removeLabel={t.drop.remove(file.name)}
                />
              );
            })}
          </ul>
        )}
        <DropZone
          id={`${id}-plans`}
          label={t.plan.files}
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          title={files.length ? t.drop.addPlan : t.drop.choosePlans}
          hint={t.drop.plansHint}
          onFiles={addFiles}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{t.plan.trades}</legend>
        <p className="text-sm text-muted-foreground">{t.plan.tradesHint}</p>
        <div className="flex flex-wrap gap-2">
          {mine.map(tradeChip)}
          {showOthers && others.map(tradeChip)}
          {!showOthers && others.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOthers(true)}
              className="inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-semibold text-primary-strong"
            >
              <Plus aria-hidden="true" className="size-4" />
              {t.plan.otherTrades}
            </button>
          )}
        </div>
      </fieldset>
      {message && <FieldError>{message}</FieldError>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{t.plan.duration}</span>
        <Button type="submit" disabled={busy} block={false}>
          <Sparkles aria-hidden="true" className="size-4" />
          {busy ? t.plan.reading : t.plan.submit}
        </Button>
      </div>
    </form>
  );
}
