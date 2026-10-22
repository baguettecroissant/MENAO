import { MAX_PROJECT_PHOTOS } from "@menao/core";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { PhotoThumbnails } from "@/components/photo-thumbnails";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { deleteProjectPhoto, loadProjectPhotos, type ProjectPhoto } from "@/lib/project";
import { Body, Button, Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.review.photos;

/**
 * « Photos supplémentaires » du projet (F-05, F-07), comme sur le site : ajout (10 photos au plus)
 * et suppression, la liste étant relue après chaque changement.
 */
export function ProjectPhotosCard({
  projectId,
  initial,
  advise = false,
}: {
  projectId: string;
  initial: ProjectPhoto[];
  /** Description encore vague (ADR 0163) : photos conseillées tant qu'il n'y en a aucune. */
  advise?: boolean;
}) {
  const [photos, setPhotos] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function add() {
    const source = await choosePhotoSource(t.add);
    if (!source) return;
    const picked = await pickPhotos(source, MAX_PROJECT_PHOTOS - photos.length);
    if ("error" in picked) return setErrors([picked.error]);
    if (picked.photos.length === 0) return;
    setErrors([]);
    setBusy(true);
    const failures: string[] = [];
    for (const photo of picked.photos) {
      const status = await uploadPhoto({ purpose: "project_photo", projectId }, photo);
      if (status !== "ok") failures.push(fr.search.upload[status]);
    }
    setPhotos(await loadProjectPhotos(projectId));
    setErrors([...new Set(failures)]);
    setBusy(false);
  }

  async function remove(photoId: string) {
    setBusy(true);
    const error = await deleteProjectPhoto(projectId, photoId);
    setPhotos(await loadProjectPhotos(projectId));
    setErrors(error ? [error] : []);
    setBusy(false);
  }

  return (
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.title}
      </Text>
      <Body muted>{t.description}</Body>
      {advise && photos.length === 0 ? <Notice tone="info">{t.advice}</Notice> : null}
      {errors.map((message) => (
        <Notice key={message} tone="error">
          {message}
        </Notice>
      ))}
      {photos.length > 0 ? (
        <PhotoThumbnails
          photos={photos.map((photo) => ({ key: photo.id, uri: photo.url }))}
          alt={t.alt}
          removeLabel={t.delete}
          onRemove={remove}
          disabled={busy}
        />
      ) : (
        <Body muted>{t.none}</Body>
      )}
      {photos.length < MAX_PROJECT_PHOTOS ? (
        <>
          <Button label={t.add} variant="secondary" onPress={add} loading={busy} />
          <Text style={styles.hint}>{t.addHelp}</Text>
        </>
      ) : (
        <Text style={styles.hint}>{t.limit}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: theme.font.medium, fontSize: 17, color: theme.colors.foreground },
  hint: { fontFamily: theme.font.regular, fontSize: 13, color: theme.colors["muted-foreground"] },
});
