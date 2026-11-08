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
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { AiProgress } from "@/components/ai-progress";
import { formatCents } from "@/lib/format";
import {
  depositPhoto,
  discardDeposit,
  pickDocumentFile,
  pickPhotos,
  type PickedPhoto,
} from "@/lib/photos";
import { readExpense, saveExpense } from "@/lib/pro-expenses";
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { ExpenseLines } from "./expense-parts";
import { CardHeading, FicheButton, FicheCard, FicheScreen } from "./fiche-kit";
import { DateField, FieldPair, SelectField, SwitchCard, ToolField } from "./tools-kit";

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
 * puis le chantier et le paiement. La pièce est rangée à l'enregistrement. Refonte « Nette »
 * (lot 8, maquette « DepenseApp ») : bandeau bleu clair de la pièce lue, champs arrondis deux par
 * deux, listes de choix dans une feuille, carte « Déjà payée » et bouton fixé en bas.
 */
export function ExpenseFormView({
  title,
  expenseId,
  initial,
  initialLines,
  hasDocument,
  chantiers,
  takePhoto = false,
}: {
  /** Titre de la barre du haut (« Nouvelle dépense », « Modifier la dépense »). */
  title: string;
  expenseId: string | null;
  initial: ExpenseFormValues;
  initialLines: ExpenseLinePrefill[];
  hasDocument: boolean;
  chantiers: { id: string; label: string }[];
  /** « Photo du ticket » (rubrique Argent) : l'appareil photo s'ouvre dès l'arrivée. */
  takePhoto?: boolean;
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

  // Une seule fois à l'ouverture : l'artisan peut ensuite changer de pièce comme d'habitude.
  const photoAsked = useRef(false);
  useEffect(() => {
    if (!takePhoto || photoAsked.current) return;
    photoAsked.current = true;
    void pick("camera");
  }, [takePhoto]);

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

  const busy = reading?.step === "reading";
  const read = reading?.step === "done" && reading.filled;
  const chantierOptions = [
    { value: "", label: f.fields.chantierNone },
    ...chantiers.map((c) => ({ value: c.id, label: c.label })),
  ];
  const categoryOptions = [
    { value: "", label: f.fields.categoryNone },
    ...EXPENSE_CATEGORIES.map((c) => ({ value: c as string, label: t.categories[c] })),
  ];
  const kindOptions = EXPENSE_KINDS.map((k) => ({ value: k as string, label: t.kinds[k] }));

  return (
    <FicheScreen
      title={title}
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <FicheButton
            label={f.save}
            tall
            loading={saving}
            disabled={busy}
            onPress={() => void save()}
          />
        </>
      }
    >
      {photo ? (
        <View style={styles.read}>
          <View style={styles.readHead}>
            <View style={styles.thumb}>
              {photo.pdf ? (
                <FileText size={22} color={colors["muted-foreground"]} />
              ) : (
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumbImage}
                  accessibilityLabel={f.document.chosen}
                />
              )}
            </View>
            <View style={styles.readText}>
              <Text style={styles.readTitle}>
                {busy
                  ? f.document.reading
                  : read
                    ? photo.pdf
                      ? f.document.readFile
                      : f.document.readTicket
                    : f.document.attached}
              </Text>
              {read ? <Text style={styles.readBody}>{f.document.readText}</Text> : null}
              {photo.pdf ? (
                <Text style={styles.readBody} numberOfLines={1}>
                  {f.document.chosenPdf(photo.pdf.name)}
                </Text>
              ) : null}
              {busy ? null : (
                <Pressable
                  role="button"
                  hitSlop={6}
                  onPress={() => void pick(photo.pdf ? "file" : "camera")}
                >
                  <Text style={styles.readLink}>
                    {photo.pdf ? f.document.otherFile : f.document.retake}
                  </Text>
                </Pressable>
              )}
            </View>
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
          {busy ? <AiProgress steps={fr.aiProgress.expense} /> : null}
        </View>
      ) : (
        <FicheCard padding={4.5} gap={3}>
          <CardHeading title={f.document.title} size={17} />
          <Text style={styles.lead}>{hasDocument ? f.document.current : f.document.lead}</Text>
          <FicheButton
            label={f.document.camera}
            icon={Camera}
            onPress={() => void pick("camera")}
          />
          <FicheButton
            label={f.document.library}
            variant="secondary"
            icon={ImageIcon}
            onPress={() => void pick("library")}
          />
          <FicheButton
            label={f.document.file}
            variant="secondary"
            icon={FileText}
            onPress={() => void pick("file")}
          />
        </FicheCard>
      )}
      {reading?.step === "failed" ? <Notice tone="info">{f.reading.failed}</Notice> : null}
      {reading?.step === "done"
        ? reading.warnings.map((warning) => (
            <Notice key={warning} tone="info">
              {f.reading.warnings[warning]}
            </Notice>
          ))
        : null}

      <ToolField
        label={f.fields.title}
        value={values.title}
        onChangeText={(value) => set("title", value)}
        maxLength={EXPENSE_LIMITS.titleMaxLength}
        hint={f.fields.titleHint}
        error={errors.title}
      />
      <FieldPair>
        <ToolField
          label={f.fields.totalHtShort}
          value={values.totalHt}
          onChangeText={(value) => set("totalHt", value)}
          keyboardType="decimal-pad"
          error={errors.totalHt}
          style={styles.half}
        />
        <ToolField
          label={f.fields.totalTvaShort}
          value={values.totalTva}
          onChangeText={(value) => set("totalTva", value)}
          keyboardType="decimal-pad"
          error={errors.totalTva}
          style={styles.half}
        />
      </FieldPair>
      <View style={styles.total} accessible aria-live="polite">
        <Text style={styles.totalLabel}>{f.fields.totalTtc}</Text>
        <Text style={styles.totalValue}>{ttc === null ? "—" : formatCents(ttc)}</Text>
      </View>
      <FieldPair>
        <ToolField
          label={f.fields.supplier}
          value={values.supplierName}
          onChangeText={(value) => set("supplierName", value)}
          maxLength={EXPENSE_LIMITS.supplierMaxLength}
          error={errors.supplierName}
          style={styles.half}
        />
        <ToolField
          label={f.fields.reference}
          value={values.reference}
          onChangeText={(value) => set("reference", value)}
          maxLength={EXPENSE_LIMITS.referenceMaxLength}
          autoCapitalize="characters"
          error={errors.reference}
          style={styles.half}
        />
      </FieldPair>
      <SelectField
        label={f.fields.chantier}
        value={values.chantierId}
        options={chantierOptions}
        onChange={(value) => set("chantierId", value)}
        hint={f.fields.chantierHint}
        error={errors.chantierId}
      />
      <FieldPair>
        <DateField
          label={f.fields.issuedOn}
          date={values.issuedOn}
          minDate={MIN_DATE}
          onDate={(date) => set("issuedOn", date)}
          error={errors.issuedOn}
          style={styles.half}
        />
        <SelectField
          label={f.fields.category}
          value={values.category}
          options={categoryOptions}
          onChange={(value) => set("category", value)}
          error={errors.category}
          style={styles.half}
        />
      </FieldPair>
      <FieldPair>
        <SelectField
          label={f.fields.kind}
          value={values.kind}
          options={kindOptions}
          onChange={(value) => set("kind", value)}
          error={errors.kind}
          style={styles.half}
        />
        {values.dueOn ? (
          <DateField
            label={f.fields.dueOn}
            date={values.dueOn}
            minDate={values.issuedOn || MIN_DATE}
            onDate={(date) => set("dueOn", date)}
            error={errors.dueOn}
            style={styles.half}
          />
        ) : (
          <View style={styles.half} />
        )}
      </FieldPair>
      <Pressable
        role="button"
        hitSlop={6}
        onPress={() => set("dueOn", values.dueOn ? "" : values.issuedOn || parisToday())}
        style={styles.dueLink}
      >
        <Text style={styles.readLink}>
          {values.dueOn ? f.fields.dueOnRemove : f.fields.dueOnAdd}
        </Text>
      </Pressable>

      <SwitchCard
        label={f.fields.paid}
        hint={f.fields.paidHint}
        value={values.paid}
        onChange={(checked) => {
          set("paid", checked);
          if (checked && !values.paidOn) set("paidOn", parisToday());
        }}
      >
        {values.paid ? (
          <DateField
            label={f.fields.paidOn}
            date={values.paidOn}
            minDate={MIN_DATE}
            onDate={(date) => set("paidOn", date)}
            error={errors.paidOn}
          />
        ) : null}
      </SwitchCard>

      <ToolField
        label={f.fields.notes}
        value={values.notes}
        onChangeText={(value) => set("notes", value)}
        maxLength={EXPENSE_LIMITS.notesMaxLength}
        multiline
        error={errors.notes}
      />

      {lines.length > 0 ? (
        <FicheCard padding={4.5} gap={3}>
          <CardHeading title={f.lines.title} size={17} />
          <ExpenseLines
            lines={lines}
            onRemove={(index) => setLines((current) => current.filter((_, i) => i !== index))}
          />
        </FicheCard>
      ) : null}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  read: {
    gap: spacing(3),
    borderRadius: radius.card,
    backgroundColor: colors["primary-soft"],
    padding: 14,
  },
  readHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  thumb: {
    width: 64,
    height: 80,
    overflow: "hidden",
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: 64, height: 80, resizeMode: "cover" },
  readText: { flex: 1, gap: 3 },
  readTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  readBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  readLink: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  removePhoto: { alignSelf: "flex-start", padding: 2 },
  half: { flex: 1, minWidth: 0 },
  dueLink: {
    alignSelf: "flex-start",
    minHeight: 32,
    justifyContent: "center",
    marginTop: -spacing(2),
  },
  total: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: -spacing(1),
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: spacing(3),
  },
  totalLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  totalValue: { fontFamily: font.display, fontSize: 20, color: colors.foreground },
});
