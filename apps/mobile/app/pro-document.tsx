import {
  KBIS_MAX_AGE_MONTHS,
  REQUIRED_DOCUMENT_TYPES,
  URSSAF_MAX_AGE_MONTHS,
  prefillUpdates,
  type DocumentPrefill,
  type DocumentReadingWarning,
  type RequiredDocumentType,
} from "@menao/core";
import { documentMetadataSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, FileText, ImageIcon } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { PageHead, PrivacyNote, SoftBanner } from "@/components/pro/dossier-kit";
import { CardHeading, FicheButton, FicheCard, FicheScreen } from "@/components/pro/fiche-kit";
import { CheckRow, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { AiProgress } from "@/components/ai-progress";
import { loadDossier, setDecennaleExempt } from "@/lib/artisan-dossier";
import { formatLongDate } from "@/lib/dates";
import { verifySiret } from "@/lib/my-company";
import { readDocument } from "@/lib/document-reading";
import {
  depositPhoto,
  discardDeposit,
  pickDocumentFile,
  pickPhotos,
  processDeposit,
  type PickedPhoto,
} from "@/lib/photos";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proDocument;
const r = fr.proDocument.reading;
const d = fr.proDossier;
const { colors, font, radius, spacing } = theme;

/** Fond « papier » derrière la photo du document (maquette « DocumentDossierApp »). */
const PAPER = "#efebe2";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
/** Date de fin : à partir de demain (celle du jour est refusée, ADR 0176). */
const tomorrow = () => isoDay(new Date(Date.now() + 86_400_000));

type Reading =
  | { step: "reading" }
  | { step: "done"; filled: boolean; warnings: DocumentReadingWarning[] }
  | { step: "failed" };
function monthsAgo(months: number): string {
  const now = new Date();
  return isoDay(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate())),
  );
}

/**
 * Un document du dossier, en photo ou en PDF (ADR 0113, 0123) : appareil photo, photothèque ou
 * fichiers du téléphone, puis les mêmes champs et contrôles que le site (documentMetadataSchema),
 * envoi par process-upload. Pendant l'inscription, ou pour renouveler un document surveillé d'un
 * artisan validé (F-51). Refonte « Nette » (lot 9, maquette « DocumentDossierApp ») : grand titre,
 * photo du document en grand avec « Reprendre », bandeau de lecture automatique, champs arrondis
 * en 16 points, métiers couverts en cases bleu nuit et « Déposer le document » collé en bas.
 */
function DocumentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = REQUIRED_DOCUMENT_TYPES.find((value) => value === params.type);
  const [dossier, reload] = useFocusData(loadDossier);
  if (!type) {
    return (
      <FicheScreen>
        <Notice tone="error">{fr.errors.generic}</Notice>
      </FicheScreen>
    );
  }
  const locked = dossier?.status === "en_verification";
  const draft = dossier?.status === "brouillon" || dossier?.status === "refuse";
  const validated = dossier?.status === "valide" || dossier?.status === "suspendu";
  const exempt = type === "decennale" && dossier?.snapshot.decennaleExempt === true;
  // Kbis : demandé à l'inscription seulement (pas de renouvellement, F-51).
  const kbisDone = type === "kbis" && validated;
  // Kbis remplacé par la fiche de vérification au registre, ou vérification impossible (ADR 0217).
  const kbis = dossier?.documents.filter((doc) => doc.type === "kbis") ?? [];
  const registry = kbis.find((doc) => doc.source === "registre" && doc.status === "valide");
  const registryFailed =
    type === "kbis" && draft && kbis.length === 0 && dossier?.registryStatus
      ? (t.registryReasons[dossier.registryStatus] ?? null)
      : null;
  const blocked = locked ? (
    <Notice tone="info">{t.locked}</Notice>
  ) : dossier?.status === "radie" ? (
    <Notice tone="info">{t.radiated}</Notice>
  ) : kbisDone ? (
    <Notice tone="info">{t.kbisDone}</Notice>
  ) : type === "kbis" && registry ? (
    <Notice tone="success">
      {t.registryVerified(formatLongDate(registry.date_emission ?? ""))}
    </Notice>
  ) : null;
  const intro = (
    <>
      <PageHead title={d.documents[type]} lead={exempt || blocked ? null : t.photoHint} />
      {blocked}
      {!blocked && registryFailed ? (
        <RegistryRecheck reason={registryFailed} onDone={reload} />
      ) : null}
    </>
  );
  // « Non soumis » à la décennale : sous le formulaire, comme la colonne de la maquette.
  const exemptChoice =
    !blocked && type === "decennale" && draft ? (
      <ExemptChoice exempt={exempt} onChange={reload} />
    ) : null;
  if (!blocked && !exempt && dossier) {
    return (
      <DocumentForm
        type={type}
        trades={type === "decennale" ? dossier.trades : []}
        intro={intro}
        after={exemptChoice}
      />
    );
  }
  return (
    <FicheScreen>
      {intro}
      {exemptChoice}
    </FicheScreen>
  );
}

