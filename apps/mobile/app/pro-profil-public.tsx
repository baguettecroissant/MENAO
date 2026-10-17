import { PRESENTATION_MIN_LENGTH } from "@menao/core";
import { Camera } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadDossier, savePresentation } from "@/lib/artisan-dossier";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPublicProfile;
const { colors, font, spacing } = theme;

/**
 * Photo de profil et présentation de la fiche (ADR 0113), comme sur le site : photo recadrée au
 * carré et réduite à 512 px, présentation de 100 caractères au moins.
 */
export default function PublicProfileScreen() {
  const [dossier, reload] = useFocusData(loadDossier);
  if (dossier === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <PhotoCard hasPhoto={Boolean(dossier?.avatarPath)} onSaved={reload} />
      <PresentationCard initial={dossier?.presentation ?? ""} onSaved={reload} />
    </Screen>
  );
}

function PhotoCard({ hasPhoto, onSaved }: { hasPhoto: boolean; onSaved: () => void }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function add() {
    setMessage(null);
    const source = await choosePhotoSource(t.photoTitle);
    if (!source) return;
    const picked = await pickPhotos(source, 1, true);
    if ("error" in picked) return setMessage({ tone: "error", text: picked.error });
    const photo = picked.photos[0];
    if (!photo) return;
    setSending(true);
    const status = await uploadPhoto({ purpose: "avatar" }, photo);
    setSending(false);
    if (status !== "ok") {
      return setMessage({
        tone: "error",
        text: fr.search.upload[status] ?? fr.search.upload.unavailable,
      });
    }
    forgetProfileSummary();
    setMessage({ tone: "success", text: t.photoDone });
    onSaved();
  }

  return (
    <Card>
      <Text style={styles.heading}>{t.photoTitle}</Text>
      <Body muted>{t.photoHint}</Body>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button
        label={hasPhoto ? t.changePhoto : t.addPhoto}
        icon={Camera}
        variant={hasPhoto ? "secondary" : "primary"}
        onPress={add}
        loading={sending}
      />
    </Card>
  );
}

function PresentationCard({ initial, onSaved }: { initial: string; onSaved: () => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  async function save() {
    setSending(true);
    setSaved(false);
    const failure = await savePresentation(value);
    setSending(false);
    setError(failure ?? undefined);
    if (!failure) {
      setSaved(true);
      onSaved();
    }
  }

  return (
    <Card>
      <TextField
        label={t.presentation}
        value={value}
        onChangeText={setValue}
        multiline
        numberOfLines={6}
        maxLength={2000}
        hint={t.presentationHint(PRESENTATION_MIN_LENGTH, value.trim().length)}
        error={error}
      />
      {saved ? <Notice tone="success">{t.saved}</Notice> : null}
      <Button label={t.save} onPress={save} loading={sending} />
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
});
