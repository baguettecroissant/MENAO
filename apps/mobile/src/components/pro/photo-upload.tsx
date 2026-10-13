import { MAX_CHANTIER_PHOTOS_PER_BATCH } from "@menao/core";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { uploadBatch } from "@/lib/uploads";
import { Button, LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proFollowUp;
const { colors, font, spacing } = theme;

/**
 * « Ajouter une photo » au journal du chantier (F-22), comme sur le site : prise de vue ou jusqu'à
 * 10 photos de la photothèque, réduites sur le téléphone puis envoyées une à une ; le journal est
 * ensuite rechargé.
 */
export function PhotoUpload({
  chantierId,
  label = t.addPhoto,
  variant = "button",
  onAdded,
}: {
  chantierId: string;
  label?: string;
  /** Bouton (journal) ou lien (« Ce chantier est-il terminé ? »). */
  variant?: "button" | "link";
  onAdded: () => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function add() {
    if (progress) return;
    const source = await choosePhotoSource(label);
    if (!source) return;
    const picked = await pickPhotos(source, MAX_CHANTIER_PHOTOS_PER_BATCH);
    if ("error" in picked) return setNotice({ tone: "error", text: picked.error });
    if (picked.photos.length === 0) return;
    setNotice(null);
    const result = await uploadBatch(
      picked.photos,
      (photo) => uploadPhoto({ purpose: "chantier_photo", chantierId }, photo),
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);
    const problems = [
      ...(result.stopped ? [t.photoErrors[result.stopped]] : []),
      ...(result.failed ? [t.photoErrors.failed(result.failed)] : []),
    ];
    const lines = [...(result.added ? [t.photosAdded(result.added)] : []), ...problems];
    if (lines.length) {
      setNotice({ tone: problems.length ? "error" : "success", text: lines.join(" ") });
    }
    if (result.added) onAdded();
  }

  return (
    <View style={[styles.group, variant === "link" && styles.centered]}>
      {variant === "link" ? (
        <LinkText label={label} onPress={add} />
      ) : (
        <Button label={label} variant="secondary" onPress={add} loading={progress !== null} />
      )}
      {variant === "button" ? <Text style={styles.hint}>{t.photosHint}</Text> : null}
      {progress ? (
        <Text role="status" style={styles.hint}>
          {t.uploading(progress.done, progress.total)}
        </Text>
      ) : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing(2) },
  centered: { alignItems: "center" },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
