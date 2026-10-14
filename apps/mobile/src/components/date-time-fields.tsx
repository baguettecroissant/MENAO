import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatLongDate, fromIsoDate, toIsoDate } from "@/lib/dates";
import { Button, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proAppointment;
const pad = (n: number) => String(n).padStart(2, "0");

/** Heure choisie (HH:MM), lue dans le fuseau du téléphone comme elle est affichée. */
const toClock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

function fromClock(day: string, clock: string | null): Date {
  const date = fromIsoDate(day);
  const [h, m] = (clock ?? "09:00").split(":").map(Number);
  date.setHours(h ?? 9, m ?? 0, 0, 0);
  return date;
}

/**
 * Date et heure d'un rendez-vous (F-17), ou date seule (début des travaux, F-20, absences, F-44) :
 * calendrier et roue des heures (par 5 minutes) sur iPhone, boîtes de dialogue sur Android, saisie
 * au clavier dans la version web. `compact` : sur iPhone, une pastille qui ouvre le calendrier.
 */
export function DateTimeFields({
  date,
  time = null,
  minDate,
  onDate,
  onTime,
  error,
  dateLabel = t.date,
  compact = false,
}: {
  /** AAAA-MM-JJ. */
  date: string | null;
  /** HH:MM ; sans `onTime`, la date seule est demandée. */
  time?: string | null;
  /** Aujourd'hui (AAAA-MM-JJ) : pas de rendez-vous dans le passé. */
  minDate: string;
  onDate: (date: string) => void;
  onTime?: (time: string) => void;
  error?: string;
  dateLabel?: string;
  compact?: boolean;
}) {
  const [android, setAndroid] = useState<"date" | "time" | null>(null);

  if (Platform.OS === "web") {
    return (
      <View style={styles.fields}>
        <TextField
          label={`${dateLabel} — ${t.dateWeb}`}
          value={date ?? ""}
          onChangeText={onDate}
          error={onTime ? undefined : error}
        />
        {onTime ? (
          <TextField label={t.timeWeb} value={time ?? ""} onChangeText={onTime} error={error} />
        ) : null}
      </View>
    );
  }

  const day = date ?? minDate;
  return (
    <View style={styles.fields}>
      <Text style={styles.label}>{dateLabel}</Text>
      {Platform.OS === "android" ? (
        <Button
          label={date ? formatLongDate(date) : t.pickDate}
          variant="secondary"
          onPress={() => setAndroid("date")}
        />
      ) : null}
      {Platform.OS === "ios" || android === "date" ? (
        <DateTimePicker
          value={fromIsoDate(day)}
          mode="date"
          display={Platform.OS === "ios" ? (compact ? "compact" : "inline") : "default"}
          minimumDate={fromIsoDate(minDate)}
          locale="fr-FR"
          accentColor={theme.colors.primary}
          onChange={(event, picked) => {
            setAndroid(null);
            if (event.type === "set" && picked) onDate(toIsoDate(picked));
          }}
        />
      ) : null}
      {onTime ? <Text style={styles.label}>{t.time}</Text> : null}
      {onTime && Platform.OS === "android" ? (
        <Button
          label={time ? time.replace(":", "h") : t.pickTime}
          variant="secondary"
          onPress={() => setAndroid("time")}
        />
      ) : null}
      {onTime && (Platform.OS === "ios" || android === "time") ? (
        <DateTimePicker
          value={fromClock(day, time)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minuteInterval={5}
          is24Hour
          locale="fr-FR"
          onChange={(event, picked) => {
            setAndroid(null);
            if (event.type === "set" && picked) onTime(toClock(picked));
          }}
        />
      ) : null}
      {date && onTime && time ? (
        <Text style={styles.summary}>
          {t.summary(formatLongDate(date), time.replace(":", "h"))}
        </Text>
      ) : date && !onTime ? (
        <Text style={styles.summary}>{formatLongDate(date)}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: theme.spacing(2) },
  label: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors.foreground },
  summary: { fontFamily: theme.font.medium, fontSize: 15, color: theme.colors["primary-strong"] },
  error: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors.danger },
  compactInput: {
    minWidth: 76,
    height: 40,
    justifyContent: "center",
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing(3),
    fontFamily: theme.font.regular,
    fontSize: 15,
    color: theme.colors.foreground,
  },
  compactText: { fontFamily: theme.font.regular, fontSize: 15, color: theme.colors.foreground },
});

/**
 * Heure seule (début ou fin d'un créneau bloqué, F-44) : roue des heures (par 5 minutes) sur
 * iPhone, boîte de dialogue sur Android, saisie au clavier dans la version web.
 */
export function TimeField({
  label,
  time,
  onTime,
  error,
}: {
  label: string;
  /** HH:MM. */
  time: string;
  onTime: (time: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    return (
      <TextField
        label={`${label} — ${t.timeWeb}`}
        value={time}
        onChangeText={onTime}
        error={error}
      />
    );
  }
  return (
    <View style={styles.fields}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "android" ? (
        <Button label={time.replace(":", "h")} variant="secondary" onPress={() => setOpen(true)} />
      ) : null}
      {Platform.OS === "ios" || open ? (
        <DateTimePicker
          value={fromClock(toIsoDate(new Date()), time)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minuteInterval={5}
          is24Hour
          locale="fr-FR"
          onChange={(event, picked) => {
            setOpen(false);
            if (event.type === "set" && picked) onTime(toClock(picked));
          }}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/**
 * Heure compacte (éditeur d'horaires, F-44) : pastille qui ouvre la roue sur iPhone, bouton et boîte
 * de dialogue sur Android, champ HH:MM dans la version web. `label` : nom lu par les lecteurs
 * d'écran.
 */
export function CompactTimePicker({
  label,
  time,
  onTime,
  minuteInterval = 15,
}: {
  label: string;
  /** HH:MM. */
  time: string;
  onTime: (time: string) => void;
  minuteInterval?: 5 | 15;
}) {
  const [open, setOpen] = useState(false);
  const value = fromClock(toIsoDate(new Date()), time);

  if (Platform.OS === "web") {
    return (
      <TextInput
        aria-label={label}
        value={time}
        onChangeText={onTime}
        maxLength={5}
        style={styles.compactInput}
      />
    );
  }
  if (Platform.OS === "ios") {
    return (
      <View accessible accessibilityLabel={label}>
        <DateTimePicker
          value={value}
          mode="time"
          display="compact"
          minuteInterval={minuteInterval}
          locale="fr-FR"
          accentColor={theme.colors.primary}
          onChange={(event, picked) => {
            if (event.type === "set" && picked) onTime(toClock(picked));
          }}
        />
      </View>
    );
  }
  return (
    <>
      <Pressable
        role="button"
        aria-label={label}
        onPress={() => setOpen(true)}
        style={styles.compactInput}
      >
        <Text style={styles.compactText}>{time}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          is24Hour
          onChange={(event, picked) => {
            setOpen(false);
            if (event.type === "set" && picked) onTime(toClock(picked));
          }}
        />
      ) : null}
    </>
  );
}
