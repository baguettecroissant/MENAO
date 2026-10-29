import { Check, ShieldCheck, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { formatAgo } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import {
  clearPhoneBusy,
  defaultReadCalendars,
  defaultWritableCalendar,
  lastPhoneCalendarSync,
  listPhoneCalendars,
  loadPhoneCalendarPrefs,
  phoneCalendarPermission,
  phoneCalendarSupported,
  requestPhoneCalendarPermission,
  savePhoneCalendarPrefs,
  syncPhoneCalendar,
  type CalendarPermission,
  type PhoneCalendarInfo,
  type PhoneCalendarPrefs,
} from "@/lib/phone-calendar";
import { Button, Card, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.phoneCalendar;
const { colors, font, radius, spacing } = theme;

/**
 * « Calendrier de votre téléphone » (ADR 0203) : écrire les rendez-vous MENAO dans un calendrier
 * du téléphone, et tenir compte des autres rendez-vous des calendriers choisis. Réglages propres
 * à ce téléphone ; l'abonnement .ics reste proposé en dessous pour les autres appareils.
 */
export function PhoneCalendarCard() {
  const [permission, setPermission] = useState<CalendarPermission | null>(null);
  const [calendars, setCalendars] = useState<PhoneCalendarInfo[]>([]);
  const [prefs, setPrefs] = useState<PhoneCalendarPrefs | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [outcome, setOutcome] = useState<"done" | "failed" | null>(null);

  // Accès, réglages, calendriers et dernière synchronisation, relus ensemble.
  const read = useCallback(async () => {
    const status = await phoneCalendarPermission();
    return {
      status,
      prefs: await loadPhoneCalendarPrefs(),
      last: await lastPhoneCalendarSync(),
      calendars: status === "granted" ? await listPhoneCalendars().catch(() => []) : [],
    };
  }, []);

  const apply = useCallback((state: Awaited<ReturnType<typeof read>>) => {
    setPermission(state.status);
    setPrefs(state.prefs);
    setLast(state.last);
    setCalendars(state.calendars);
  }, []);

  useEffect(() => {
    let active = true;
    void read().then((state) => {
      if (active) apply(state);
    });
    return () => {
      active = false;
    };
  }, [read, apply]);

  async function update(next: PhoneCalendarPrefs) {
    setPrefs(next);
    await savePhoneCalendarPrefs(next);
    await sync();
  }

  async function sync() {
    setSyncing(true);
    setOutcome(null);
    const result = await syncPhoneCalendar({ force: true });
    setSyncing(false);
    if (result === "ok" || result === "off") {
      setLast(await lastPhoneCalendarSync());
      if (result === "ok") setOutcome("done");
    } else {
      setOutcome("failed");
      if (result === "denied") apply(await read());
    }
  }

  if (!phoneCalendarSupported || permission === null || prefs === null) return null;
  const writable = calendars.filter((c) => c.writable);

  return (
    <Card>
      <View style={styles.titleRow}>
        <Smartphone size={18} color={colors.primary} />
        <Text role="heading" style={styles.heading}>
          {t.title}
        </Text>
      </View>
      <Text style={styles.text}>{t.text}</Text>

      {permission !== "granted" ? (
        permission === "denied" ? (
          <View style={styles.group}>
            <Notice tone="info">{t.denied}</Notice>
            <LinkText label={t.openSettings} onPress={() => void Linking.openSettings()} />
          </View>
        ) : (
          <Button
            label={t.allow}
            onPress={async () => {
              const status = await requestPhoneCalendarPermission();
              setPermission(status);
              if (status !== "granted") return;
              const list = await listPhoneCalendars().catch(() => []);
              setCalendars(list);
              // Premier accès : les deux réglages activés, avec les calendriers proposés.
              await update({
                writeTo: await defaultWritableCalendar(list),
                readFrom: await defaultReadCalendars().catch(() => []),
              });
            }}
          />
        )
      ) : (
        <>
          <Toggle
            label={t.write}
            value={prefs.writeTo !== null}
            onChange={async (on) =>
              update({ ...prefs, writeTo: on ? await defaultWritableCalendar(calendars) : null })
            }
          />
          {prefs.writeTo !== null ? (
            <View style={styles.group}>
              <Text style={styles.label}>{t.writeTo}</Text>
              {writable.length === 0 ? <Text style={styles.small}>{t.noCalendar}</Text> : null}
              {writable.map((c) => (
                <CalendarRow
                  key={c.id}
                  calendar={c}
                  role="radio"
                  checked={prefs.writeTo === c.id}
                  onPress={() => update({ ...prefs, writeTo: c.id })}
                />
              ))}
            </View>
          ) : null}

          <Toggle
            label={t.read}
            value={prefs.readFrom.length > 0}
            onChange={async (on) => {
              if (!on) await clearPhoneBusy();
              await update({
                ...prefs,
                readFrom: on ? await defaultReadCalendars().catch(() => []) : [],
              });
            }}
          />
          {prefs.readFrom.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.label}>{t.readFrom}</Text>
              {calendars.map((c) => {
                const checked = prefs.readFrom.includes(c.id);
                return (
                  <CalendarRow
                    key={c.id}
                    calendar={c}
                    role="checkbox"
                    checked={checked}
                    onPress={async () => {
                      const readFrom = checked
                        ? prefs.readFrom.filter((id) => id !== c.id)
                        : [...prefs.readFrom, c.id];
                      if (readFrom.length === 0) await clearPhoneBusy();
                      await update({ ...prefs, readFrom });
                    }}
                  />
                );
              })}
            </View>
          ) : null}

          {outcome === "done" ? <Notice tone="success">{t.done}</Notice> : null}
          {outcome === "failed" ? <Notice tone="error">{t.failed}</Notice> : null}
          {prefs.writeTo !== null || prefs.readFrom.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.small}>{last ? t.lastSync(formatAgo(last)) : t.neverSynced}</Text>
              <Button label={t.syncNow} variant="secondary" loading={syncing} onPress={sync} />
            </View>
          ) : null}
          <View style={styles.privacy}>
            <ShieldCheck size={16} color={colors["muted-foreground"]} />
            <Text style={[styles.small, styles.flex]}>{t.privacy}</Text>
          </View>
        </>
      )}
    </Card>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={[styles.label, styles.flex]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        trackColor={{ true: colors.primary, false: colors["border-strong"] }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function CalendarRow({
  calendar,
  role,
  checked,
  onPress,
}: {
  calendar: PhoneCalendarInfo;
  role: "radio" | "checkbox";
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role={role}
      aria-checked={checked}
      aria-label={[calendar.title, calendar.account].filter(Boolean).join(", ")}
      onPress={onPress}
      style={[styles.calendar, checked && styles.calendarOn]}
    >
      <View style={[styles.dot, { backgroundColor: calendar.color }]} />
      <View style={styles.flex}>
        <Text style={styles.calendarTitle} numberOfLines={1}>
          {calendar.title}
        </Text>
        {calendar.account ? (
          <Text style={styles.small} numberOfLines={1}>
            {calendar.writable ? calendar.account : `${calendar.account} · ${t.readOnly}`}
          </Text>
        ) : null}
      </View>
      {checked ? <Check size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  text: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  group: { gap: spacing(2) },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  flex: { flex: 1 },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing(3), minHeight: 44 },
  calendar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    minHeight: 48,
    paddingHorizontal: spacing(3),
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  calendarOn: { borderColor: colors.primary, backgroundColor: colors["primary-softer"] },
  calendarTitle: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  dot: { width: 12, height: 12, borderRadius: 6 },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
});
