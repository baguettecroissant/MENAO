import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AbsencesManager } from "@/components/availability/absences-manager";
import { HoursEditor } from "@/components/availability/hours-editor";
import { StatusCard } from "@/components/availability/status-card";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadAvailability } from "@/lib/pro-availability";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability;

/**
 * « Mes disponibilités » de l'artisan (F-44), comme sur le site : statut (pause, date de reprise),
 * horaires de travail, congés et absences. Aucun lien vers le site (règle 10).
 */
export default function AvailabilityScreen() {
  const [data, reload] = useFocusData(loadAvailability);

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {data === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <>
          <StatusCard
            status={data.status}
            paused={data.paused}
            availableFrom={data.availableFrom}
            today={data.today}
            onChanged={reload}
          />
          <HoursEditor initial={data.hours} onSaved={reload} />
          <AbsencesManager absences={data.absences} today={data.today} onChanged={reload} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
