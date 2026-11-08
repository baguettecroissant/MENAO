import {
  availableFromChoices,
  type AvailabilityStatus,
  type AvailableFromChoice,
} from "@menao/core";
import {
  CalendarClock,
  CircleCheck,
  CirclePause,
  Palmtree,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DateTimeFields } from "@/components/date-time-fields";
import { fr } from "@/i18n/fr";
import { formatDayMonth, formatDayMonthShort } from "@/lib/format";
import { setAvailableFrom, setPaused } from "@/lib/pro-availability";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  TAG_TONES,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { IconSquare } from "@/components/pro/tools-kit";
import { Chip, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability;
const { colors, font, radius, spacing } = theme;

type Outcome = { success: string } | { error: string };

const LOOK: Record<AvailabilityStatus["kind"], { icon: LucideIcon; tone: FicheTone }> = {
  disponible: { icon: CircleCheck, tone: "success" },
  a_partir_du: { icon: CalendarClock, tone: "primary" },
  pause: { icon: CirclePause, tone: "warning" },
  conges: { icon: Palmtree, tone: "warning" },
};

function statusText(status: AvailabilityStatus): { title: string; text: string } {
  switch (status.kind) {
    case "pause":
      return t.status.pause;
    case "conges":
      return {
        title: t.status.conges.title(formatDayMonth(status.until)),
        text: t.status.conges.text,
      };
    case "a_partir_du":
      return {
        title: t.status.aPartirDu.title(formatDayMonth(status.date)),
        text: t.status.aPartirDu.text,
      };
    default:
      return t.status.disponible;
  }
}

function OutcomeNotice({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return null;
  return "error" in outcome ? (
    <Notice tone="error">{outcome.error}</Notice>
  ) : (
    <Notice tone="success">{outcome.success}</Notice>
  );
}

/**
 * Statut de disponibilité (F-44), comme sur le site : recevoir ou non de nouvelles demandes
 * (pause), et date à partir de laquelle un nouveau chantier peut commencer. Refonte « Nette »
 * (lot 8) : carte colorée « VOTRE STATUT » (vert si disponible), puis la date dans sa carte.
 */
export function StatusCard({
  status,
  paused,
  availableFrom,
  today,
  onChanged,
}: {
  status: AvailabilityStatus;
  paused: boolean;
  availableFrom: string | null;
  today: string;
  onChanged: () => void;
}) {
  const { icon, tone } = LOOK[status.kind];
  const c = TAG_TONES[tone];
  const { title, text } = statusText(status);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // La date (congés, reprise) se lit sous le mot court ; « Disponible » et « En pause » s'en passent.
  const dated = status.kind === "conges" || status.kind === "a_partir_du";

  async function togglePause() {
    setPending(true);
    const result = await setPaused(!paused);
    setPending(false);
    setOutcome(result);
    if ("success" in result) onChanged();
  }

  return (
    <>
      <View style={[styles.status, { backgroundColor: c.bg }]}>
        <View style={styles.head}>
          <IconSquare icon={icon} tone={tone} size={44} white />
          <View style={styles.headText}>
            <Text style={[styles.eyebrow, { color: c.fg }]}>{t.status.title.toUpperCase()}</Text>
            <Text role="heading" style={styles.title}>
              {t.status.short[status.kind]}
            </Text>
            {dated ? <Text style={styles.dated}>{title}</Text> : null}
            <Text style={styles.text}>{text}</Text>
          </View>
        </View>
        <FicheButton
          label={paused ? t.status.resumeAction : t.status.pauseAction}
          variant={paused ? "primary" : "secondary"}
          onPress={() => void togglePause()}
          loading={pending}
        />
        <OutcomeNotice outcome={outcome} />
      </View>
      <FicheCard gap={3}>
        <AvailableFrom availableFrom={availableFrom} today={today} onChanged={onChanged} />
      </FicheCard>
    </>
  );
}

/** « Nouveaux chantiers à partir du » : raccourcis (1 ou 2 semaines, 1 mois) ou autre date. */
function AvailableFrom({
  availableFrom,
  today,
  onChanged,
}: {
  availableFrom: string | null;
  today: string;
  onChanged: () => void;
}) {
  const choices = availableFromChoices(today);
  const saved = availableFrom && availableFrom > today ? availableFrom : null;
  const matching = choices.find((c) => c.date === saved)?.key ?? null;
  const [other, setOther] = useState(saved !== null && matching === null);
  const [otherDate, setOtherDate] = useState<string | null>(saved);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const label = (key: AvailableFromChoice, date: string | null) =>
    date ? t.from.choiceLabel(t.from.choices[key], formatDayMonthShort(date)) : t.from.choices[key];

  async function save(value: string) {
    if (pending) return;
    setPending(true);
    const result = await setAvailableFrom(value);
    setPending(false);
    setOutcome(result);
    if ("success" in result) onChanged();
  }

  return (
    <View style={styles.from}>
      <CardHeading title={t.from.title} size={17} />
      <Text style={styles.text}>{t.from.text}</Text>
      <View style={styles.chips}>
        {choices.map(({ key, date }) => (
          <Chip
            key={key}
            label={label(key, date)}
            selected={!other && matching === key}
            onPress={() => {
              setOther(false);
              void save(date ?? "");
            }}
          />
        ))}
        <Chip label={t.from.other} selected={other} onPress={() => setOther(!other)} />
      </View>
      {other ? (
        <>
          <DateTimeFields
            date={otherDate}
            minDate={today}
            dateLabel={t.from.otherLabel}
            onDate={setOtherDate}
            compact
          />
          <FicheButton
            label={t.from.save}
            variant="secondary"
            onPress={() => void save(otherDate ?? "")}
            loading={pending}
          />
        </>
      ) : null}
      {outcome && "error" in outcome ? (
        <Notice tone="error">{outcome.error}</Notice>
      ) : (
        <Text role="status" style={styles.small}>
          {(outcome ? `${outcome.success} ` : "") +
            (saved ? t.from.current(formatDayMonth(saved)) : t.from.now)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  status: { gap: spacing(4), borderRadius: radius.card, padding: spacing(5) },
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3.5) },
  headText: { flex: 1, gap: 2 },
  eyebrow: { fontFamily: font.bold, fontSize: 13, letterSpacing: 0.5 },
  title: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  dated: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  from: { gap: spacing(3) },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  small: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
