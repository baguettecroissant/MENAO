import { PROPOSED_SLOTS_MAX, proposedSlotsError } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDayMonthShort, formatTime } from "@/lib/format";
import { loadAppointmentAgenda } from "@/lib/pro-agenda";
import { loadProposedSlots, proposeSlots } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Chip, Notice, Screen, Title, celebrate } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAppointment;

/**
 * Accepter en un toucher (ADR 0222), comme sur le site : créneaux libres de l'agenda, les 3
 * premiers cochés ; le client en choisit un, ce qui fixe le rendez-vous.
 */
function ProposeSlotsScreen() {
  const { id, client = "" } = useLocalSearchParams<{ id: string; client?: string }>();
  const [agenda] = useFocusData(useCallback(() => loadAppointmentAgenda(), []));
  const [proposed] = useFocusData(useCallback(() => loadProposedSlots(id), [id]));
  const suggestions = agenda?.suggestions ?? [];
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Les 3 premiers créneaux cochés tant que l'artisan n'a rien changé.
  const selected = chosen ?? suggestions.slice(0, PROPOSED_SLOTS_MAX);

  function toggle(iso: string) {
    setChosen(
      selected.includes(iso)
        ? selected.filter((v) => v !== iso)
        : selected.length < PROPOSED_SLOTS_MAX
          ? [...selected, iso]
          : selected,
    );
  }

  async function submit() {
    const invalid = proposedSlotsError(
      selected.map((iso) => new Date(iso)),
      new Date(),
    );
    if (invalid) return setFailure(t.proposeErrors[invalid]);
    setFailure(null);
    setPending(true);
    const result = await proposeSlots(id, selected);
    setPending(false);
    if (result) return setFailure(result.error);
    celebrate(fr.moments.slotsProposed);
    router.back();
  }

  return (
    <Screen
      header={<TopBar />}
      footer={
        suggestions.length >= 2 ? (
          <Button
            label={t.proposeSubmit}
            onPress={submit}
            loading={pending}
            disabled={selected.length < 2}
          />
        ) : undefined
      }
    >
      <Title>{t.proposeTitle(client || null)}</Title>
      {proposed && proposed.length > 0 ? (
        <Notice tone="info">
          {`${t.proposedTitle} : ${proposed
            .map((iso) => t.suggestion(formatDayMonthShort(iso), formatTime(iso)))
            .join(" · ")}. ${t.proposedWaiting}`}
        </Notice>
      ) : null}
      {agenda && suggestions.length < 2 ? <Notice tone="info">{t.proposeNone}</Notice> : null}
      {suggestions.length >= 2 ? (
        <View style={styles.group}>
          <Text role="heading" style={styles.title}>
            {t.proposeLegend}
          </Text>
          <View style={styles.chips}>
            {suggestions.map((iso) => (
              <Chip
                key={iso}
                label={t.suggestion(formatDayMonthShort(iso), formatTime(iso))}
                selected={selected.includes(iso)}
                onPress={() => toggle(iso)}
              />
            ))}
          </View>
          <Text style={styles.hint}>{t.proposeCount(selected.length)}</Text>
        </View>
      ) : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Body muted>{t.proposeHint}</Body>
    </Screen>
  );
}

const { colors, font, spacing } = theme;
const styles = StyleSheet.create({
  group: { gap: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", ProposeSlotsScreen);
