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
import { Button, Card, Chip, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAvailability;
const { colors, font, radius, spacing } = theme;

type Outcome = { success: string } | { error: string };

const LOOK: Record<AvailabilityStatus["kind"], { icon: LucideIcon; bg: string; fg: string }> = {
  disponible: { icon: CircleCheck, bg: colors["success-soft"], fg: colors.success },
  a_partir_du: { icon: CalendarClock, bg: colors["primary-soft"], fg: colors["primary-strong"] },
  pause: { icon: CirclePause, bg: colors["warning-soft"], fg: colors.warning },
  conges: { icon: Palmtree, bg: colors["warning-soft"], fg: colors.warning },
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
 * (pause), et date à partir de laquelle un nouveau chantier peut commencer.
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
  const { icon: Icon, bg, fg } = LOOK[status.kind];
  const { title, text } = statusText(status);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function togglePause() {
    setPending(true);
    const result = await setPaused(!paused);
    setPending(false);
    setOutcome(result);
    if ("success" in result) onChanged();
  }

  return (
    <Card>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Icon size={24} color={fg} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.eyebrow}>{t.status.title}</Text>
          <Text role="heading" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.text}>{text}</Text>
        </View>
      </View>
      <Button
        label={paused ? t.status.resumeAction : t.status.pauseAction}
        variant={paused ? "primary" : "secondary"}
        onPress={togglePause}
        loading={pending}
      />
      <OutcomeNotice outcome={outcome} />
      <AvailableFrom availableFrom={availableFrom} today={today} onChanged={onChanged} />
    </Card>
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
      <Text role="heading" style={styles.fromTitle}>
        {t.from.title}
      </Text>
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
          <Button
            label={t.from.save}
            variant="secondary"
            onPress={() => save(otherDate ?? "")}
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
  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing(4) },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headText: { flex: 1, gap: spacing(1) },
  eyebrow: {
    fontFamily: font.medium,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors["muted-foreground"],
  },
  title: { fontFamily: font.medium, fontSize: 18, color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  from: {
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(4),
  },
  fromTitle: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  small: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
});
