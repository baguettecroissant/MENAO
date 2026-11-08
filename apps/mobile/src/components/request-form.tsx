import { availability, parisToday } from "@menao/core";
import { router } from "expo-router";
import { Pencil } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NeedSummaryBand } from "@/components/need-summary";
import { ActionScreen, ActionSubmit, RadioCards } from "@/components/pro/action-kit";
import { CardHeading, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { FieldPair, ToolField } from "@/components/pro/tools-kit";
import { ArtisanAvatar } from "@/components/request-kit";
import { fr } from "@/i18n/fr";
import type { MatchedArtisan, NeedSummary } from "@/lib/project";
import { sendRequests, type RequestValues, type SendContext } from "@/lib/requests";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;
const { colors, font, spacing } = theme;
const MESSAGE_MAX = 10_000;

/**
 * Envoi de la demande aux artisans choisis (F-11), d'après la maquette « Envoyez votre demande de
 * chantier » et comme sur le site : résumé du besoin et artisans sélectionnés en haut, message
 * facultatif, coordonnées (l'artisan rappelle), préférence de rappel. Règles vérifiées en base.
 * Écran « Nette » (lot 12, maquette « EnvoyerNette » transposée) : résumé du besoin en haut, grand
 * titre, artisans sélectionnés en liste avec photo ou initiales, message et coordonnées en cartes,
 * bouton collé en bas.
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
  const count =
    context.artisans.length + context.lots.reduce((n, lot) => n + lot.artisans.length, 0);

  async function submit() {
    setFailure(null);
    setPending(true);
    const outcome = await sendRequests(
      projectId,
      context.artisans.map((a) => a.id),
      values,
      context.lots.map((lot) => ({
        projectId: lot.projectId,
        artisanIds: lot.artisans.map((a) => a.id),
      })),
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
    <ActionScreen
      band={
        <NeedSummaryBand
          summary={summary}
          onEdit={() => router.dismissTo({ pathname: "/projet/[id]", params: { id: projectId } })}
        />
      }
      title={r.title(context.names)}
      lead={r.intro}
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <ActionSubmit
            label={r.submit(count)}
            onPress={submit}
            loading={pending}
            footnote={r.deadline}
          />
        </>
      }
    >
      <FicheCard padding={4.5} gap={1}>
        <CardHeading
          title={count > 1 ? r.selected : r.selectedOne}
          right={
            <Pressable
              role="button"
              aria-label={r.changeSelection}
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
            >
              <Pencil size={18} color={colors["primary-strong"]} />
            </Pressable>
          }
        />
        {context.artisans.map((artisan) => (
          <SelectedArtisan key={artisan.id} artisan={artisan} tradeLabel={summary.tradeLabel} />
        ))}
        {/* Autres métiers du chantier, envoyés en même temps (ADR 0170). */}
        {context.lots.flatMap((lot) =>
          lot.artisans.map((artisan) => (
            <SelectedArtisan
              key={`${lot.projectId}:${artisan.id}`}
              artisan={artisan}
              tradeLabel={lot.trade}
            />
          )),
        )}
      </FicheCard>

      <FicheCard padding={4.5} gap={3}>
        <CardHeading title={r.messageCardTitle} />
        <Text style={styles.text}>{r.messageHint(context.names)}</Text>
        <ToolField
          label={r.messageLabel}
          value={values.message}
          onChangeText={(message) => set({ message })}
          error={errors.message}
          maxLength={MESSAGE_MAX}
          multiline
        />
        <Text style={styles.counter}>{r.messageCount(values.message.length)}</Text>
      </FicheCard>

      <FicheCard padding={4.5} gap={3}>
        <CardHeading title={r.contactTitle} />
        <Text style={styles.text}>{r.contactIntro}</Text>
        <View style={styles.readonly}>
          <Text style={styles.label}>{r.email}</Text>
          <Text style={styles.value}>{context.email}</Text>
        </View>
        <ToolField
          label={r.phone}
          value={values.phone}
          onChangeText={(phone) => set({ phone })}
          error={errors.phone}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </FicheCard>

      <FicheCard padding={4.5} gap={3}>
        <RadioCards
          legend={r.callbackTitle}
          options={[
            { value: "des_que_possible", label: r.callbackAsap },
            { value: "plage", label: r.callbackRange },
          ]}
          value={values.callbackMode}
          onChange={(callbackMode) => set({ callbackMode })}
        />
        {values.callbackMode === "plage" ? (
          <FieldPair>
            <ToolField
              label={r.from}
              value={values.callbackFrom}
              onChangeText={(callbackFrom) => set({ callbackFrom })}
              placeholder={r.timePlaceholder}
              error={errors.callbackFrom}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.half}
            />
            <ToolField
              label={r.to}
              value={values.callbackTo}
              onChangeText={(callbackTo) => set({ callbackTo })}
              placeholder="18:00"
              error={errors.callbackTo}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.half}
            />
          </FieldPair>
        ) : null}
      </FicheCard>
    </ActionScreen>
  );
}

/**
 * Artisan sélectionné (maquette « EnvoyerNette ») : photo ronde ou initiales, nom, métier et
 * zone, disponibilité immédiate en pastille verte.
 */
function SelectedArtisan({ artisan, tradeLabel }: { artisan: MatchedArtisan; tradeLabel: string }) {
  const avail = availability({ paused: false, availableFrom: artisan.availableFrom }, parisToday());
  const zone =
    artisan.zone.mode === "rayon" && artisan.zone.radiusKm
      ? fr.results.zoneRadius(artisan.zone.radiusKm, artisan.zone.city)
      : fr.results.zoneCommunes(artisan.zone.communes);
  return (
    <View style={styles.artisan}>
      <ArtisanAvatar name={artisan.name} uri={artisan.avatarUrl} size={44} />
      <View style={styles.artisanText}>
        <Text style={styles.name} numberOfLines={2}>
          {artisan.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {fr.results.since(tradeLabel, artisan.experienceYears)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {zone}
        </Text>
        {avail.kind === "immediate" ? (
          <View style={styles.tag}>
            <FicheTag dot tone="success" text={fr.results.availableNow} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  edit: { marginVertical: -spacing(1) },
  pressed: { opacity: 0.7 },
  artisan: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  artisanText: { flex: 1, minWidth: 0, gap: 2 },
  tag: { paddingTop: spacing(1) },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: colors.label },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  counter: {
    alignSelf: "flex-end",
    fontFamily: font.regular,
    fontSize: 12,
    color: colors["muted-foreground"],
  },
  readonly: { gap: spacing(1) },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
  value: { fontFamily: font.regular, fontSize: 16, color: colors["muted-foreground"] },
  half: { flex: 1 },
});
