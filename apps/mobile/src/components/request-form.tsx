import { availability, parisToday } from "@menao/core";
import { router } from "expo-router";
import { BriefcaseBusiness, MapPin, Pencil } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { NeedSummaryBand } from "@/components/need-summary";
import { RadioGroup } from "@/components/radio-group";
import { fr } from "@/i18n/fr";
import type { MatchedArtisan, NeedSummary } from "@/lib/project";
import { sendRequests, type RequestValues, type SendContext } from "@/lib/requests";
import { Body, Button, Card, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;
const { colors, font, radius, spacing } = theme;
const MESSAGE_MAX = 10_000;

/**
 * Envoi de la demande aux artisans choisis (F-11), d'après la maquette « Envoyez votre demande de
 * chantier » et comme sur le site : résumé du besoin et artisans sélectionnés en haut, message
 * facultatif, coordonnées (l'artisan rappelle), préférence de rappel. Règles vérifiées en base.
 */
export function RequestForm({
  projectId,
  context,
  summary,
}: {
  projectId: string;
  context: SendContext;
  summary: NeedSummary;
}) {
  const [values, setValues] = useState<RequestValues>({
    message: context.message,
    phone: context.phone,
    callbackMode: "des_que_possible",
    callbackFrom: "",
    callbackTo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RequestValues, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (patch: Partial<RequestValues>) => setValues((current) => ({ ...current, ...patch }));
  const count = context.artisans.length;

  async function submit() {
    setFailure(null);
    setPending(true);
    const outcome = await sendRequests(
      projectId,
      context.artisans.map((a) => a.id),
      values,
    );
    setPending(false);
    if (!outcome.ok) {
      setErrors(outcome.fieldErrors ?? {});
      if (outcome.error) setFailure(outcome.error);
      return;
    }
    router.replace({
      pathname: "/projet/[id]/envoyee",
      params: {
        id: projectId,
        names: context.names,
        count: String(count),
        from: outcome.callbackFrom ?? "",
        to: outcome.callbackTo ?? "",
      },
    });
  }

  return (
    <Screen
      band={
        <NeedSummaryBand
          summary={summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id: projectId } })}
        >
          <View style={styles.selected}>
            <View style={styles.selectedHead}>
              <Text role="heading" style={styles.selectedTitle}>
                {count > 1 ? r.selected : r.selectedOne}
              </Text>
              <Pressable
                role="button"
                aria-label={r.changeSelection}
                onPress={() => router.back()}
                hitSlop={8}
                style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
              >
                <Pencil size={18} color={colors.foreground} />
              </Pressable>
            </View>
            {context.artisans.map((artisan) => (
              <SelectedArtisan key={artisan.id} artisan={artisan} tradeLabel={summary.tradeLabel} />
            ))}
          </View>
        </NeedSummaryBand>
      }
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <Button label={r.submit(count)} onPress={submit} loading={pending} />
          <Text style={styles.deadline}>{r.deadline}</Text>
        </>
      }
    >
      <Title>{r.title(context.names)}</Title>
      <Body muted>{r.intro}</Body>

      <Card>
        <Text role="heading" style={styles.heading}>
          {r.messageCardTitle}
        </Text>
        <Body muted>{r.messageHint(context.names)}</Body>
        <TextField
          label={r.messageLabel}
          value={values.message}
          onChangeText={(message) => set({ message })}
          error={errors.message}
          maxLength={MESSAGE_MAX}
          multiline
        />
        <Text style={styles.counter}>{r.messageCount(values.message.length)}</Text>
      </Card>

      <Card>
        <Text role="heading" style={styles.heading}>
          {r.contactTitle}
        </Text>
        <Body muted>{r.contactIntro}</Body>
        <View style={styles.readonly}>
          <Text style={styles.label}>{r.email}</Text>
          <Text style={styles.value}>{context.email}</Text>
        </View>
        <TextField
          label={r.phone}
          value={values.phone}
          onChangeText={(phone) => set({ phone })}
          error={errors.phone}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </Card>

      <Card>
        <RadioGroup
          legend={r.callbackTitle}
          options={[
            { value: "des_que_possible", label: r.callbackAsap },
            { value: "plage", label: r.callbackRange },
          ]}
          value={values.callbackMode}
          onChange={(callbackMode) => set({ callbackMode })}
        />
        {values.callbackMode === "plage" ? (
          <View style={styles.row}>
            <View style={styles.half}>
              <TextField
                label={r.from}
                value={values.callbackFrom}
                onChangeText={(callbackFrom) => set({ callbackFrom })}
                placeholder={r.timePlaceholder}
                error={errors.callbackFrom}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={r.to}
                value={values.callbackTo}
                onChangeText={(callbackTo) => set({ callbackTo })}
                placeholder="18:00"
                error={errors.callbackTo}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

/** Artisan sélectionné, en haut de l'écran (maquette) : photo, métier, zone, disponibilité. */
function SelectedArtisan({ artisan, tradeLabel }: { artisan: MatchedArtisan; tradeLabel: string }) {
  const avail = availability({ paused: false, availableFrom: artisan.availableFrom }, parisToday());
  const zone =
    artisan.zone.mode === "rayon" && artisan.zone.radiusKm
      ? fr.results.zoneRadius(artisan.zone.radiusKm, artisan.zone.city)
      : fr.results.zoneCommunes(artisan.zone.communes);
  return (
    <View style={styles.artisan}>
      {artisan.avatarUrl ? (
        <Image source={{ uri: artisan.avatarUrl }} style={styles.photo} alt="" />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.initial}>{artisan.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.artisanText}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {artisan.name}
          </Text>
          {avail.kind === "immediate" ? (
            <View style={styles.now}>
              <View style={styles.dot} />
              <Text style={styles.nowText}>{fr.results.availableNow}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <BriefcaseBusiness size={12} color={colors["muted-foreground"]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {fr.results.since(tradeLabel, artisan.experienceYears)}
          </Text>
        </View>
        <View style={styles.meta}>
          <MapPin size={12} color={colors["muted-foreground"]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {zone}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selected: {
    gap: spacing(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  selectedHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  edit: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    marginRight: -spacing(3),
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: colors["primary-soft"] },
  artisan: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  photo: { width: 52, height: 52, borderRadius: radius.input },
  photoEmpty: {
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: font.medium, fontSize: 20, color: colors["primary-strong"] },
  artisanText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  now: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["success-soft"],
    paddingHorizontal: spacing(2),
    paddingVertical: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  nowText: { fontFamily: font.medium, fontSize: 11, color: colors.success },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  metaText: {
    flexShrink: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  counter: {
    alignSelf: "flex-end",
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  readonly: { gap: spacing(1) },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  value: { fontFamily: font.regular, fontSize: 15, color: colors["muted-foreground"] },
  row: { flexDirection: "row", gap: spacing(3) },
  half: { flex: 1 },
  deadline: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
