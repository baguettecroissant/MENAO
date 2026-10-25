import {
  EXPENSE_CATEGORIES,
  EXPENSE_KINDS,
  EXPENSE_LIMITS,
  formatEurosInput,
  parisToday,
  parseEuros,
  type ExpenseLinePrefill,
  type ExpensePrefill,
  type ExpenseReadingWarning,
} from "@menao/core";
import { expenseFormSchema } from "@menao/validation";
import { router } from "expo-router";
import { Camera, FileText, ImageIcon, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import {
  depositPhoto,
  discardDeposit,
  pickDocumentFile,
  pickPhotos,
  type PickedPhoto,
} from "@/lib/photos";
import { readExpense, saveExpense } from "@/lib/pro-expenses";
import { Body, Button, Card, Checkbox, Chip, Notice, Tappable, TextField, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { ExpenseLines } from "./expense-parts";

const t = fr.proExpenses;
const f = t.form;
const { colors, font, radius, spacing } = theme;
/** Les pièces peuvent être anciennes : le calendrier remonte loin. */
const MIN_DATE = "2000-01-01";

/** Valeurs du formulaire, en texte (montants « 435,00 »), comme sur le site. */
export type ExpenseFormValues = {
  title: string;
  supplierName: string;
  reference: string;
  kind: string;
  category: string;
  issuedOn: string;
  dueOn: string;
  paidOn: string;
  paid: boolean;
  chantierId: string;
  totalHt: string;
  totalTva: string;
  notes: string;
};

type Reading =
  | { step: "reading" }
  | { step: "done"; filled: boolean; warnings: ExpenseReadingWarning[] }
  | { step: "failed" };

/** Champs lus par read-expense → valeurs du formulaire (les champs non lus restent tels quels). */
function applyPrefill(values: ExpenseFormValues, fields: ExpensePrefill): ExpenseFormValues {
  return {
    ...values,
    ...(fields.title && { title: fields.title }),
    ...(fields.supplierName && { supplierName: fields.supplierName }),
    ...(fields.reference && { reference: fields.reference }),
    ...(fields.kind && { kind: fields.kind }),
    ...(fields.category && { category: fields.category }),
    ...(fields.issuedOn && { issuedOn: fields.issuedOn }),
    ...(fields.dueOn && { dueOn: fields.dueOn }),
    ...(fields.totalHtCents !== undefined && { totalHt: formatEurosInput(fields.totalHtCents) }),
    ...(fields.totalTvaCents !== undefined && { totalTva: formatEurosInput(fields.totalTvaCents) }),
  };
}

/**
 * Formulaire d'une dépense (F-62), comme sur le site : la pièce d'abord (appareil photo,
 * photothèque ou PDF), déposée et lue par l'IA pour pré-remplir les champs, que l'artisan vérifie ;
 * puis le chantier et le paiement. La pièce est rangée à l'enregistrement.
 */
export function ExpenseFormView({
  expenseId,
  initial,
  initialLines,
  hasDocument,
  chantiers,
}: {
  expenseId: string | null;
  initial: ExpenseFormValues;
  initialLines: ExpenseLinePrefill[];
  hasDocument: boolean;
  chantiers: { id: string; label: string }[];
}) {
  const [values, setValues] = useState(initial);
  const [lines, setLines] = useState(initialLines);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Pièce déposée dès qu'elle est choisie, pour sa lecture, puis réutilisée à l'enregistrement ;
  // retirée si elle est remplacée ou si l'écran est quitté sans enregistrer.
  const deposit = useRef<{ photo: PickedPhoto; path: Promise<string | null> } | null>(null);
  const saved = useRef(false);

  useEffect(
    () => () => {
      if (saved.current) return;
      void deposit.current?.path.then((path) => (path ? discardDeposit(path) : undefined));
    },
    [],
  );

  const set = <K extends keyof ExpenseFormValues>(name: K, value: ExpenseFormValues[K]) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function pick(source: "camera" | "library" | "file") {
    setFailure(null);
    const picked = source === "file" ? await pickDocumentFile() : await pickPhotos(source, 1);
    if ("error" in picked) return setFailure(picked.error);
    const chosen = picked.photos[0];
    if (!chosen) return;
    setPhoto(chosen);
    const previous = deposit.current;
    const path = depositPhoto("expense_document", chosen).then((result) =>
      "path" in result ? result.path : null,
    );
    deposit.current = { photo: chosen, path };
    void previous?.path.then((old) => (old ? discardDeposit(old) : undefined));
    setReading({ step: "reading" });
    const deposited = await path;
    if (deposit.current?.photo !== chosen) return;
    if (!deposited) {
      setReading(null);
      setPhoto(null);
      deposit.current = null;
      return setFailure(f.document.failed);
    }
    const result = await readExpense(deposited);
    if (deposit.current?.photo !== chosen) return;
    if (result.status !== "ok") return setReading({ step: "failed" });
    const filled = Object.keys(result.fields).length > 1 || result.lines.length > 0;
    setValues((current) => applyPrefill(current, result.fields));
    if (filled) setLines(result.lines);
    setReading({ step: "done", filled, warnings: result.warnings });
  }

  function removePhoto() {
    void deposit.current?.path.then((path) => (path ? discardDeposit(path) : undefined));
    deposit.current = null;
    setPhoto(null);
    setReading(null);
  }

  async function save() {
    setFailure(null);
    const paidOn = values.paid ? values.paidOn || parisToday() : "";
    const { paid: _paid, ...fields } = values;
    const parsed = expenseFormSchema.safeParse({ ...fields, paidOn });
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[] | undefined
      >;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])));
      return;
    }
    setErrors({});
    setSaving(true);
    const documentPath = deposit.current ? await deposit.current.path : null;
    const result = await saveExpense(
      expenseId,
      parsed.data,
      lines.slice(0, EXPENSE_LIMITS.maxLines),
      documentPath,
    );
    setSaving(false);
    if (!result) return setFailure(f.error);
    saved.current = true;
    if (result.documentFailed) toast.error(f.documentFailed);
    router.replace(`/pro-depense/${result.id}`);
  }

  const ht = parseEuros(values.totalHt);
  const tva = parseEuros(values.totalTva);
  const ttc = ht !== null && tva !== null ? ht + tva : null;

  return (
    <>
      <Card>
        <Text style={styles.cardTitle}>{f.document.title}</Text>
        <Body muted>{f.document.lead}</Body>
        <Button
          label={f.document.camera}
          variant="secondary"
          icon={Camera}
          disabled={reading?.step === "reading"}
          onPress={() => void pick("camera")}
        />
        <Button
          label={f.document.library}
          variant="secondary"
          icon={ImageIcon}
          disabled={reading?.step === "reading"}
          onPress={() => void pick("library")}
        />
        <Button
          label={f.document.file}
          variant="secondary"
          icon={FileText}
          disabled={reading?.step === "reading"}
          onPress={() => void pick("file")}
        />
        {photo ? (
          <View style={styles.chosen}>
            {photo.pdf ? (
              <Text style={styles.chosenText}>{f.document.chosenPdf(photo.pdf.name)}</Text>
            ) : (
              <Image
                source={{ uri: photo.uri }}
                style={styles.thumbnail}
                accessibilityLabel={f.document.chosen}
              />
            )}
            <Tappable
              role="button"
              aria-label={f.document.remove}
              onPress={removePhoto}
              hitSlop={8}
              style={styles.removePhoto}
            >
              <X size={18} color={colors["muted-foreground"]} />
            </Tappable>
          </View>
        ) : hasDocument ? (
          <Body muted>{f.document.current}</Body>
        ) : null}
        {reading?.step === "reading" ? <Notice tone="info">{f.reading.progress}</Notice> : null}
        {reading?.step === "failed" ? <Notice tone="info">{f.reading.failed}</Notice> : null}
        {reading?.step === "done" && reading.filled ? (
          <Notice tone="success">{f.reading.done}</Notice>
        ) : null}
        {reading?.step === "done"
          ? reading.warnings.map((warning) => (
              <Notice key={warning} tone="info">
                {f.reading.warnings[warning]}
              </Notice>
            ))
          : null}
      </Card>

      <Card>
        <TextField
          label={f.fields.title}
          value={values.title}
          onChangeText={(value) => set("title", value)}
          maxLength={EXPENSE_LIMITS.titleMaxLength}
          hint={f.fields.titleHint}
          error={errors.title}
        />
        <TextField
          label={f.fields.supplier}
          value={values.supplierName}
          onChangeText={(value) => set("supplierName", value)}
          maxLength={EXPENSE_LIMITS.supplierMaxLength}
          error={errors.supplierName}
        />
        <TextField
          label={f.fields.reference}
          value={values.reference}
          onChangeText={(value) => set("reference", value)}
          maxLength={EXPENSE_LIMITS.referenceMaxLength}
          autoCapitalize="characters"
          error={errors.reference}
        />
        <Text style={styles.label}>{f.fields.kind}</Text>
        <View style={styles.chips}>
          {EXPENSE_KINDS.map((kind) => (
            <Chip
              key={kind}
              label={t.kinds[kind]}
              selected={values.kind === kind}
              onPress={() => set("kind", kind)}
            />
          ))}
        </View>
        <Text style={styles.label}>{f.fields.category}</Text>
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={t.categories[category]}
              selected={values.category === category}
              onPress={() => set("category", values.category === category ? "" : category)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <TextField
          label={f.fields.totalHt}
          value={values.totalHt}
          onChangeText={(value) => set("totalHt", value)}
          keyboardType="decimal-pad"
          error={errors.totalHt}
        />
        <TextField
          label={f.fields.totalTva}
          value={values.totalTva}
          onChangeText={(value) => set("totalTva", value)}
          keyboardType="decimal-pad"
          error={errors.totalTva}
        />
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{f.fields.totalTtc}</Text>
          <Text style={styles.totalValue}>{ttc === null ? "—" : formatCents(ttc)}</Text>
        </View>
        <DateTimeFields
          date={values.issuedOn || null}
          minDate={MIN_DATE}
          onDate={(date) => set("issuedOn", date)}
          dateLabel={f.fields.issuedOn}
          error={errors.issuedOn}
          compact
        />
        {values.dueOn ? (
          <>
            <DateTimeFields
              date={values.dueOn}
              minDate={values.issuedOn || MIN_DATE}
              onDate={(date) => set("dueOn", date)}
              dateLabel={f.fields.dueOn}
              error={errors.dueOn}
              compact
            />
            <Button label={f.fields.dueOnRemove} variant="ghost" onPress={() => set("dueOn", "")} />
          </>
        ) : (
          <Button
            label={f.fields.dueOnAdd}
            variant="ghost"
            onPress={() => set("dueOn", values.issuedOn || parisToday())}
          />
        )}
      </Card>

      <Card>
        <Text style={styles.label}>{f.fields.chantier}</Text>
        <View style={styles.chips}>
          <Chip
            label={f.fields.chantierNone}
            selected={values.chantierId === ""}
            onPress={() => set("chantierId", "")}
          />
          {chantiers.map((chantier) => (
            <Chip
              key={chantier.id}
              label={chantier.label}
              selected={values.chantierId === chantier.id}
              onPress={() => set("chantierId", chantier.id)}
            />
          ))}
        </View>
        <Checkbox
          label={f.fields.paid}
          checked={values.paid}
          onChange={(checked) => {
            set("paid", checked);
            if (checked && !values.paidOn) set("paidOn", parisToday());
          }}
        />
        {values.paid ? (
          <DateTimeFields
            date={values.paidOn || null}
            minDate={MIN_DATE}
            onDate={(date) => set("paidOn", date)}
            dateLabel={f.fields.paidOn}
            error={errors.paidOn}
            compact
          />
        ) : null}
        <TextField
          label={f.fields.notes}
          value={values.notes}
          onChangeText={(value) => set("notes", value)}
          maxLength={EXPENSE_LIMITS.notesMaxLength}
          multiline
          error={errors.notes}
        />
      </Card>

      {lines.length > 0 ? (
        <Card>
          <Text style={styles.cardTitle}>{f.lines.title}</Text>
          <ExpenseLines
            lines={lines}
            onRemove={(index) => setLines((current) => current.filter((_, i) => i !== index))}
          />
        </Card>
      ) : null}

      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button
        label={f.save}
        loading={saving}
        disabled={reading?.step === "reading"}
        onPress={() => void save()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  chosen: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    padding: spacing(3),
  },
  chosenText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.foreground },
  thumbnail: { flex: 1, height: 160, borderRadius: radius.input, resizeMode: "contain" },
  removePhoto: { padding: 2 },
  total: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  totalLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  totalValue: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
});
