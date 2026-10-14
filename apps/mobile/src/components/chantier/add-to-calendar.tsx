import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { CalendarPlus, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { shareIcs } from "@/lib/calendar";
import { Button, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.chantier.next;
const { colors, font, radius, spacing } = theme;

/**
 * « Ajouter à mon calendrier » (F-12, maquette « Vue d'un chantier »), comme sur le site : Google
 * Agenda, Outlook ou fichier .ics pour le calendrier du téléphone.
 */
export function AddToCalendar({ event, uid }: { event: CalendarEvent; uid: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  function openWeb(url: string) {
    setOpen(false);
    void WebBrowser.openBrowserAsync(url);
  }
  async function shareFile() {
    setOpen(false);
    setFailed(!(await shareIcs(event, uid)));
  }

  const options = [
    { label: t.google, onPress: () => openWeb(googleCalendarUrl(event)) },
    { label: t.outlook, onPress: () => openWeb(outlookCalendarUrl(event)) },
    { label: t.phone, onPress: shareFile },
  ];
  return (
    <>
      <Button
        label={t.addToCalendar}
        variant="secondary"
        icon={CalendarPlus}
        onPress={() => setOpen(true)}
      />
      {failed ? <Notice tone="error">{t.failed}</Notice> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          role="button"
          aria-label={t.close}
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing(4) }]}>
          <View style={styles.handle} />
          <Text role="heading" style={styles.title}>
            {t.addToCalendar}
          </Text>
          {options.map((option) => (
            <Pressable
              key={option.label}
              role="button"
              onPress={option.onPress}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.label}>{option.label}</Text>
              <ChevronRight size={18} color={colors["muted-foreground"]} />
            </Pressable>
          ))}
          <Pressable
            role="button"
            onPress={() => setOpen(false)}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>{t.close}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: `${colors.foreground}66` },
  sheet: {
    gap: spacing(2),
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors["border-strong"],
    marginBottom: spacing(2),
  },
  title: {
    fontFamily: font.medium,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.touchTarget + 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(4),
  },
  pressed: { opacity: 0.85 },
  label: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  close: { alignItems: "center", paddingVertical: spacing(3) },
  closeText: { fontFamily: font.medium, fontSize: 15, color: colors["primary-strong"] },
});
