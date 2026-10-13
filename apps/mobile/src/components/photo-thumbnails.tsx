import { X } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { theme } from "@/ui/theme";

const { colors, radius, spacing } = theme;

/**
 * Miniatures de photos (projet, F-05), comme sur le site : une croix en haut à droite retire la
 * photo quand `onRemove` est fourni.
 */
export function PhotoThumbnails({
  photos,
  alt,
  removeLabel,
  onRemove,
  disabled = false,
}: {
  photos: { key: string; uri: string | null }[];
  alt: (index: number) => string;
  removeLabel?: (index: number) => string;
  onRemove?: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.list}>
      {photos.map((photo, i) => (
        <View key={photo.key} style={styles.item}>
          {photo.uri ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} alt={alt(i + 1)} />
          ) : (
            <View style={styles.photo} />
          )}
          {onRemove ? (
            <Pressable
              role="button"
              aria-label={removeLabel?.(i + 1)}
              aria-disabled={disabled}
              disabled={disabled}
              hitSlop={8}
              onPress={() => onRemove(photo.key)}
              style={({ pressed }) => [
                styles.remove,
                disabled && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <X size={14} color={colors.surface} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  item: { position: "relative" },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radius.input,
    backgroundColor: colors.background,
  },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
