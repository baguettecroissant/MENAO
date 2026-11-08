import { StyleSheet, Text } from "react-native";
import { AbsencesManager } from "@/components/availability/absences-manager";
import { CalendarSync } from "@/components/availability/calendar-sync";
import { PhoneCalendarCard } from "@/components/availability/phone-calendar-card";
import { HoursEditor } from "@/components/availability/hours-editor";
import { StatusCard } from "@/components/availability/status-card";
import { FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { PlanningCard } from "@/components/pro/menao-score-card";
import { fr } from "@/i18n/fr";
import { loadAvailability } from "@/lib/pro-availability";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proAvailability;

/**
 * « Mes disponibilités » de l'artisan (F-44), comme sur le site : statut (pause, date de reprise),
 * horaires de travail, congés et absences, score MENAO et « Mon planning est à jour » (ADR 0105),
 * calendrier du téléphone (ADR 0203) et abonnement .ics. Aucun lien vers les pages du site (règle 10).
 * Refonte « Nette » (lot 8, maquette « DisponibilitesNette » en une colonne).
 */
function AvailabilityScreen() {
  const [data, reload] = useFocusData(loadAvailability);

  if (data === undefined) return <FicheSkeleton title={t.title} />;
  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      <Text style={styles.lead}>{t.intro}</Text>
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
          <PlanningCard />
          <PhoneCalendarCard />
          <CalendarSync feed={data.feed} onChanged={reload} />
        </>
      )}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.label,
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("agenda", AvailabilityScreen);
