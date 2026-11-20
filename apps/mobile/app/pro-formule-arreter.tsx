import { router } from "expo-router";
import { Check, Info } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { haptic } from "@/lib/haptics";
import { loadStopView, stopSubscription, type StopReason } from "@/lib/plan";
import type { StopView } from "@/lib/subscription-term-view";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Chip, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPlan.stop;
const { colors, font, spacing } = theme;
const REASONS: readonly StopReason[] = ["demandes", "prix", "activite", "autre"];
/** Au-delà, la valeur passe sous le libellé. */
const SHORT_VALUE = 16;

/**
 * Arrêter mon abonnement (F-184, ADR 0383, maquette du lot 74, écrans 4 et 5), comme sur le site :
 * sans frais pendant l'essai ; pendant l'année, l'arrêt prend effet à l'échéance, date limite en
 * vue. Motif facultatif. Aucun achat ni changement de formule ici (CLAUDE.md règle 10).
 */
function StopScreen() {
  const [view, reload] = useFocusData(loadStopView);
  if (view === undefined) return <FicheSkeleton />;
  return (
    <FicheScreen onRefresh={reload}>
      <PageHead title={t.title} />
      {view === null ? (
        <Notice tone="error">{fr.errors.generic}</Notice>
      ) : view.kind === "closed" ? (
        <Notice tone="info">{fr.proPlan.stopErrors.no_subscription}</Notice>
      ) : view.kind === "requested" ? (
        <FicheCard padding={4.5}>
          <Text style={styles.body}>{view.text}</Text>
        </FicheCard>
      ) : (
        <StopForm view={view} />
      )}
    </FicheScreen>
  );
}

function StopForm({ view }: { view: Exclude<StopView, { kind: "closed" | "requested" }> }) {
  const [reason, setReason] = useState<StopReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setBusy(true);
    const failed = await stopSubscription(reason);
    setBusy(false);
    if (failed) {
      haptic.error();
      setError(failed);
      return;
    }
    haptic.success();
    router.dismissTo({ pathname: "/pro-formule", params: { arret: "ok" } });
  }

  return (
    <>
      {view.kind === "trial" ? (
        <>
          <View style={styles.trialBox}>
            <Check size={20} strokeWidth={2.6} color={colors.success} />
            <View style={styles.boxText}>
              <Text style={styles.boxTitle}>{view.title}</Text>
              <Text style={styles.boxBody}>{view.text}</Text>
            </View>
          </View>
          <FicheCard padding={4} gap={0}>
            {view.rows.map(([label, value], index) => {
              const stacked = value.length > SHORT_VALUE;
              return (
                <View
                  key={label}
                  style={[styles.row, stacked && styles.rowStacked, index > 0 && styles.rowBorder]}
                >
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={[styles.rowValue, stacked && styles.rowValueStacked]}>{value}</Text>
                </View>
              );
            })}
          </FicheCard>
        </>
      ) : view.kind === "renewal" ? (
        <>
          <Text style={styles.body}>{view.intro}</Text>
          <View style={styles.option}>
            <View style={styles.optionHead}>
              <Text style={styles.boxTitle}>{view.option}</Text>
              <Text style={styles.noFee}>{t.noFee}</Text>
            </View>
            <Text style={styles.boxBody}>{view.optionText}</Text>
          </View>
          <View style={styles.infoBox}>
            <Info size={20} color={colors.primary} />
            <View style={styles.boxText}>
              <Text style={styles.boxTitle}>{view.noExitTitle}</Text>
              <Text style={styles.boxBody}>{t.noExitText}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.body}>{view.text}</Text>
      )}

      <View style={styles.reasons}>
        <Text style={styles.legend}>{t.reasonsLegend}</Text>
        <View style={styles.chips}>
          {REASONS.map((r) => (
            <Chip
              key={r}
              label={t.reasons[r]}
              selected={reason === r}
              onPress={() => {
                haptic.select();
                setReason((current) => (current === r ? null : r));
              }}
            />
          ))}
        </View>
      </View>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <View style={styles.actions}>
        <Button label={view.confirm} loading={busy} onPress={() => void confirm()} />
        <Button label={t.keep} variant="ghost" disabled={busy} onPress={() => router.back()} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.label },
  trialBox: {
    flexDirection: "row",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 16,
    backgroundColor: colors["success-soft"],
  },
  infoBox: {
    flexDirection: "row",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  boxText: { flex: 1, gap: 2 },
  boxTitle: { flexShrink: 1, fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  boxBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  option: {
    gap: spacing(1),
    padding: spacing(4),
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  noFee: { fontFamily: font.bold, fontSize: 15, color: colors.success },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingVertical: spacing(3),
  },
  rowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  rowValueStacked: { textAlign: "left" },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { fontFamily: font.regular, fontSize: 15, color: colors.label },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: font.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  reasons: { gap: spacing(2.5) },
  legend: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  actions: { gap: spacing(1) },
});

// Le titulaire seulement, comme « Ma formule » (ADR 0241).
export default withTeamPermission("subscription", StopScreen);
