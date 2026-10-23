import { PORTFOLIO_MAX_PHOTOS, PRESENTATION_MIN_LENGTH } from "@menao/core";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadDossier, saveGoogleListing, savePresentation } from "@/lib/artisan-dossier";
import { haptic } from "@/lib/haptics";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { deletePortfolioPhoto, loadPortfolio, type PortfolioPhoto } from "@/lib/portfolio";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen, ScreenSkeleton, TextField, Title, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPublicProfile;
const { colors, font, radius, spacing } = theme;

/**
 * Photo de profil, présentation et photos de réalisations de la fiche (ADR 0113, 0124), comme sur
 * le site : photo recadrée au carré et réduite à 512 px, présentation de 100 caractères au moins,
 * 12 photos de réalisations au plus. Puis le choix d'afficher la fiche dans Google (ADR 0171).
 */
export default function PublicProfileScreen() {
  const [dossier, reload] = useFocusData(loadDossier);
  if (dossier === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen onRefresh={reload} header={<TopBar />}>
      <Title>{t.title}</Title>
      <PhotoCard hasPhoto={Boolean(dossier?.avatarPath)} onSaved={reload} />
      <PresentationCard initial={dossier?.presentation ?? ""} onSaved={reload} />
      <PortfolioCard />
      {dossier ? <GoogleCard initial={dossier.indexable} /> : null}
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
    toast.success(t.photoDone);
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
  const [sending, setSending] = useState(false);

  async function save() {
    setSending(true);
    const failure = await savePresentation(value);
    setSending(false);
    setError(failure ?? undefined);
    if (!failure) {
      toast.success(t.saved);
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
      <Button label={t.save} onPress={save} loading={sending} />
    </Card>
  );
}

/**
 * « Afficher ma fiche dans Google » (ADR 0144, 0171), enregistré aussitôt. Ni l'adresse de la fiche
 * ni le badge : l'application ne renvoie jamais vers le site (règle 10).
 */
function GoogleCard({ initial }: { initial: boolean }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function change(next: boolean) {
    haptic.select();
    setValue(next);
    const failure = await saveGoogleListing(next);
    setError(failure);
    if (failure) return setValue(!next);
    toast.success(t.googleSaved);
  }

  return (
    <Card>
      <View style={styles.switchRow}>
        <Text style={[styles.heading, styles.switchLabel]}>{t.google}</Text>
        <Switch
          accessibilityLabel={t.google}
          value={value}
          onValueChange={change}
          trackColor={{ true: colors.primary, false: colors["border-strong"] }}
          thumbColor={colors.surface}
        />
      </View>
      <Body muted>{value ? t.googleHint : t.googleOff}</Body>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}

/** Photos de réalisations : ajout (appareil photo ou photothèque) et retrait, 12 au plus. */
function PortfolioCard() {
  const [photos, reload] = useFocusData(loadPortfolio);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const list = photos ?? [];
  const remaining = PORTFOLIO_MAX_PHOTOS - list.length;

  async function add() {
    setMessage(null);
    const source = await choosePhotoSource(t.portfolioTitle);
    if (!source) return;
    const picked = await pickPhotos(source, Math.max(remaining, 1));
    if ("error" in picked) return setMessage({ tone: "error", text: picked.error });
    const chosen = picked.photos.slice(0, remaining);
    let sent = 0;
    for (const [index, photo] of chosen.entries()) {
      setProgress(t.portfolioSending(index + 1, chosen.length));
      const status = await uploadPhoto({ purpose: "portfolio" }, photo);
      if (status !== "ok") {
        setMessage({
          tone: "error",
          text: fr.search.upload[status] ?? fr.search.upload.unavailable,
        });
        break;
      }
      sent += 1;
    }
    setProgress(null);
    if (sent > 0) {
      forgetProfileSummary();
      if (sent === chosen.length) toast.success(t.portfolioDone(sent));
    }
    await reload();
  }

  async function remove(photo: PortfolioPhoto) {
    setMessage(null);
    const ok = await deletePortfolioPhoto(photo);
    if (!ok) setMessage({ tone: "error", text: t.portfolioDeleteError });
    forgetProfileSummary();
    await reload();
  }

  return (
    <Card>
      <Text style={styles.heading}>{t.portfolioTitle}</Text>
      <Body muted>{t.portfolioHint(PORTFOLIO_MAX_PHOTOS)}</Body>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {photos === undefined ? (
        <ActivityIndicator color={colors.primary} />
      ) : list.length === 0 ? (
        <Body muted>{t.portfolioEmpty}</Body>
      ) : (
        <View style={styles.grid}>
          {list.map((photo, index) => (
            <View key={photo.id} style={styles.tile}>
              <Image
                source={{ uri: photo.url }}
                style={styles.thumb}
                alt={t.portfolioPhoto(index + 1)}
              />
              <Pressable
                role="button"
                aria-label={t.portfolioDelete(index + 1)}
                onPress={() => remove(photo)}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              >
                <X size={16} color={colors["primary-foreground"]} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {progress ? <Body muted>{progress}</Body> : null}
      {remaining > 0 ? (
        <Button
          label={t.portfolioAdd}
          icon={ImagePlus}
          variant="secondary"
          onPress={add}
          loading={progress !== null}
        />
      ) : (
        <Body muted>{t.portfolioFull(PORTFOLIO_MAX_PHOTOS)}</Body>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  switchLabel: { flex: 1 },
  heading: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  tile: { width: "31%", aspectRatio: 1 },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
  remove: {
    position: "absolute",
    top: spacing(1),
    right: spacing(1),
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 23, 40, 0.7)",
  },
  pressed: { opacity: 0.8 },
});
