import {
  type DocumentReadingWarning,
  type IdentityPiece,
  type IdentityReading,
  type IdentitySide,
  IDENTITY_PIECES,
  identityComplete,
  identitySides,
  mergeIdentityReadings,
} from "@menao/core";
import { documentMetadataSchema } from "@menao/validation";
import { Camera, Check, CreditCard, FileText, ImageIcon, Info } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AiProgress } from "@/components/ai-progress";
import { DateTimeFields } from "@/components/date-time-fields";
import { fr } from "@/i18n/fr";
import { rememberBirthDate } from "@/lib/birth-date-memo";
import { formatLongDate } from "@/lib/dates";
import { readDocument } from "@/lib/document-reading";
import {
  depositPhoto,
  discardDeposit,
  pickDocumentFile,
  pickPhotos,
  processDeposit,
  type PickedPhoto,
} from "@/lib/photos";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { PrivacyNote, SoftBanner } from "./dossier-kit";
import { FicheButton, FicheScreen, FicheTag } from "./fiche-kit";

const t = fr.proDocument;
const i = t.identity;
const r = t.reading;
const g = fr.proGuide;
const { colors, font, radius, spacing } = theme;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
/** Date de fin : à partir de demain (celle du jour est refusée, ADR 0176). */
const tomorrow = () => isoDay(new Date(Date.now() + 86_400_000));

type SideState = {
  photo: PickedPhoto;
  /** Chemin du fichier brut dans « uploads », une fois déposé. */
  path: Promise<string | null>;
  status: "reading" | "done" | "failed";
  reading?: IdentityReading;
  warnings: DocumentReadingWarning[];
};
type Sides = Partial<Record<IdentitySide, SideState>>;

/**
 * Pièce d'identité du dirigeant (F-181, ADR 0378), comme sur le site : l'artisan choisit sa pièce,
 * puis dépose ce qu'elle demande, recto et verso pour une carte d'identité ou un titre de séjour,
 * une page pour un passeport. Chaque côté est lu dès son dépôt ; « Déposer » n'est possible que
 * lorsque tout est déposé. Une photo pourra être transmise à Stripe, sauf refus de l'artisan.
 */
