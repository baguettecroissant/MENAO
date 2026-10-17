import {
  KBIS_MAX_AGE_MONTHS,
  REQUIRED_DOCUMENT_TYPES,
  type RequiredDocumentType,
} from "@menao/core";
import { documentMetadataSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, ImageIcon } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { DateTimeFields } from "@/components/date-time-fields";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadDossier } from "@/lib/artisan-dossier";
import { pickPhotos, uploadPhoto, type PickedPhoto } from "@/lib/photos";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDocument;
const d = fr.proDossier;
const { colors, font, radius, spacing } = theme;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
function monthsAgo(months: number): string {
  const now = new Date();
  return isoDay(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate())),
  );
}

/**
 * Un document du dossier, en photo (ADR 0113) : appareil photo ou photothèque, puis les mêmes
 * champs et contrôles que le site (documentMetadataSchema), envoi par process-upload.
 */
export default function DocumentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = REQUIRED_DOCUMENT_TYPES.find((value) => value === params.type);
  const [dossier] = useFocusData(loadDossier);
  if (!type) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="error">{fr.errors.generic}</Notice>
      </Screen>
    );
  }
  const locked = dossier?.status === "en_verification";
  return (
    <Screen header={<TopBar />}>
      <Title>{d.documents[type]}</Title>
      <Body muted>{t.photoHint}</Body>
      {locked ? <Notice tone="info">{t.locked}</Notice> : <DocumentForm type={type} />}
    </Screen>
  );
}

function DocumentForm({ type }: { type: RequiredDocumentType }) {
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [values, setValues] = useState({
    dateEmission: null as string | null,
    dateFin: null as string | null,
    assureur: "",
    numero: "",
    couverture: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const insurance = type === "decennale" || type === "rc_pro";

  async function pick(source: "camera" | "library") {
    setFailure(null);
    const picked = await pickPhotos(source, 1);
    if ("error" in picked) return setFailure(picked.error);
    if (picked.photos[0]) setPhoto(picked.photos[0]);
  }

  async function send() {
    const parsed = documentMetadataSchema().safeParse({
      type,
      dateEmission: values.dateEmission ?? "",
      dateFin: values.dateFin ?? "",
      assureur: values.assureur,
      numero: values.numero,
      couverture: values.couverture,
    });
    const fieldErrors: Record<string, string | undefined> = parsed.success
      ? {}
      : Object.fromEntries(
          Object.entries(
            z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
          ).map(([key, list]) => [key, list?.[0]]),
        );
    if (!photo) fieldErrors.photo = t.photoRequired;
    setErrors(fieldErrors);
    if (!parsed.success || !photo) return;
    setSending(true);
    setFailure(null);
    const status = await uploadPhoto({ purpose: "document", document: parsed.data }, photo);
    setSending(false);
    if (status !== "ok")
      return setFailure(fr.search.upload[status] ?? fr.search.upload.unavailable);
    router.back();
  }

  return (
    <>
      {photo ? (
        <View style={styles.preview}>
          <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" alt="" />
          <Text style={styles.added}>{t.added}</Text>
        </View>
      ) : null}
      <View style={styles.buttons}>
        <Button label={photo ? t.replace : t.take} icon={Camera} onPress={() => pick("camera")} />
        <Button
          label={t.choose}
          icon={ImageIcon}
          variant="secondary"
          onPress={() => pick("library")}
        />
      </View>
      {errors.photo ? <Notice tone="error">{errors.photo}</Notice> : null}

      {type === "kbis" ? (
        <DateTimeFields
          date={values.dateEmission}
          minDate={monthsAgo(KBIS_MAX_AGE_MONTHS)}
          onDate={(dateEmission) => setValues((v) => ({ ...v, dateEmission }))}
          dateLabel={t.dateEmission}
          error={errors.dateEmission}
        />
      ) : null}
      {insurance ? (
        <>
          <TextField
            label={t.assureur}
            value={values.assureur}
            onChangeText={(assureur) => setValues((v) => ({ ...v, assureur }))}
            error={errors.assureur}
          />
          <TextField
            label={t.numero}
            value={values.numero}
            onChangeText={(numero) => setValues((v) => ({ ...v, numero }))}
            autoCapitalize="characters"
            error={errors.numero}
          />
          <DateTimeFields
            date={values.dateFin}
            minDate={isoDay(new Date())}
            onDate={(dateFin) => setValues((v) => ({ ...v, dateFin }))}
            dateLabel={t.dateFin}
            error={errors.dateFin}
          />
        </>
      ) : null}
      {type === "decennale" ? (
        <TextField
          label={t.couverture}
          value={values.couverture}
          onChangeText={(couverture) => setValues((v) => ({ ...v, couverture }))}
          placeholder={t.couverturePlaceholder}
          error={errors.couverture}
        />
      ) : null}
      {type === "identite" ? (
        <DateTimeFields
          date={values.dateFin}
          minDate={isoDay(new Date())}
          onDate={(dateFin) => setValues((v) => ({ ...v, dateFin }))}
          dateLabel={t.dateFinIdentite}
          error={errors.dateFin}
        />
      ) : null}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.send} onPress={send} loading={sending} />
    </>
  );
}

const styles = StyleSheet.create({
  preview: { gap: spacing(2) },
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.card,
    backgroundColor: colors["primary-softer"],
  },
  added: { fontFamily: font.medium, fontSize: 14, color: colors.success },
  buttons: { gap: spacing(2.5) },
});
