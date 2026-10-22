import { AbsencesManager } from "@/components/availability/absences-manager";
import { CalendarSync } from "@/components/availability/calendar-sync";
import { HoursEditor } from "@/components/availability/hours-editor";
import { StatusCard } from "@/components/availability/status-card";
import { PlanningCard } from "@/components/pro/menao-score-card";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadAvailability } from "@/lib/pro-availability";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Notice, Screen, ScreenSkeleton, Title } from "@/ui";

const t = fr.proAvailability;

/**
 * « Mes disponibilités » de l'artisan (F-44), comme sur le site : statut (pause, date de reprise),
 * horaires de travail, congés et absences, score MENAO et « Mon planning est à jour » (ADR 0105),
 * abonnement .ics pour le calendrier du téléphone. Aucun lien vers les pages du site (règle 10).
 */
export default function AvailabilityScreen() {
  const [data, reload] = useFocusData(loadAvailability);

  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen onRefresh={reload} header={<TopBar />}>
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
          <PlanningCard />
          <CalendarSync feed={data.feed} onChanged={reload} />
        </>
      )}
    </Screen>
  );
}