export function IdentityForm({
  intro,
  help,
  guided,
  onDone,
  onSkip,
}: {
  /** En-tête de l'écran (étape du parcours, titre). */
  intro: ReactNode;
  /** « Où trouver ce document ? » et la vidéo d'aide. */
  help: ReactNode;
  /** Parcours guidé (ADR 0374) : ce qui suit, et si une pièce est déjà déposée. */
  guided?: { nextNote: string; deposited: boolean };
  /** Pièce enregistrée : étape suivante, ou retour. */
  onDone: () => Promise<void>;
  /** Parcours guidé sans la pièce sous la main : étape suivante. */
  onSkip: () => Promise<void>;
}) {
  const [piece, setPiece] = useState<IdentityPiece>("carte_identite");
  const [sides, setSides] = useState<Sides>({});
  const latest = useRef<Sides>({});
  const [share, setShare] = useState(true);
  const [dateFin, setDateFin] = useState<string | null>(null);
  const [dateTouched, setDateTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function update(next: Sides) {
    latest.current = next;
    setSides(next);
  }

  // Écran quitté sans envoyer : les fichiers bruts sont retirés.
  useEffect(
    () => () => {
      for (const side of Object.values(latest.current))
        void side.path.then((path) => (path ? discardDeposit(path) : undefined));
    },
    [],
  );

  const wanted = identitySides(piece);
  const merged = mergeIdentityReadings(wanted.map((side) => sides[side]?.reading));
  const complete = identityComplete(piece, {
    recto: Boolean(sides.recto),
    verso: Boolean(sides.verso),
  });
  const busy = wanted.some((side) => sides[side]?.status === "reading");
  const started = wanted.some((side) => sides[side]);
  const dateValue = dateTouched ? dateFin : merged.dateFin;
  // Une photo seulement : Stripe refuse le PDF pour une pièce d'identité.
  const shareable = wanted.every((side) => sides[side] && !sides[side]?.photo.pdf);
  const firstMissing = wanted.find((side) => !sides[side]);
  const sideText = (side: IdentitySide) =>
    piece === "passeport" ? i.sides.page : side === "recto" ? i.sides.recto : i.sides.verso;

  function remove(side: IdentitySide) {
    void latest.current[side]?.path.then((path) => (path ? discardDeposit(path) : undefined));
    const next = { ...latest.current };
    delete next[side];
    update(next);
  }

  function choosePiece(next: IdentityPiece) {
    setPiece(next);
    if (!identitySides(next).includes("verso") && latest.current.verso) remove("verso");
  }

  async function pick(side: IdentitySide, source: "camera" | "library" | "file") {
    setFailure(null);
    const picked = source === "file" ? await pickDocumentFile() : await pickPhotos(source, 1);
    if ("error" in picked) return setFailure(picked.error);
    const photo = picked.photos[0];
    if (!photo) return;
    void latest.current[side]?.path.then((path) => (path ? discardDeposit(path) : undefined));
    const path = depositPhoto("document", photo).then((result) =>
      "path" in result ? result.path : null,
    );
    const entry: SideState = { photo, path, status: "reading", warnings: [] };
    update({ ...latest.current, [side]: entry });
    const stored = await path;
    const current = () => latest.current[side]?.photo === photo;
    if (!current()) return;
    if (!stored) {
      remove(side);
      return setFailure(fr.search.upload.unavailable);
    }
    const result = await readDocument(stored, "identite");
    if (!current()) return;
    if (result.status !== "ok")
      return update({ ...latest.current, [side]: { ...entry, status: "failed" } });
    // La date de naissance lue reste sur ce téléphone, pour l'écran « Paiements » (ADR 0375).
    if (result.birthDate) void rememberBirthDate(result.birthDate);
    update({
      ...latest.current,
      [side]: {
        ...entry,
        status: "done",
        reading: { dateFin: result.fields.dateFin ?? null, birthDate: result.birthDate ?? null },
        // Le verso d'une carte ne ressemble pas toujours à une pièce d'identité : pas d'alerte.
        warnings: result.warnings.filter(
          (warning) => !(side === "verso" && warning === "autre_document"),
        ),
      },
    });
  }

  async function send() {
    const recto = latest.current.recto;
    if (!recto || !complete) return setErrors({ photo: i.sideRequired });
    const parsed = documentMetadataSchema().safeParse({
      type: "identite",
      dateFin: dateValue ?? "",
      piece,
    });
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((all, issue) => {
        const key = String(issue.path[0] ?? "photo");
        return all[key] ? all : { ...all, [key]: issue.message };
      }, {});
      return setErrors(fieldErrors);
    }
    setErrors({});
    setSending(true);
    setFailure(null);
    const path = await recto.path;
    const versoPath = wanted.includes("verso") ? await latest.current.verso?.path : null;
    if (!path || (wanted.includes("verso") && !versoPath)) {
      setSending(false);
      return setFailure(fr.search.upload.unavailable);
    }
    const status = await processDeposit(
      {
        purpose: "document",
        document: { ...parsed.data, shareWithStripe: share },
        ...(versoPath ? { versoPath } : {}),
      },
      path,
    );
    setSending(false);
    if (status !== "ok")
      return setFailure(fr.search.upload[status] ?? fr.search.upload.unavailable);
    // process-upload a retiré les fichiers bruts : plus rien à nettoyer en quittant l'écran.
    latest.current = {};
    await onDone();
  }

  const readRows = (reading: { dateFin?: string | null; birthDate?: string | null }) =>
    [
      reading.birthDate ? ([i.birthDate, formatLongDate(reading.birthDate)] as const) : null,
      reading.dateFin ? ([i.expiry, formatLongDate(reading.dateFin)] as const) : null,
    ].filter((row) => row !== null);
  const readBanner = (title: string, rows: (readonly [string, string])[]) =>
    rows.length === 0 ? null : (
      <SoftBanner text={title}>
        {rows.map(([name, value]) => (
          <View key={name} style={styles.readRow}>
            <Text style={styles.readLabel}>{name}</Text>
            <Text style={styles.readValue}>{value}</Text>
            <FicheTag text={r.read} tone="success" />
          </View>
        ))}
      </SoftBanner>
    );

  return (
    <FicheScreen
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          {guided && !started ? (
            <>
              <Text style={styles.footerNote}>
                {guided.deposited ? guided.nextNote : g.skipNote}
              </Text>
              <FicheButton
                label={guided.deposited ? g.continue : g.skip}
                variant="secondary"
                tall
                onPress={() => void onSkip()}
              />
            </>
          ) : (
            <>
              {guided ? <Text style={styles.footerNote}>{guided.nextNote}</Text> : null}
              <FicheButton
                label={guided ? g.depositAndContinue : t.send}
                tall
                onPress={() => void send()}
                loading={sending}
                disabled={busy || !complete}
              />
            </>
          )}
        </>
      }
    >
      {intro}
      {help}
      <View style={styles.block}>
        {started ? null : <Text style={styles.question}>{i.question}</Text>}
        <View style={styles.chips} accessibilityRole="radiogroup">
          {IDENTITY_PIECES.map((value) => {
            const selected = piece === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => choosePiece(value)}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                  {i.pieces[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {wanted.map((side) => {
        const text = sideText(side);
        const entry = sides[side];
        if (!entry) {
          const now = side === firstMissing;
          return (
            <View key={side} style={[styles.slot, now && styles.slotNow]}>
              <Text style={styles.slotTitle}>{text.title}</Text>
              <Text style={styles.slotHint}>{text.hint}</Text>
              <View style={styles.slotButtons}>
                <FicheButton
                  label={i.photo}
                  icon={Camera}
                  grow
                  onPress={() => void pick(side, "camera")}
                />
                <FicheButton
                  label={i.library}
                  icon={ImageIcon}
                  variant="secondary"
                  grow
                  onPress={() => void pick(side, "library")}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i.fileLabel(text.title)}
                onPress={() => void pick(side, "file")}
                style={styles.fileLink}
              >
                <FileText size={15} color={colors["primary-strong"]} />
                <Text style={styles.fileLinkText}>{t.chooseFile}</Text>
              </Pressable>
            </View>
          );
        }
        return (
          <View key={side} style={styles.sideBlock}>
            <View style={styles.done}>
              <View style={styles.doneIcon}>
                <Check size={18} color={colors["primary-foreground"]} strokeWidth={3} />
              </View>
              <View style={styles.doneTexts}>
                <Text style={styles.doneTitle}>{text.deposited}</Text>
                <Text style={styles.doneName} numberOfLines={1}>
                  {entry.photo.pdf ? entry.photo.pdf.name : t.added}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i.changeLabel(text.title)}
                onPress={() => remove(side)}
                style={styles.change}
              >
                <Text style={styles.changeText}>{i.change}</Text>
              </Pressable>
            </View>
            {entry.status === "reading" ? <AiProgress steps={fr.aiProgress.document} /> : null}
            {entry.status === "failed" ? <Notice tone="info">{r.failed}</Notice> : null}
            {entry.warnings.map((warning) => (
              <Notice key={warning} tone="error">
                {warning === "autre_document"
                  ? r.otherDocument(fr.proDossier.documents.identite)
                  : r.warnings[warning]}
              </Notice>
            ))}
            {!complete && entry.reading ? readBanner(text.readOn, readRows(entry.reading)) : null}
          </View>
        );
      })}
      {errors.photo ? <Notice tone="error">{errors.photo}</Notice> : null}

      {started && !complete && sides.recto && wanted.includes("verso") ? (
        <View style={styles.hintRow}>
          <Info size={15} color={colors["muted-foreground"]} />
          <Text style={styles.hint}>{i.versoLeft}</Text>
        </View>
      ) : null}
      {complete && !busy ? readBanner(i.readAll, readRows(merged)) : null}
      {started ? (
        <DateTimeFields
          date={dateValue}
          minDate={tomorrow()}
          onDate={(value) => {
            setDateTouched(true);
            setDateFin(value);
          }}
          dateLabel={t.dateFinIdentite}
          error={errors.dateFin}
        />
      ) : null}
      {complete && shareable ? (
        <View style={styles.share}>
          <CreditCard size={19} color={colors["primary-strong"]} />
          <View style={styles.shareTexts}>
            <Text style={styles.shareTitle}>{share ? i.share.title : i.share.declinedTitle}</Text>
            <Text style={styles.shareText}>{share ? i.share.text : i.share.declinedText}</Text>
            <Pressable accessibilityRole="button" onPress={() => setShare(!share)}>
              <Text style={styles.shareLink}>{share ? i.share.decline : i.share.accept}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {started ? null : (
        <View style={styles.hintRow}>
          <Camera size={15} color={colors["muted-foreground"]} />
          <Text style={styles.hint}>{i.photoHint}</Text>
        </View>
      )}
      <PrivacyNote text={fr.proDossier.privacy} />
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  footerNote: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  block: { gap: spacing(2.5) },
  question: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  chips: { flexDirection: "row", gap: spacing(1.5) },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(1.5),
  },
  chipOn: { backgroundColor: colors.foreground, borderColor: colors.foreground },
  chipText: {
    fontFamily: font.bold,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    color: colors.label,
  },
  chipTextOn: { color: colors.surface },
  slot: {
    gap: spacing(1),
    padding: spacing(3.5),
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  slotNow: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  slotTitle: { fontFamily: font.semibold, fontSize: 15.5, color: colors.foreground },
  slotHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  slotButtons: { flexDirection: "row", gap: spacing(2), marginTop: spacing(1.5) },
  fileLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    minHeight: 40,
    alignSelf: "center",
  },
  fileLinkText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  sideBlock: { gap: spacing(2) },
  done: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  doneIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  doneTexts: { flex: 1, gap: 1 },
  doneTitle: { fontFamily: font.semibold, fontSize: 15.5, color: colors.foreground },
  doneName: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  change: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing(1) },
  changeText: { fontFamily: font.semibold, fontSize: 14, color: colors["primary-strong"] },
  readRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  readLabel: { fontFamily: font.regular, fontSize: 13, color: colors.label },
  readValue: { fontFamily: font.bold, fontSize: 14, color: colors.foreground },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  hint: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  share: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    padding: spacing(3.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shareTexts: { flex: 1, gap: spacing(1) },
  shareTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  shareText: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.label },
  shareLink: { fontFamily: font.semibold, fontSize: 13.5, color: colors["primary-strong"] },
});
