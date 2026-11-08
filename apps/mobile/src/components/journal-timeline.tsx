import type { JournalDay } from "@menao/core";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { capitalize } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import { formatAgo, formatDayLabel } from "@/lib/format";
import { theme } from "@/ui/theme";

const { colors, font, spacing } = theme;

/** « Aujourd'hui » : il y a 4 h ; sinon « Hier » ou la date. */
function whenLabel(iso: string): string {
  const day = formatDayLabel(iso);
  return capitalize(day === fr.ago.today ? formatAgo(iso) : day);
}

/**
 * Fil chronologique du suivi d'un chantier (refonte « Nette », ADR 0246), commun aux fiches de
 * l'artisan et du particulier : une entrée par jour, la plus récente en tête (point bleu), avec
 * le moment, l'auteur éventuel, les messages et les photos arrondies (ouvertes en grand d'un
 * appui). `authorOf` : auteur affiché d'une journée (« Vous », un collègue), ou rien.
 */
export function JournalTimeline({
  days,
  photoUrlByPath,
  authorOf,
}: {
  days: JournalDay[];
  photoUrlByPath: Readonly<Record<string, string>>;
  authorOf: (day: JournalDay) => string | null;
}) {
  const [viewing, setViewing] = useState<{ photos: string[]; index: number } | null>(null);
  return (
    <View style={styles.timeline}>
      {days.map((day, i) => {
        const last = i === days.length - 1;
        // Photos du jour, par leur lien signé (celles sans lien ignorées).
        const photoUrls = day.photos.flatMap((p) => {
          const url = photoUrlByPath[p];
          return url ? [url] : [];
        });
        return (
          <View key={day.day} style={styles.entry}>
            <View style={styles.rail}>
              <View style={[styles.dot, i === 0 && styles.dotRecent]} />
              {last ? null : <View style={styles.railLine} />}
            </View>
            <View style={[styles.entryBody, !last && styles.entrySpace]}>
              <Text style={styles.entryWhen}>
                {fr.proChantierFiche.entry(whenLabel(day.lastAt), authorOf(day))}
              </Text>
              {day.messages.map((m) => (
                <Text key={m.id} style={styles.entryText}>
                  {m.message}
                </Text>
              ))}
              {photoUrls.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photos}
                >
                  {photoUrls.map((uri, index) => (
                    <Pressable
                      key={uri}
                      role="button"
                      aria-label={fr.photoViewer.open(index + 1, photoUrls.length)}
                      onPress={() => setViewing({ photos: photoUrls, index })}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.photo}
                        alt={`${fr.chantier.journal.photosTitle} ${index + 1}`}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </View>
        );
      })}
      <PhotoViewer
        photos={viewing?.photos ?? []}
        index={viewing?.index ?? null}
        onClose={() => setViewing(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { paddingTop: spacing(1.5) },
  entry: { flexDirection: "row", gap: spacing(3.5) },
  rail: { alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    marginTop: 5,
    borderRadius: 6,
    backgroundColor: colors["border-strong"],
  },
  dotRecent: { backgroundColor: colors.primary },
  railLine: { flex: 1, width: 2, backgroundColor: colors.border },
  entryBody: { flex: 1, minWidth: 0, gap: spacing(2) },
  entrySpace: { paddingBottom: spacing(4.5) },
  entryWhen: { fontFamily: font.semibold, fontSize: 13, color: colors["muted-foreground"] },
  entryText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.foreground },
  photos: { gap: spacing(2) },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 10,
    backgroundColor: colors["primary-soft"],
  },
  pressed: { opacity: 0.85 },
});
