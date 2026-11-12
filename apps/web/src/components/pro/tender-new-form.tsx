"use client";

import { FileSpreadsheet, Map as MapIcon } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Alert, Button, Field, FieldError, RadioGroup } from "@/components/ui";
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

/**
 * Nouvel appel d'offres (ADR 0287, 0288, 0291) : le DPGF de l'architecte (Excel ou PDF), ou
 * seulement ses plans (PDF ou photos). Les fichiers partent directement du navigateur dans le
 * dossier privé de l'entreprise (tender-files), puis la Server Action crée l'appel d'offres et
 * fait lire le DPGF ou les plans.
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
  const [mode, setMode] = useState<"dpgf" | "plans">("dpgf");
  return (
    <div className="flex flex-col gap-5">
      <RadioGroup
        legend={t.modes.legend}
        name="mode"
        value={mode}
        onChange={(value) => setMode(value === "plans" ? "plans" : "dpgf")}
        options={[
          { value: "dpgf", label: t.modes.dpgf, description: t.modes.dpgfHint },
          { value: "plans", label: t.modes.plans, description: t.modes.plansHint },
        ]}
      />
      {mode === "dpgf" ? (
        <DpgfTenderForm artisanId={artisanId} />
      ) : (
        <PlanTenderForm artisanId={artisanId} trades={trades} myTrades={myTrades} />
      )}
    </div>
  );
}

function ProjectFields({ state }: { state: FormState }) {
  const v = state.values;
  return (
    <>
      <Field
        label={t.fields.name}
        name="name"
        required
        maxLength={160}
        placeholder={t.fields.namePlaceholder}
        defaultValue={v?.name}
        errors={state.fieldErrors?.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.fields.client}
          labelNote={t.fields.clientNote}
          name="client"
          maxLength={160}
          defaultValue={v?.client}
        />
        <Field
          label={t.fields.due}
          labelNote={t.fields.dueNote}
          name="due"
          type="date"
          defaultValue={v?.due}
        />
      </div>
    </>
  );
}

function DpgfTenderForm({ artisanId }: { artisanId: string }) {
  const [state, formAction, pending] = useActionState(createTender, initialFormState);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;

  async function submit(formData: FormData) {
    setFileError(null);
    const file = formData.get("file");
    const extension = file instanceof File ? file.name.toLowerCase().split(".").pop() : null;
    // Excel, ou PDF lu par l'IA (ADR 0288).
    const kind = extension === "xlsx" || extension === "pdf" ? extension : null;
    if (!(file instanceof File) || file.size === 0 || !kind) {
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
    formData.delete("file");
    formData.set("path", path);
    formData.set("fileName", file.name.slice(0, 200));
    // Après l'envoi du fichier (await) : on repasse dans une transition pour l'action.
    startTransition(() => formAction(formData));
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <ProjectFields state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tender-file" className="text-sm font-semibold">
          {t.fields.file}
        </label>
        <label
          htmlFor="tender-file"
          className="flex cursor-pointer items-center gap-3 rounded-input border border-dashed border-border-strong bg-background px-4 py-4 text-sm text-label hover:border-primary/50"
        >
          <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
          <input
            id="tender-file"
            name="file"
            type="file"
            required
            accept=".xlsx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
            aria-describedby="tender-file-hint"
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary-strong"
          />
        </label>
        {(fileError ?? state.fieldErrors?.file?.[0]) && (
          <FieldError>{fileError ?? state.fieldErrors?.file?.[0]}</FieldError>
        )}
        <p id="tender-file-hint" className="text-sm text-muted-foreground">
          {t.fields.fileHint}
        </p>
      </div>
      <Button type="submit" disabled={busy} block={false} className="self-end">
        {busy ? t.reading : t.submit}
      </Button>
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
  const [state, formAction, pending] = useActionState(createPlanTender, initialFormState);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;
  const mine = trades.filter((tr) => myTrades.includes(tr.code));
  const others = trades.filter((tr) => !myTrades.includes(tr.code));

  async function submit(formData: FormData) {
    setFileError(null);
    const chosen = formData
      .getAll("plans")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (chosen.length === 0 || chosen.some((f) => !planKind(f))) {
      setFileError(t.plan.errors.files);
      return;
    }
    if (chosen.length > MAX_PLANS) {
      setFileError(t.plan.errors.tooMany);
      return;
    }
    if (chosen.some((f) => f.size > MAX_BYTES)) {
      setFileError(t.plan.errors.tooLarge);
      return;
    }
    if (formData.getAll("trades").length === 0) {
      setFileError(t.plan.errors.trades);
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const uploaded: { path: string; name: string }[] = [];
    for (const file of chosen) {
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
    formData.delete("plans");
    formData.set("files", JSON.stringify(uploaded));
    startTransition(() => formAction(formData));
  }

  const tradeBox = (tr: TradeOption, checked: boolean) => (
    <label
      key={tr.code}
      className="flex min-h-11 items-center gap-2.5 rounded-input border border-border bg-surface px-3 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary-softer"
    >
      <input
        type="checkbox"
        name="trades"
        value={tr.code}
        defaultChecked={checked}
        className="size-[1.125rem] shrink-0 accent-primary"
      />
      {tr.label}
    </label>
  );
  const message = fileError ?? state.fieldErrors?.files?.[0] ?? state.fieldErrors?.trades?.[0];

  return (
    <form action={submit} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <ProjectFields state={state} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tender-plans" className="text-sm font-semibold">
          {t.plan.files}
        </label>
        <label
          htmlFor="tender-plans"
          className="flex cursor-pointer items-center gap-3 rounded-input border border-dashed border-border-strong bg-background px-4 py-4 text-sm text-label hover:border-primary/50"
        >
          <MapIcon aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
          <input
            id="tender-plans"
            name="plans"
            type="file"
            multiple
            required
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-describedby="tender-plans-hint"
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-button file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary-strong"
          />
        </label>
        <p id="tender-plans-hint" className="text-sm text-muted-foreground">
          {t.plan.filesHint}
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">{t.plan.trades}</legend>
        <p className="text-sm text-muted-foreground">{t.plan.tradesHint}</p>
        <div className="grid gap-2 sm:grid-cols-3">{mine.map((tr) => tradeBox(tr, true))}</div>
        {others.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-primary-strong">
              {t.plan.otherTrades}
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {others.map((tr) => tradeBox(tr, false))}
            </div>
          </details>
        )}
      </fieldset>
      {message && <FieldError>{message}</FieldError>}
      <Button type="submit" disabled={busy} block={false} className="self-end">
        {busy ? t.plan.reading : t.plan.submit}
      </Button>
    </form>
  );
}
