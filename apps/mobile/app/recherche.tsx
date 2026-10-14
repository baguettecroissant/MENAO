import { MAX_PROJECT_PHOTOS, PROJECT_TEXT_MAX_LENGTH, needHelpLevel } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import {
  BadgeCheck,
  Clock,
  Info,
  Paperclip,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnalysisScreen } from "@/components/analysis-screen";
import { DictationButton } from "@/components/dictation-button";
import { PhotoThumbnails } from "@/components/photo-thumbnails";
import { TopBar } from "@/components/top-bar";
import { TradeShortcuts } from "@/components/trade-shortcuts";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto, type PickedPhoto } from "@/lib/photos";
import { analyzeNeed } from "@/lib/project";
import { useTrades } from "@/lib/trades";
import { uploadBatch } from "@/lib/uploads";
import { Button, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
// Icônes des cartes d'avantages, dans l'ordre des textes (comme sur le site).
const FEATURE_ICONS = [Sparkles, Clock, ShieldCheck, BadgeCheck];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Saisie du projet (F-05) d'après la maquette « Recherche », comme sur le site : zone de saisie
 * avec trombone (photos, 10 au plus) et micro (dictée), aide progressive, raccourcis métiers et
 * avantages. L'analyse par l'IA crée le projet et pré-remplit ses critères (ADR 0012) ; l'écran
 * animé reste affiché pendant l'analyse puis l'envoi des photos, avant la vérification des critères.
 * « Redemander un devis » (`artisan`, `depuis`, `nom`) : l'artisan d'un chantier précédent est
 * proposé en premier ; le nom ne sert qu'au bandeau, le serveur vérifie le chantier commun.
 */
export default function Recherche() {
  const params = useLocalSearchParams<{
    metier?: string;
    artisan?: string;
    depuis?: string;
    nom?: string;
  }>();
  const rehire =
    params.artisan && params.depuis && UUID.test(params.artisan) && UUID.test(params.depuis)
      ? { artisanId: params.artisan, chantierId: params.depuis }
      : null;
  const trades = useTrades();
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<string | null>(params.metier ?? null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "photos">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const ready = description.trim().length > 0;

  async function addPhotos() {
    const source = await choosePhotoSource(fr.search.photos.add);
    if (!source) return;
    const picked = await pickPhotos(source, MAX_PROJECT_PHOTOS - photos.length);
    if ("error" in picked) return setFailure(picked.error);
    setFailure(null);
    setPhotos((current) => [...current, ...picked.photos].slice(0, MAX_PROJECT_PHOTOS));
  }

  async function submit() {
    if (!ready || phase !== "idle") return;
    setFailure(null);
    setPhase("analyzing");
    const result = await analyzeNeed(description.trim(), trade, rehire);
    if (result.status !== "ok") {
      setPhase("idle");
      return setFailure(fr.search.errors[result.status]);
    }
    let failed = false;
    if (photos.length) {
      // Comme sur le site : les photos rejoignent le projet créé par l'analyse.
      setPhase("photos");
      const project = { purpose: "project_photo", projectId: result.projectId } as const;
      const sent = await uploadBatch(photos, (photo) => uploadPhoto(project, photo));
      failed = sent.added < photos.length;
    }
    router.replace({
      pathname: "/projet/[id]",
      params: failed ? { id: result.projectId, photos: "erreur" } : { id: result.projectId },
    });
  }

  const help = needHelpLevel(description);
  return (
    <View style={styles.page}>
      <Screen header={<TopBar />}>
        {/* Maquette « Recherche » : titre, accroche, zone de saisie avec trombone et micro. */}
        <View style={styles.hero}>
          <Text role="heading" style={styles.title}>
            {fr.search.titleStart} <Text style={styles.accent}>{fr.search.titleAccent}</Text>
          </Text>
          <View style={styles.tagline}>
            <Sparkles size={15} color={colors["primary-strong"]} />
            <Text style={styles.taglineText}>{fr.search.tagline}</Text>
          </View>
        </View>
        {rehire && params.nom ? <Notice tone="info">{fr.search.rehire(params.nom)}</Notice> : null}
        {failure && <Notice tone="error">{failure}</Notice>}
        <View style={[styles.box, focused && styles.boxFocused]}>
          {photos.length > 0 ? (
            <View style={styles.boxPhotos} aria-label={fr.search.photos.count(photos.length)}>
              <PhotoThumbnails
                // La même photo peut être choisie deux fois : repérée par sa place dans la liste.
                photos={photos.map((photo, i) => ({ key: String(i), uri: photo.uri }))}
                alt={fr.search.photos.alt}
                removeLabel={fr.search.photos.remove}
                onRemove={(key) =>
                  setPhotos((current) => current.filter((_, i) => String(i) !== key))
                }
              />
            </View>
          ) : null}
          <TextInput
            aria-label={fr.search.label}
            value={description}
            onChangeText={setDescription}
            placeholder={fr.search.placeholder}
            placeholderTextColor={colors["subtle-foreground"]}
            maxLength={PROJECT_TEXT_MAX_LENGTH}
            multiline
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          <View style={styles.boxActions}>
            <Pressable
              role="button"
              aria-label={fr.search.attach}
              accessibilityHint={fr.search.photos.hint}
              disabled={photos.length >= MAX_PROJECT_PHOTOS}
              onPress={addPhotos}
              style={({ pressed }) => [
                styles.attach,
                photos.length >= MAX_PROJECT_PHOTOS && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Paperclip size={17} color={colors["muted-foreground"]} />
            </Pressable>
            <DictationButton
              onText={(spoken) =>
                setDescription((current) =>
                  (current.trim() ? `${current.trim()} ${spoken}` : spoken).slice(
                    0,
                    PROJECT_TEXT_MAX_LENGTH,
                  ),
                )
              }
              onError={setFailure}
            />
          </View>
        </View>
        <View aria-live="polite" style={styles.help}>
          {help === "suffisant" ? (
            <>
              <Sparkles size={14} color={colors["primary-strong"]} />
              <Text style={[styles.helpText, styles.helpEnough]}>{fr.search.helpEnough}</Text>
            </>
          ) : (
            <>
              <Info size={14} color={colors["muted-foreground"]} />
              <Text style={styles.helpText}>
                {help === "vide" ? fr.search.helpEmpty : fr.search.helpShort}
              </Text>
            </>
          )}
        </View>
        {trades.length > 0 && (
          <TradeShortcuts
            trades={trades}
            selected={trade}
            onToggle={(code) => setTrade((current) => (current === code ? null : code))}
          />
        )}
        <Button label={fr.search.submit} icon={Search} disabled={!ready} onPress={submit} />
        <Text style={styles.privacy}>{fr.search.privacy}</Text>
        <View style={styles.features}>
          {fr.search.features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <View key={feature.title} style={styles.feature}>
                <View style={styles.featureHead}>
                  <Icon size={16} color={colors.primary} />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </View>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </View>
            );
          })}
        </View>
      </Screen>
      {phase !== "idle" && <AnalysisScreen photos={phase === "photos"} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { alignItems: "center", gap: spacing(2), paddingTop: spacing(2) },
  title: {
    fontFamily: font.medium,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    color: colors.foreground,
  },
  accent: { color: colors.primary },
  tagline: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  taglineText: { fontFamily: font.regular, fontSize: 14, color: colors["primary-strong"] },
  box: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 2px 10px rgba(17, 23, 40, 0.06)",
  },
  boxFocused: { borderColor: colors.primary },
  boxPhotos: { paddingHorizontal: spacing(4), paddingTop: spacing(4) },
  input: {
    minHeight: 110,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  boxActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },
  attach: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  help: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  helpText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  helpEnough: { color: colors["primary-strong"] },
  privacy: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  features: { gap: spacing(3), paddingTop: spacing(2) },
  feature: {
    gap: spacing(1.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  featureHead: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  featureTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  featureBody: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
});
