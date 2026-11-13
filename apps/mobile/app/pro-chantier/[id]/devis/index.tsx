import {
  allowedVatRates,
  belowMarginAlert,
  formatRateBp,
  type LibraryQuoteLine,
  lineCostCents,
  lineTotalHtCents,
  paymentSchedule,
  quoteMargin,
  quoteTotals,
  type QuoteUnit,
  type VoiceLine,
  isExampleId,
} from "@menao/core";
import type { QuoteLineInput } from "@menao/validation";
import { router, useLocalSearchParams, usePreventRemove } from "expo-router";
import { FileText, Headset, Plus, Save, Sparkles } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheHead,
  FicheRow,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
} from "@/components/pro/fiche-kit";
import { QuoteConversation } from "@/components/pro/quote-conversation";
import { QuoteDictation } from "@/components/pro/quote-dictation";
import { QuickCard, QuickStack, QuoteSteps, SavedState } from "@/components/pro/quote-kit";
import { LineCard } from "@/components/pro/quote-line-card";
import { LineForm } from "@/components/pro/quote-line-form";
import { fr } from "@/i18n/fr";
import { formatCents, formatDayAndTime } from "@/lib/format";
import type { LineCost } from "@/lib/library";
import {
  loadQuoteDraft,
  saveQuoteDraft,
  settleVoiceQuoteDrafts,
  type QuoteDraft,
} from "@/lib/pro-quotes";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { ExampleLock } from "@/components/examples";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proQuote;
const { colors, font, radius, spacing } = theme;
const vatLabel = (bp: number) => `${(bp / 100).toLocaleString("fr-FR")} %`;

/**
 * `generated` : ligne proposée par la dictée, à vérifier (non enregistrée). `unitCostCents` et
 * `workId` : coût privé de la ligne (bibliothèque d'ouvrages, ADR 0294), jamais montré au client.
 */
type Line = QuoteLineInput & { key: string; generated?: boolean } & Partial<LineCost>;

const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const withoutKey = ({
  key: _key,
  generated: _generated,
  unitCostCents: _cost,
  workId: _work,
  ...line
}: Line): QuoteLineInput => line;
const lineCost = (l: Line): LineCost => ({
  unitCostCents: l.unitCostCents ?? null,
  workId: l.workId ?? null,
});

/** Création ou modification du devis (F-19), une fois le brouillon chargé. */
function QuoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => loadQuoteDraft(id), [id]);
  const [draft] = useFocusData(load);
  if (draft === undefined) return <FicheSkeleton title={t.barTitle} />;
  if (draft === null) {
    return (
      <FicheScreen title={t.barTitle}>
        <Notice tone="error">{fr.proChantiers.notFound}</Notice>
      </FicheScreen>
    );
  }
  return <QuoteEditor chantierId={id} draft={draft} />;
}

/**
 * Éditeur de devis (F-19), refonte « Nette » (maquette « DevisApp ») : en-tête du chantier, étapes
 * Lignes · Aperçu · Envoi, cartes « créer vite » (dictée intelligente, Manon, articles déjà
 * chiffrés), lignes typées modifiées dans l'écran, totaux en direct (calculs de @menao/core) et
 * barre du bas avec le total TTC. La base recalcule les totaux à l'enregistrement.
 */
