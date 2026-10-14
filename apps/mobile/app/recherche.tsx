import { MAX_PROJECT_PHOTOS, PROJECT_TEXT_MAX_LENGTH } from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnalysisScreen } from "@/components/analysis-screen";
import { DictationButton } from "@/components/dictation-button";
import { PhotoThumbnails } from "@/components/photo-thumbnails";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto, type PickedPhoto } from "@/lib/photos";
import { analyzeNeed } from "@/lib/project";
import { useTrades } from "@/lib/trades";
import { uploadBatch } from "@/lib/uploads";
import { Body, Button, Chip, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Saisie du projet (F-05), au clavier ou dictée, photos comprises (10 au plus), puis analyse par
 * l'IA : l'écran animé
 * reste affiché pendant l'analyse, qui crée le projet et pré-remplit ses critères (ADR 0012), puis
 * pendant l'envoi des photos. On passe ensuite à la vérification des critères.
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

  return (
    <View style={styles.page}>
      <Screen header={<TopBar title={fr.search.title} />}>
        <Body muted>{fr.search.intro}</Body>
        {rehire && params.nom ? <Notice tone="info">{fr.search.rehire(params.nom)}</Notice> : null}
        {failure && <Notice tone="error">{failure}</Notice>}
        <TextField
          label={fr.search.label}
          value={description}
          onChangeText={setDescription}
          placeholder={fr.search.placeholder}
          maxLength={PROJECT_TEXT_MAX_LENGTH}
          multiline
          autoFocus
        />
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
        {photos.length > 0 ? (
          <PhotoThumbnails
            // La même photo peut être choisie deux fois : repérée par sa place dans la liste.
            photos={photos.map((photo, i) => ({ key: String(i), uri: photo.uri }))}
            alt={fr.search.photos.alt}
            removeLabel={fr.search.photos.remove}
            onRemove={(key) => setPhotos((current) => current.filter((_, i) => String(i) !== key))}
          />
        ) : null}
        {photos.length < MAX_PROJECT_PHOTOS ? (
          <View style={styles.photos}>
            <Button label={fr.search.photos.add} variant="secondary" onPress={addPhotos} />
            <Text style={styles.privacy}>{fr.search.photos.hint}</Text>
          </View>
        ) : null}
        <Text style={styles.privacy}>{fr.search.privacy}</Text>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{fr.search.examplesTitle}</Text>
          <View style={styles.chips}>
            {fr.search.examples.map((example) => (
              <Chip key={example} label={example} onPress={() => setDescription(example)} />
            ))}
          </View>
        </View>
        {trades.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>{fr.search.tradeLabel}</Text>
            <View style={styles.chips}>
              {trades.map((item) => (
                <Chip
                  key={item.code}
                  label={item.label}
                  selected={trade === item.code}
                  onPress={() => setTrade(trade === item.code ? null : item.code)}
                />
              ))}
            </View>
          </View>
        )}
        <Button label={fr.search.submit} disabled={!ready} onPress={submit} />
      </Screen>
      {phase !== "idle" && <AnalysisScreen photos={phase === "photos"} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  privacy: {
    fontFamily: theme.font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors["muted-foreground"],
  },
  photos: { gap: theme.spacing(1.5) },
  group: { gap: theme.spacing(2.5) },
  groupTitle: { fontFamily: theme.font.medium, fontSize: 14, color: theme.colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
});
