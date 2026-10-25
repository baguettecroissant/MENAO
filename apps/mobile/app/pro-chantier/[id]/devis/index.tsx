import { allowedVatRates, quoteTotals, type VoiceLine, isExampleId } from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import { Mic, Plus, Save } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusPill } from "@/components/chantier/parts";
import { HeaderBand, whenMeta } from "@/components/header-band";
import { BottomSheet } from "@/components/bottom-sheet";
import { QuoteDictation } from "@/components/pro/quote-dictation";
import { LineCard } from "@/components/pro/quote-line-card";
import { LineForm } from "@/components/pro/quote-line-form";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatCents } from "@/lib/format";
import { loadQuoteDraft, saveQuoteDraft, type QuoteDraft } from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;

/** `generated` : ligne proposée par la dictée, à vérifier (non enregistrée). */
type Line = QuoteLineInput & { key: string; generated?: boolean };

const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const withoutKey = ({ key: _key, generated: _generated, ...line }: Line): QuoteLineInput => line;

/** Création ou modification du devis (F-19), une fois le brouillon chargé. */
export default function QuoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteDraft(id), [id]);
  const [draft] = useFocusData(load);
  if (draft === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (draft === null) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.proChantiers.notFound}</Notice>
      </Screen>
    );
  }
  return <QuoteEditor chantierId={id} draft={draft} />;
}

/**
 * Éditeur de devis (F-19), comme sur le site : lignes typées, ajout et modification dans l'écran,
 * catalogue personnel, dictée intelligente, totaux en direct (calculs de @menao/core) et statut
 * d'enregistrement. La base recalcule les totaux à l'enregistrement.
 */