/** Kbis à envoyer après un contrôle au registre sans succès, avec sa raison (ADR 0217). */
function RegistryRecheck({ reason, onDone }: { reason: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function recheck() {
    setBusy(true);
    await verifySiret();
    await onDone();
    setBusy(false);
  }
  return (
    <FicheCard padding={4} gap={3}>
      <Notice tone="info">{reason}</Notice>
      <FicheButton
        label={t.registryRecheck}
        variant="secondary"
        onPress={() => void recheck()}
        loading={busy}
      />
    </FicheCard>
  );
}

/** « Non soumis » à la décennale (ADR 0116) : déclaré par l'artisan, vérifié par l'équipe. */
function ExemptChoice({ exempt, onChange }: { exempt: boolean; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function toggle() {
    setBusy(true);
    setFailure(await setDecennaleExempt(!exempt));
    await onChange();
    setBusy(false);
  }
  return (
    <FicheCard padding={4.5} gap={3}>
      {exempt ? (
        <Notice tone="info">{t.exemptDeclared}</Notice>
      ) : (
        <>
          <CardHeading title={t.exemptTitle} size={16} />
          <Text style={styles.text}>{t.exemptText}</Text>
        </>
      )}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheButton
        label={exempt ? t.exemptCancel : t.exemptDeclare}
        variant="secondary"
        onPress={() => void toggle()}
        loading={busy}
      />
    </FicheCard>
  );
}

function DocumentForm({
  type,
  trades,
  intro,
  after,
}: {
  type: RequiredDocumentType;
  trades: { code: string; label: string }[];
  /** En-tête de l'écran (titre, raison d'un Kbis demandé). */
  intro: ReactNode;
  /** Sous le formulaire (« non soumis » à la décennale). */
  after: ReactNode;
}) {
  // Décennale : métiers couverts, tous cochés au départ (ADR 0116).
  const [covered, setCovered] = useState(() => new Set(trades.map((trade) => trade.code)));
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [values, setValues] = useState({
    dateEmission: null as string | null,
    dateFin: null as string | null,
    assureur: "",
    numero: "",
    couverture: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const insurance = type === "decennale" || type === "rc_pro";
  // Document déposé dès qu'il est choisi, pour sa lecture automatique (ADR 0176), puis réutilisé
  // à l'envoi ; retiré s'il est remplacé ou si l'écran est quitté sans l'envoyer.
  const deposit = useRef<{ photo: PickedPhoto; path: Promise<string | null> } | null>(null);
  const lastRead = useRef<DocumentPrefill>({});
  // Valeurs à jour pour la lecture, qui se termine après plusieurs attentes.
  const current = useRef(values);
  useEffect(() => {
    current.current = values;
  }, [values]);

  useEffect(
    () => () => {
      void deposit.current?.path.then((path) => (path ? discardDeposit(path) : undefined));
    },
    [],
  );

  async function pick(source: "camera" | "library" | "file") {
    setFailure(null);
    const picked = source === "file" ? await pickDocumentFile() : await pickPhotos(source, 1);
    if ("error" in picked) return setFailure(picked.error);
    const chosen = picked.photos[0];
    if (!chosen) return;
    setPhoto(chosen);
    await read(chosen);
  }

  async function read(chosen: PickedPhoto) {
    const previous = deposit.current;
    const path = depositPhoto("document", chosen).then((result) =>
      "path" in result ? result.path : null,
    );
    deposit.current = { photo: chosen, path };
    void previous?.path.then((old) => (old ? discardDeposit(old) : undefined));
    setReading({ step: "reading" });
    const deposited = await path;
    if (deposit.current?.photo !== chosen) return;
    if (!deposited) return setReading(null);
    const result = await readDocument(deposited, type);
    if (deposit.current?.photo !== chosen) return;
    if (result.status !== "ok") return setReading({ step: "failed" });
    // Champs vides (ou remplis par la lecture précédente) seulement : la saisie est gardée.
    const updates = prefillUpdates(current.current, result.fields, lastRead.current);
    lastRead.current = result.fields;
    const next = { ...current.current, ...updates };
    setValues(next);
    // Dates lues contrôlées tout de suite, comme à l'envoi : document expiré, Kbis trop ancien…
    const parsed = documentMetadataSchema().safeParse({
      type,
      ...next,
      dateEmission: next.dateEmission ?? "",
      dateFin: next.dateFin ?? "",
    });
    const dateErrors = parsed.success
      ? {}
      : (z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>);
    setErrors((errs) => ({
      ...errs,
      ...("dateEmission" in updates ? { dateEmission: dateErrors.dateEmission?.[0] } : {}),
      ...("dateFin" in updates ? { dateFin: dateErrors.dateFin?.[0] } : {}),
    }));
    setReading({
      step: "done",
      filled: Object.keys(result.fields).length > 0,
      warnings: result.warnings,
    });
  }

  async function send() {
    const parsed = documentMetadataSchema().safeParse({
      type,
      dateEmission: values.dateEmission ?? "",
      dateFin: values.dateFin ?? "",
      assureur: values.assureur,
      numero: values.numero,
      couverture: values.couverture,
      coveredTrades: type === "decennale" ? [...covered] : [],
    });
    const fieldErrors: Record<string, string | undefined> = parsed.success
      ? {}
      : Object.fromEntries(
          Object.entries(
            z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
          ).map(([key, list]) => [key, list?.[0]]),
        );
    if (!photo) fieldErrors.photo = t.photoRequired;
    setErrors(fieldErrors);
    if (!parsed.success || !photo) return;
    setSending(true);
    setFailure(null);
    // Le document déposé pour sa lecture, ou un nouveau dépôt s'il a échoué.
    const reused = deposit.current?.photo === photo ? await deposit.current.path : null;
    const deposited = reused ? { path: reused } : await depositPhoto("document", photo);
    const status =
      "path" in deposited
        ? await processDeposit({ purpose: "document", document: parsed.data }, deposited.path)
        : deposited.status;
    // process-upload a retiré le fichier brut, envoyé ou refusé : un nouvel essai le redépose.
    if ("path" in deposited) deposit.current = null;
    setSending(false);
    if (status !== "ok")
      return setFailure(fr.search.upload[status] ?? fr.search.upload.unavailable);
    router.back();
  }

  return (
    <FicheScreen
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <FicheButton label={t.send} tall onPress={() => void send()} loading={sending} />
        </>
      }
    >
      {intro}
      <View style={styles.photoBlock}>
        {photo ? (
          <View style={styles.stage}>
            {photo.pdf ? (
              <View style={styles.stagePdf}>
                <View style={styles.page}>
                  <FileText size={30} color={colors["muted-foreground"]} />
                </View>
              </View>
            ) : (
              <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" alt="" />
            )}
            <View style={styles.retake}>
              <FicheButton
                label={t.replace}
                icon={Camera}
                variant="secondary"
                onPress={() => void pick("camera")}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.stage, styles.stageEmpty]}>
            <View style={styles.page}>
              <FileText size={30} color={colors["muted-foreground"]} />
            </View>
          </View>
        )}
        {photo ? (
          <Text style={styles.added}>{photo.pdf ? t.fileReady(photo.pdf.name) : t.added}</Text>
        ) : (
          <FicheButton label={t.take} icon={Camera} tall onPress={() => void pick("camera")} />
        )}
        <FicheButton
          label={t.choose}
          icon={ImageIcon}
          variant="secondary"
          onPress={() => void pick("library")}
        />
        <FicheButton
          label={t.chooseFile}
          icon={FileText}
          variant="secondary"
          onPress={() => void pick("file")}
        />
      </View>
      {errors.photo ? <Notice tone="error">{errors.photo}</Notice> : null}
      {reading?.step === "reading" ? <AiProgress steps={fr.aiProgress.document} /> : null}
      {reading?.step === "failed" ? <Notice tone="info">{r.failed}</Notice> : null}
      {reading?.step === "done" ? (
        <>
          {reading.warnings.map((warning) => (
            <Notice key={warning} tone="error">
              {warning === "autre_document"
                ? r.otherDocument(d.documents[type])
                : r.warnings[warning]}
            </Notice>
          ))}
          {reading.filled ? (
            <SoftBanner text={r.done} />
          ) : reading.warnings.length === 0 ? (
            <Notice tone="info">{r.empty}</Notice>
          ) : null}
        </>
      ) : null}

      {type === "kbis" ? (
        <DateTimeFields
          date={values.dateEmission}
          minDate={monthsAgo(KBIS_MAX_AGE_MONTHS)}
          onDate={(dateEmission) => setValues((v) => ({ ...v, dateEmission }))}
          dateLabel={t.dateEmission}
          error={errors.dateEmission}
        />
      ) : null}
      {insurance ? (
        <>
          <ToolField
            label={t.assureur}
            value={values.assureur}
            onChangeText={(assureur) => setValues((v) => ({ ...v, assureur }))}
            error={errors.assureur}
          />
          <ToolField
            label={t.numero}
            value={values.numero}
            onChangeText={(numero) => setValues((v) => ({ ...v, numero }))}
            autoCapitalize="characters"
            error={errors.numero}
          />
          <DateTimeFields
            date={values.dateFin}
            minDate={tomorrow()}
            onDate={(dateFin) => setValues((v) => ({ ...v, dateFin }))}
            dateLabel={t.dateFin}
            error={errors.dateFin}
          />
        </>
      ) : null}
      {type === "decennale" ? (
        <ToolField
          label={t.couverture}
          value={values.couverture}
          onChangeText={(couverture) => setValues((v) => ({ ...v, couverture }))}
          placeholder={t.couverturePlaceholder}
          error={errors.couverture}
        />
      ) : null}
      {type === "decennale" && trades.length > 0 ? (
        <FicheCard padding={3.5} gap={0}>
          <Text style={styles.coverageTitle}>{t.coverageLegend}</Text>
          {trades.map((trade) => (
            <CheckRow
              key={trade.code}
              label={trade.label}
              checked={covered.has(trade.code)}
              onChange={(checked) =>
                setCovered((current) => {
                  const next = new Set(current);
                  if (checked) next.add(trade.code);
                  else next.delete(trade.code);
                  return next;
                })
              }
            />
          ))}
          <Text style={styles.hint}>{t.coverageHint}</Text>
        </FicheCard>
      ) : null}
      {type === "urssaf" ? (
        <>
          <DateTimeFields
            date={values.dateEmission}
            minDate={monthsAgo(URSSAF_MAX_AGE_MONTHS)}
            onDate={(dateEmission) => setValues((v) => ({ ...v, dateEmission }))}
            dateLabel={t.dateEmissionUrssaf}
            error={errors.dateEmission}
          />
          <ToolField
            label={t.securityCode}
            value={values.numero}
            onChangeText={(numero) => setValues((v) => ({ ...v, numero }))}
            autoCapitalize="characters"
            hint={t.securityCodeHint}
            error={errors.numero}
          />
        </>
      ) : null}
      {type === "identite" ? (
        <DateTimeFields
          date={values.dateFin}
          minDate={tomorrow()}
          onDate={(dateFin) => setValues((v) => ({ ...v, dateFin }))}
          dateLabel={t.dateFinIdentite}
          error={errors.dateFin}
        />
      ) : null}
      {after}
      <PrivacyNote text={d.privacy} />
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  photoBlock: { gap: spacing(2.5) },
  // Photo du document en grand, sur un fond papier, avec « Reprendre » en bas à droite.
  stage: {
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: PAPER,
  },
  stageEmpty: { height: 200, alignItems: "center", justifyContent: "center" },
  stagePdf: { height: 220, alignItems: "center", justifyContent: "center" },
  page: {
    width: 110,
    height: 148,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.08)",
  },
  image: { width: "100%", aspectRatio: 4 / 3 },
  retake: { position: "absolute", right: spacing(3), bottom: spacing(3) },
  added: { fontFamily: font.semibold, fontSize: 14, color: colors.success },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  coverageTitle: {
    fontFamily: font.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
  hint: {
    marginTop: spacing(1),
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("dossier", DocumentScreen);
