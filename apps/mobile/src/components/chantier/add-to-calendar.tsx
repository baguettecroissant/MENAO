import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@menao/core";
import * as WebBrowser from "expo-web-browser";
import { CalendarPlus, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { BottomSheet } from "@/components/bottom-sheet";
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
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t.addToCalendar}
        closeLabel={t.close}
      >
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
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
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
});
