import { PORTFOLIO_MAX_PHOTOS, PRESENTATION_MIN_LENGTH } from "@menao/core";
import { Camera, ImagePlus, Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
} from "@/components/pro/fiche-kit";
import { SwitchCard, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import {
  loadDossier,
  saveGoogleListing,
  savePresentation,
  type Dossier,
} from "@/lib/artisan-dossier";
import { choosePhotoSource, pickAvatar, pickPhotos, uploadPhoto } from "@/lib/photos";
import { deletePortfolioPhoto, loadPortfolio, type PortfolioPhoto } from "@/lib/portfolio";
import { forgetProfileSummary } from "@/lib/profile-summary";
import { publicUrl } from "@/lib/project";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proPublicProfile;
const { colors, font, radius, spacing } = theme;

/**
 * Photo de profil, présentation et photos de réalisations de la fiche (ADR 0113, 0124), comme sur
 * le site : photo recadrée au carré et réduite à 512 px, présentation de 100 caractères au moins,
 * 12 photos de réalisations au plus. Puis le choix d'afficher la fiche dans Google (ADR 0171).
 * Refonte « Nette » (lot 9, maquette « ProfilDossierNette ») : grand titre, cartes, photo ronde,
 * interrupteur en carte et « Enregistrer la présentation » collé en bas.
 */
function PublicProfileScreen() {
  const [dossier, reload] = useFocusData(loadDossier);
  if (dossier === undefined) return <FicheSkeleton />;
  return <PublicProfileContent dossier={dossier} onSaved={reload} />;
}

/**
 * Présentation (100 caractères au moins), avec le compteur « 12 / 100 » et, tant que le minimum
 * n'est pas atteint, « Proposer un texte » : un brouillon que l'artisan relit et modifie.
 * « Enregistrer la présentation » est collé en bas ; photo, réalisations et Google s'enregistrent
 * aussitôt.
 */
function PublicProfileContent({
  dossier,
  onSaved,
}: {
  dossier: Dossier | null;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(dossier?.presentation ?? "");
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  // Présentation proposée (presentationDraft).
  const draft = dossier?.presentationDraft ?? null;

  async function save() {
    setSending(true);
    const failure = await savePresentation(value);
    setSending(false);
    setError(failure ?? undefined);
    if (!failure) {
      toast.success(t.saved);
      void onSaved();
    }
  }

  return (
    <FicheScreen
      onRefresh={onSaved}
      footer={<FicheButton label={t.save} tall onPress={() => void save()} loading={sending} />}
    >
      <PageHead title={t.title} lead={fr.proDossier.profilHint} />
      <PhotoCard avatarPath={dossier?.avatarPath ?? null} onSaved={() => void onSaved()} />
      <FicheCard padding={4.5} gap={3}>
        <ToolField
          label={t.presentation}
          value={value}
          onChangeText={setValue}
          multiline
          numberOfLines={6}
          maxLength={2000}
          hint={t.presentationHint(PRESENTATION_MIN_LENGTH, value.trim().length)}
          error={error}
        />
        {draft && value.trim().length < PRESENTATION_MIN_LENGTH ? (
          <FicheButton
            label={t.presentationDraft}
            variant="secondary"
            icon={Sparkles}
            onPress={() => setValue(draft)}
          />
        ) : null}
      </FicheCard>
      <PortfolioCard />
      {dossier ? <GoogleCard initial={dossier.indexable} /> : null}
    </FicheScreen>
  );
}

function PhotoCard({ avatarPath, onSaved }: { avatarPath: string | null; onSaved: () => void }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const hasPhoto = avatarPath !== null;

  async function add() {
    setMessage(null);
    const source = await choosePhotoSource(t.photoTitle);
    if (!source) return;
    const picked = await pickAvatar(source);
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
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.photoTitle} size={17} />
      <View style={styles.photoRow}>
        {avatarPath ? (
          <Image
            source={{ uri: publicUrl("avatars", avatarPath) }}
            style={styles.avatar}
            alt={t.photoTitle}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Camera size={26} color={colors["primary-strong"]} />
          </View>
        )}
        <View style={styles.photoText}>
          <Text style={styles.text}>{t.photoHint}</Text>
          <FicheButton
            label={hasPhoto ? t.changePhoto : t.addPhoto}
            icon={Camera}
            variant="secondary"
            onPress={() => void add()}
            loading={sending}
          />
        </View>
      </View>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </FicheCard>
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
    setValue(next);
    const failure = await saveGoogleListing(next);
    setError(failure);
    if (failure) return setValue(!next);
    toast.success(t.googleSaved);
  }

  return (
    <SwitchCard
      label={t.google}
      hint={value ? t.googleHint : t.googleOff}
      value={value}
      onChange={(next) => void change(next)}
    >
      {error ? <Notice tone="error">{error}</Notice> : null}
    </SwitchCard>
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
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.portfolioTitle} size={17} />
      <Text style={styles.text}>{t.portfolioHint(PORTFOLIO_MAX_PHOTOS)}</Text>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      {photos === undefined ? (
        <ActivityIndicator color={colors.primary} />
      ) : list.length === 0 ? (
        <Text style={styles.text}>{t.portfolioEmpty}</Text>
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
      {progress ? <Text style={styles.text}>{progress}</Text> : null}
      {remaining > 0 ? (
        <FicheButton
          label={t.portfolioAdd}
          icon={ImagePlus}
          variant="secondary"
          onPress={() => void add()}
          loading={progress !== null}
        />
      ) : (
        <Text style={styles.text}>{t.portfolioFull(PORTFOLIO_MAX_PHOTOS)}</Text>
      )}
    </FicheCard>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  photoText: { flex: 1, gap: spacing(2.5), alignItems: "flex-start" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors["primary-soft"] },
  avatarEmpty: { alignItems: "center", justifyContent: "center" },
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

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", PublicProfileScreen);
