import { PROPOSED_SLOTS_MAX, proposedSlotsError } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActionScreen, ActionSubmit, SectionLabel, SlotCard } from "@/components/pro/action-kit";
import { SoftBanner } from "@/components/pro/dossier-kit";
import { capitalize } from "@/components/pro/fiche-kit";
import { slotWarningTexts } from "@/components/pro/slot-helpers";
import { fr } from "@/i18n/fr";
import {
  formatDayAndTime,
  formatDayMonthShort,
  formatHour,
  formatTime,
  parisDateTime,
} from "@/lib/format";
import { loadAppointmentAgenda } from "@/lib/pro-agenda";
import { loadProposedSlots, proposeSlots } from "@/lib/pro-requests";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, celebrate } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAppointment;

/**
 * Accepter en un toucher (ADR 0222), comme sur le site : créneaux libres de l'agenda, les 3
 * premiers cochés ; le client en choisit un, ce qui fixe le rendez-vous. Écran d'action « Nette »
 * (lot 10) : un créneau par carte à cocher, compteur au-dessus du bouton collé en bas.
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
    <ActionScreen
      bar={t.propose}
      title={t.proposeTitle(client || null)}
      lead={t.proposeHint}
      footer={
        suggestions.length >= 2 ? (
          <ActionSubmit
            label={t.proposeSubmit}
            onPress={submit}
            loading={pending}
            disabled={selected.length < 2}
            note={t.proposeCount(selected.length)}
            noteDone={selected.length >= 2}
          />
        ) : undefined
      }
    >
      {proposed && proposed.length > 0 ? (
        <SoftBanner
          icon={CalendarClock}
          title={t.proposedTitle}
          text={`${proposed
            .map((iso) => t.suggestion(formatDayMonthShort(iso), formatTime(iso)))
            .join(" · ")}. ${t.proposedWaiting}`}
        />
      ) : null}
      {agenda && suggestions.length < 2 ? (
        <SoftBanner icon={CalendarClock} text={t.proposeNone} />
      ) : null}
      {agenda && suggestions.length >= 2 ? (
        <View style={styles.slots}>
          <SectionLabel text={t.proposeLegend} />
          {suggestions.map((iso) => {
            const values = parisDateTime(iso);
            const on = selected.includes(iso);
            return (
              <SlotCard
                key={iso}
                day={capitalize(formatDayAndTime(iso).day)}
                time={formatHour(values.time)}
                warning={slotWarningTexts(values.date, values.time, agenda)[0]}
                checked={on}
                disabled={!on && selected.length >= PROPOSED_SLOTS_MAX}
                onToggle={() => toggle(iso)}
              />
            );
          })}
        </View>
      ) : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  slots: { gap: theme.spacing(2.5) },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", ProposeSlotsScreen);