function QuoteEditor({ chantierId, draft }: { chantierId: string; draft: QuoteDraft }) {
  const [lines, setLines] = useState<Line[]>(() =>
    draft.lines.map((line) => ({ ...line, key: newKey() })),
  );
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(draft.lines));
  const [hasSaved, setHasSaved] = useState(draft.saved);
  const [editing, setEditing] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const plain = lines.map(withoutKey);
  const dirty = JSON.stringify(plain) !== snapshot;
  const totals = quoteTotals(plain);
  const rates = allowedVatRates(draft.assujettiTva);
  // Taux proposé : celui de la dernière ligne, sinon le taux normal (ou 0 % en franchise).
  const defaultVat = plain.at(-1)?.vatRateBp ?? rates.at(-1) ?? 0;
  const status = dirty ? "dirty" : hasSaved ? "saved" : "draft";
  // Exemple (ADR 0184) : le devis se lit, rien ne se modifie ni ne s'envoie.
  const example = isExampleId(chantierId);

  // Modifications non enregistrées : confirmation avant de quitter l'éditeur (pas sur le web).
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(Platform.OS !== "web" && dirty && !leaving, ({ repeat }) => {
    Alert.alert(t.leaveTitle, t.leaveText, [
      { text: t.stay, style: "cancel" },
      {
        text: t.leave,
        style: "destructive",
        onPress: () => {
          setLeaving(true);
          repeat();
        },
      },
    ]);
  });

  async function persist(): Promise<boolean> {
    const toSave = plain;
    const failed = await saveQuoteDraft(chantierId, toSave);
    if (failed) {
      setError(failed);
      return false;
    }
    setSnapshot(JSON.stringify(toSave));
    setHasSaved(true);
    return true;
  }

  async function save() {
    setError(null);
    setSaving(true);
    await persist();
    setSaving(false);
  }

  /** « Générer le devis » : enregistre les modifications, puis ouvre l'aperçu (F-20). */
  async function generate() {
    setError(null);
    setGenerating(true);
    const ok = dirty ? await persist() : true;
    setGenerating(false);
    if (ok) router.push(`/pro-chantier/${chantierId}/devis/apercu`);
  }

  function upsert(key: string | null, line: QuoteLineInput) {
    setLines((current) =>
      key === null
        ? [...current, { ...line, key: newKey() }]
        : current.map((l) => (l.key === key ? { ...line, key } : l)),
    );
    setEditing(null);
  }

  function addGenerated(generated: VoiceLine[]) {
    setLines((current) => [
      ...current,
      ...generated.map((line) => ({ ...line, key: newKey(), generated: true })),
    ]);
    setDictating(false);
    setNotice(t.dictation.generated(generated.length));
  }

  return (
    <Screen
      band={
        <HeaderBand title={t.title} meta={whenMeta(draft.appointmentAt)}>
          <View style={styles.statusRow}>
            <StatusPill
              text={
                status === "dirty"
                  ? t.statusDirty
                  : status === "saved"
                    ? t.statusSaved
                    : t.statusDraft
              }
              tone={status === "dirty" ? "warning" : status === "saved" ? "success" : "neutral"}
            />
            <Pressable
              role="button"
              aria-disabled={!dirty || saving || example}
              disabled={!dirty || saving || example}
              onPress={save}
              style={styles.save}
              hitSlop={8}
            >
              <Text style={[styles.saveText, (!dirty || saving) && styles.disabled]}>{t.save}</Text>
              <Save
                size={16}
                color={!dirty || saving ? colors["subtle-foreground"] : colors["primary-strong"]}
              />
            </Pressable>
          </View>
        </HeaderBand>
      }
      footer={
        <View style={styles.footer}>
          <View style={styles.totalLine}>
            <Text style={styles.small}>{t.totalHt}</Text>
            <Text style={styles.small}>
              {lines.length ? formatCents(totals.totalHtCents) : t.none}
            </Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.text}>{t.totalTtc}</Text>
            <Text style={styles.total}>
              {lines.length ? formatCents(totals.totalTtcCents) : t.none}
            </Text>
          </View>
          {!draft.assujettiTva ? <Text style={styles.small}>{t.vatExempt}</Text> : null}
          <ExampleLock locked={example} note>
            <View style={styles.footer}>
              <Button
                label={t.dictation.open}
                variant="secondary"
                icon={Mic}
                onPress={() => setDictating(true)}
              />
              <Button
                label={t.generate}
                onPress={generate}
                loading={generating}
                disabled={lines.length === 0 || saving}
              />
            </View>
          </ExampleLock>
        </View>
      }
    >
      <View style={styles.linesHead}>
        <Text role="heading" style={styles.heading}>
          {t.lines}
        </Text>
        <Text style={styles.small}>{t.lineCount(lines.length)}</Text>
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <ExampleLock locked={example}>
        <View style={styles.lines}>
          {lines.map((line) =>
            editing === line.key ? (
              <LineForm
                key={line.key}
                title={t.editLine}
                initial={line}
                rates={rates}
                defaultVat={defaultVat}
                onSubmit={(next) => upsert(line.key, next)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <LineCard
                key={line.key}
                line={line}
                generated={line.generated}
                assujettiTva={draft.assujettiTva}
                onEdit={() => setEditing(line.key)}
                onDelete={() => setLines((current) => current.filter((l) => l.key !== line.key))}
              />
            ),
          )}
          {editing === "new" ? (
            <LineForm
              title={t.addLine}
              initial={null}
              rates={rates}
              defaultVat={defaultVat}
              onSubmit={(next) => upsert(null, next)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <Pressable role="button" onPress={() => setEditing("new")} style={styles.add}>
              <Plus size={16} color={colors["primary-strong"]} />
              <Text style={styles.addText}>{t.addManual}</Text>
            </Pressable>
          )}
        </View>
      </ExampleLock>
      {/* Maquette « Dictez votre devis » : feuille au-dessus de l'éditeur. */}
      <BottomSheet
        visible={dictating}
        onClose={() => setDictating(false)}
        title={t.dictation.title}
        closeLabel={t.dictation.close}
      >
        <QuoteDictation chantierId={chantierId} defaultVatBp={defaultVat} onLines={addGenerated} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lines: { gap: spacing(3) },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing(3),
  },
  save: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  saveText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  disabled: { color: colors["subtle-foreground"] },
  linesHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  add: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    minHeight: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
  },
  addText: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  footer: { gap: spacing(1.5) },
  totalLine: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  text: { fontFamily: font.regular, fontSize: 15, color: colors.foreground },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  total: { fontFamily: font.medium, fontSize: 20, color: colors.primary },
});
