import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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
 * Date et heure d'un rendez-vous (F-17) : calendrier et roue des heures (par 5 minutes) sur
 * iPhone, boîtes de dialogue sur Android, saisie au clavier dans la version web.
 */
export function DateTimeFields({
  date,
  time,
  minDate,
  onDate,
  onTime,
  error,
}: {
  /** AAAA-MM-JJ. */
  date: string | null;
  /** HH:MM. */
  time: string | null;
  /** Aujourd'hui (AAAA-MM-JJ) : pas de rendez-vous dans le passé. */
  minDate: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  error?: string;
}) {
  const [android, setAndroid] = useState<"date" | "time" | null>(null);

  if (Platform.OS === "web") {
    return (
      <View style={styles.fields}>
        <TextField label={t.dateWeb} value={date ?? ""} onChangeText={onDate} />
        <TextField label={t.timeWeb} value={time ?? ""} onChangeText={onTime} error={error} />
      </View>
    );
  }

  const day = date ?? minDate;
  return (
    <View style={styles.fields}>
      <Text style={styles.label}>{t.date}</Text>
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
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={fromIsoDate(minDate)}
          locale="fr-FR"
          accentColor={theme.colors.primary}
          onChange={(event, picked) => {
            setAndroid(null);
            if (event.type === "set" && picked) onDate(toIsoDate(picked));
          }}
        />
      ) : null}
      <Text style={styles.label}>{t.time}</Text>
      {Platform.OS === "android" ? (
        <Button
          label={time ? time.replace(":", "h") : t.pickTime}
          variant="secondary"
          onPress={() => setAndroid("time")}
        />
      ) : null}
      {Platform.OS === "ios" || android === "time" ? (
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
      {date && time ? (
        <Text style={styles.summary}>
          {t.summary(formatLongDate(date), time.replace(":", "h"))}
        </Text>
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
});