function QuoteEditor({ chantierId, draft }: { chantierId: string; draft: QuoteDraft }) {
  const [lines, setLines] = useState<Line[]>(() =>
    draft.lines.map((line, i) => ({ ...line, ...(draft.costs?.[i] ?? {}), key: newKey() })),
  );
  const [snapshot, setSnapshot] = useState(() =>
    JSON.stringify([
      draft.lines,
      draft.lines.map((_, i) => draft.costs?.[i] ?? { unitCostCents: null, workId: null }),
    ]),
  );
  const [hasSaved, setHasSaved] = useState(draft.saved);
  // Ligne en cours de modification ; « new » : nouvelle ligne, ouverte depuis « Ajouter une
  // ligne » (sous les lignes) ou depuis « Mes articles » (sous les cartes, recherche ouverte).
  const [editing, setEditing] = useState<string | null>(null);
  const [fromArticles, setFromArticles] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Devis avec Manon (ADR 0235) : lignes de l'appel en cours, remplacées à chaque proposition ;
  // brouillon à clore dès que le devis est enregistré. Pas sur la version web de l'application.
  const [calling, setCalling] = useState(false);
  const camille = useRef<Set<string>>(new Set());
  const voiceUsed = useRef(false);
  const [pendingDraft, setPendingDraft] = useState(draft.voiceDraft);

  const plain = lines.map(withoutKey);
  const costs = lines.map(lineCost);
  const dirty = JSON.stringify([plain, costs]) !== snapshot;
  // Marge (ADR 0294) : sur les lignes dont le coût est connu ; écran réservé au droit « money ».
  const margin = quoteMargin(
    lines.map((l) => ({
      totalHtCents: lineTotalHtCents(l.quantityMilli, l.unitPriceHtCents),
      costCents: lineCostCents(l.unitCostCents ?? null, l.quantityMilli),
    })),
  );
  const alertBp = draft.marginAlertBp ?? null;
  const lowMargin = belowMarginAlert(margin.markupBp, alertBp);
  const totals = quoteTotals(plain);
  const rates = allowedVatRates(draft.assujettiTva);
  // Taux proposé : celui de la dernière ligne, sinon le taux normal (ou 0 % en franchise).
  const defaultVat = plain.at(-1)?.vatRateBp ?? rates.at(-1) ?? 0;
  // Acompte prévu : échéancier par défaut de l'artisan (modifiable à l'étape « Envoi »).
  const deposit = paymentSchedule(totals.totalTtcCents, draft.defaultDeposit).find(
    (tranche) => tranche.trigger === "signature",
  );
  // Exemple (ADR 0184) : le devis se lit, rien ne se modifie ni ne s'envoie.
  const example = isExampleId(chantierId);
  const conversation = draft.conversation && Platform.OS !== "web";
  const visit = draft.appointmentAt ? formatDayAndTime(draft.appointmentAt) : null;
  const meta = [draft.clientLine, visit ? t.visit(visit.day, visit.time) : null]
    .filter(Boolean)
    .join(" · ");

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
    const toSaveCosts = costs;
    const failed = await saveQuoteDraft(chantierId, toSave, toSaveCosts);
    if (failed) {
      setError(failed);
      return false;
    }
    setSnapshot(JSON.stringify([toSave, toSaveCosts]));
    setHasSaved(true);
    if (voiceUsed.current) {
      voiceUsed.current = false;
      void settleVoiceQuoteDrafts(chantierId);
    }
    return true;
  }

  async function save() {
    setError(null);
    setSaving(true);
    await persist();
    setSaving(false);
  }

  /** « Suivant : aperçu » : enregistre les modifications, puis ouvre l'aperçu (F-20). */
  async function generate() {
    setError(null);
    setGenerating(true);
    const ok = dirty ? await persist() : true;
    setGenerating(false);
    if (ok) router.push(`/pro-chantier/${chantierId}/devis/apercu`);
  }

  function upsert(key: string | null, line: QuoteLineInput, cost?: LineCost) {
    setLines((current) =>
      key === null
        ? [...current, { ...line, ...cost, key: newKey() }]
        : current.map((l) => (l.key === key ? { ...line, ...(cost ?? lineCost(l)), key } : l)),
    );
    setEditing(null);
  }

  /** Ouvrage « détaillé » de la bibliothèque : ses lignes ajoutées d'un coup (ADR 0294). */
  function addMany(added: LibraryQuoteLine[]) {
    setLines((current) => [
      ...current,
      ...added.map((l) => ({
        type: l.type,
        designation: l.designation,
        description: l.description,
        quantityMilli: 1000,
        unit: l.unit as QuoteUnit,
        unitPriceHtCents: l.unitPriceHtCents,
        vatRateBp: rates.includes(l.vatRateBp) ? l.vatRateBp : defaultVat,
        unitCostCents: l.unitCostCents,
        workId: l.workId,
        key: newKey(),
      })),
    ]);
    setEditing(null);
  }

  function addLine(articles: boolean) {
    setFromArticles(articles);
    setEditing("new");
  }

  /** Lignes proposées par Manon : la liste de l'appel en cours remplace la précédente. */
  function setCamilleLines(next: (VoiceLine | QuoteLineInput)[]) {
    const previous = camille.current;
    const added = next.map((line) => ({ ...line, key: newKey(), generated: true }));
    camille.current = new Set(added.map((line) => line.key));
    voiceUsed.current = true;
    setLines((current) => [...current.filter((l) => !previous.has(l.key)), ...added]);
    setNotice(t.conversation.updated(added.length));
  }

  /** Brouillon d'un appel précédent : ajouté au devis, ou écarté. */
  function resumeDraft(add: boolean) {
    if (add && pendingDraft) {
      addGenerated(pendingDraft);
      voiceUsed.current = true;
    } else {
      void settleVoiceQuoteDrafts(chantierId);
    }
    setPendingDraft(null);
  }

  function addGenerated(generated: (VoiceLine | QuoteLineInput)[]) {
    setLines((current) => [
      ...current,
      ...generated.map((line) => ({ ...line, key: newKey(), generated: true })),
    ]);
    setDictating(false);
    setNotice(t.dictation.generated(generated.length));
  }

  const newLineForm = (
    <LineForm
      title={t.addLine}
      initial={null}
      rates={rates}
      defaultVat={defaultVat}
      library={!example}
      startSearching={fromArticles}
      onSubmit={(next, cost) => upsert(null, next, cost)}
      onSubmitMany={addMany}
      onCancel={() => setEditing(null)}
    />
  );

  // État d'enregistrement à droite de la barre du haut.
  const saveState = dirty ? (
    <Pressable
      role="button"
      aria-disabled={saving || example}
      disabled={saving || example}
      onPress={save}
      hitSlop={8}
      style={styles.save}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Save size={16} color={colors["primary-strong"]} />
      )}
      <Text style={styles.saveText}>{t.save}</Text>
    </Pressable>
  ) : hasSaved ? (
    <SavedState />
  ) : null;

  return (
    <FicheScreen
      title={t.barTitle}
      right={saveState}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>{t.totalTtc}</Text>
            <Text style={styles.footerAmount}>
              {lines.length ? formatCents(totals.totalTtcCents) : t.none}
            </Text>
          </View>
          <ExampleLock locked={example}>
            <FicheButton
              label={t.generate}
              tall
              onPress={generate}
              loading={generating}
              disabled={lines.length === 0 || saving}
            />
          </ExampleLock>
        </View>
      }
    >
      <FicheHead
        tags={
          <>
            <FicheTag text={t.statusDraft} tone="neutral" dot />
            {dirty ? <FicheTag text={t.statusDirty} tone="warning" /> : null}
          </>
        }
        title={draft.chantierTitle ?? t.title}
        meta={meta || null}
      />
      <QuoteSteps current="lines" />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {pendingDraft && !example ? (
        <View style={styles.draft}>
          <Text style={styles.draftText}>{t.conversation.draft(pendingDraft.length)}</Text>
          <View style={styles.draftActions}>
            <Button label={t.conversation.draftAdd} onPress={() => resumeDraft(true)} />
            <Button
              label={t.conversation.draftDiscard}
              variant="secondary"
              onPress={() => resumeDraft(false)}
            />
          </View>
        </View>
      ) : null}

      <ExampleLock locked={example} note>
        <QuickStack>
          <QuickCard
            icon={Sparkles}
            title={t.dictation.open}
            hint={t.quick.dictationHint}
            onPress={() => setDictating(true)}
          />
          {conversation ? (
            calling ? (
              <QuoteConversation
                chantierId={chantierId}
                assujettiTva={draft.assujettiTva}
                onStart={() => {
                  camille.current = new Set();
                }}
                onLines={setCamilleLines}
                onClose={() => setCalling(false)}
              />
            ) : (
              // Comprise dans les formules Premium et Entreprise : pastille d'information seule.
              <QuickCard
                icon={Headset}
                title={t.conversation.open}
                hint={t.quick.conversationHint}
                badge={t.quick.premium}
                onPress={() => setCalling(true)}
              />
            )
          ) : null}
          <QuickCard
            icon={FileText}
            title={t.quick.articles}
            hint={t.quick.articlesHint}
            tone="neutral"
            onPress={() => addLine(true)}
          />
        </QuickStack>
      </ExampleLock>
      {editing === "new" && fromArticles ? newLineForm : null}

      <ExampleLock locked={example}>
        <FicheCard padding={0} gap={0}>
          <View style={styles.linesHead}>
            <CardHeading
              title={t.lines}
              size={20}
              right={<Text style={styles.count}>{t.lineCount(lines.length)}</Text>}
            />
          </View>
          {lines.map((line, index) => (
            <View key={line.key} style={index > 0 && styles.separator}>
              {editing === line.key ? (
                <View style={styles.inset}>
                  <LineForm
                    title={t.editLine}
                    initial={line}
                    initialCost={lineCost(line)}
                    rates={rates}
                    defaultVat={defaultVat}
                    library={!example}
                    onSubmit={(next, cost) => upsert(line.key, next, cost)}
                    onSubmitMany={addMany}
                    onCancel={() => setEditing(null)}
                  />
                </View>
              ) : (
                <LineCard
                  line={line}
                  generated={line.generated}
                  assujettiTva={draft.assujettiTva}
                  costCents={
                    example
                      ? undefined
                      : lineCostCents(line.unitCostCents ?? null, line.quantityMilli)
                  }
                  onEdit={() => setEditing(line.key)}
                  onDelete={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                />
              )}
            </View>
          ))}
          <View style={[styles.inset, styles.addBox]}>
            {editing === "new" && !fromArticles ? (
              newLineForm
            ) : (
              <Pressable
                role="button"
                onPress={() => addLine(false)}
                style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
              >
                <Plus size={18} color={colors["primary-strong"]} strokeWidth={2.4} />
                <Text style={styles.addText}>{t.addManual}</Text>
              </Pressable>
            )}
          </View>
        </FicheCard>
      </ExampleLock>

      {lines.length ? (
        <FicheCard padding={4.5} gap={1}>
          <Text style={styles.eyebrow}>{t.totalsTitle}</Text>
          <FicheRow label={t.totalHt} value={formatCents(totals.totalHtCents)} />
          {draft.assujettiTva ? (
            totals.vat.map((v) => (
              <FicheRow
                key={v.rateBp}
                label={t.vatLine(vatLabel(v.rateBp))}
                value={formatCents(v.tvaCents)}
              />
            ))
          ) : (
            <Text style={styles.small}>{t.vatExempt}</Text>
          )}
          {deposit ? (
            <FicheRow
              label={t.depositLine(deposit.percent)}
              value={formatCents(deposit.amountCents)}
            />
          ) : null}
        </FicheCard>
      ) : null}
      {lines.length > 0 && !example ? (
        // « Votre marge » (ADR 0294) : pour l'artisan seul, sur les lignes au coût connu.
        <FicheCard padding={4.5} gap={1.5}>
          <View style={styles.marginHead}>
            <Text style={styles.eyebrow}>{t.library.marginTitle}</Text>
            <Text style={styles.small}>{t.library.private}</Text>
          </View>
          {margin.marginCents === null || margin.markupBp === null ? (
            <Text style={styles.small}>{t.library.none}</Text>
          ) : (
            <>
              <View style={styles.marginValue}>
                <Text style={styles.marginAmount}>{formatCents(margin.marginCents)}</Text>
                <Text
                  style={[
                    styles.marginRate,
                    (margin.markupBp < 0 || lowMargin) && styles.marginRateLow,
                  ]}
                >
                  {formatRateBp(margin.markupBp)}
                </Text>
              </View>
              <Text style={styles.small}>
                {t.library.counted(margin.counted, margin.lines)}
                {alertBp !== null ? ` ${t.library.threshold(formatRateBp(alertBp))}` : ""}
              </Text>
              {lowMargin && alertBp !== null ? (
                <Notice tone="info">
                  {t.library.below(formatRateBp(margin.markupBp), formatRateBp(alertBp))}
                </Notice>
              ) : null}
            </>
          )}
        </FicheCard>
      ) : null}

      {/* Maquette « Dictez votre devis » : feuille au-dessus de l'éditeur. */}
      <BottomSheet
        visible={dictating}
        onClose={() => setDictating(false)}
        title={t.dictation.title}
        closeLabel={t.dictation.close}
      >
        <QuoteDictation chantierId={chantierId} defaultVatBp={defaultVat} onLines={addGenerated} />
      </BottomSheet>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  marginHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  marginValue: { flexDirection: "row", alignItems: "baseline", gap: spacing(2) },
  marginAmount: {
    fontFamily: font.display,
    fontSize: 22,
    color: colors.foreground,
    fontVariant: ["tabular-nums"],
  },
  marginRate: { fontFamily: font.semibold, fontSize: 15, color: colors.success },
  marginRateLow: { color: colors.danger },
  save: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  saveText: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing(3.5) },
  footerTotal: { flex: 1 },
  footerLabel: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  footerAmount: {
    fontFamily: font.display,
    fontSize: 24,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  linesHead: { paddingHorizontal: spacing(4), paddingTop: spacing(4.5), paddingBottom: spacing(1) },
  count: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  inset: { padding: spacing(4) },
  addBox: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing(3.5) },
  add: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors["border-strong"],
  },
  addPressed: { backgroundColor: colors["primary-softer"] },
  addText: { fontFamily: font.semibold, fontSize: 15, color: colors["primary-strong"] },
  eyebrow: {
    fontFamily: font.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors["muted-foreground"],
    paddingBottom: spacing(1),
  },
  small: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  draft: {
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors["primary-softer"],
  },
  draftText: { fontFamily: font.regular, fontSize: 14, color: colors["primary-strong"] },
  draftActions: { gap: spacing(2) },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", QuoteEditorScreen);
