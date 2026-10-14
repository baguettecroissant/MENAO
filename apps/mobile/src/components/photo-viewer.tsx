import { StatusBar } from "expo-status-bar";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fr } from "@/i18n/fr";
import { theme } from "@/ui/theme";

const t = fr.photoViewer;
const { colors, font, radius, spacing } = theme;
const ICON = colors["primary-foreground"];

/**
 * Photos en grand, en plein écran, comme les photos qui s'ouvrent en grand sur le site : glisser
 * (ou les flèches) pour passer de l'une à l'autre, pincer pour zoomer sur iPhone ; « Fermer » ou
 * le bouton retour d'Android referment. `index` : photo ouverte, null quand rien n'est ouvert.
 */
export function PhotoViewer({
  photos,
  index,
  onClose,
}: {
  photos: readonly string[];
  index: number | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={index !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {index !== null ? <Gallery photos={photos} start={index} onClose={onClose} /> : null}
    </Modal>
  );
}

function Gallery({
  photos,
  start,
  onClose,
}: {
  photos: readonly string[];
  start: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<string>>(null);
  const [current, setCurrent] = useState(start);
  const several = photos.length > 1;

  function go(next: number) {
    if (next < 0 || next >= photos.length) return;
    list.current?.scrollToIndex({ index: next, animated: true });
    setCurrent(next);
  }

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <FlatList
        ref={list}
        data={photos}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(event) =>
          setCurrent(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index }) => (
          // Zoom au pincement : géré par le ScrollView sur iPhone, sans effet sur Android.
          <ScrollView
            style={{ width, height }}
            contentContainerStyle={styles.zoom}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              resizeMode="contain"
              alt={t.alt(index + 1, photos.length)}
            />
          </ScrollView>
        )}
      />
      <View style={[styles.top, { paddingTop: insets.top + spacing(2) }]}>
        <Text style={styles.counter}>{several ? t.counter(current + 1, photos.length) : ""}</Text>
        <Pressable
          role="button"
          aria-label={t.close}
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [styles.round, pressed && styles.pressed]}
        >
          <X size={22} color={ICON} />
        </Pressable>
      </View>
      {several ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(5) }]}>
          <Pressable
            role="button"
            aria-label={t.previous}
            aria-disabled={current === 0}
            disabled={current === 0}
            onPress={() => go(current - 1)}
            style={({ pressed }) => [
              styles.round,
              current === 0 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <ChevronLeft size={22} color={ICON} />
          </Pressable>
          <Pressable
            role="button"
            aria-label={t.next}
            aria-disabled={current === photos.length - 1}
            disabled={current === photos.length - 1}
            onPress={() => go(current + 1)}
            style={({ pressed }) => [
              styles.round,
              current === photos.length - 1 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <ChevronRight size={22} color={ICON} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.foreground },
  zoom: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(4),
  },
  counter: { fontFamily: font.medium, fontSize: 15, color: ICON },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing(6),
  },
  round: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    borderRadius: radius.pill,
    // Fond sombre translucide : boutons lisibles sur une photo claire comme sombre.
    backgroundColor: `${colors.foreground}99`,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
