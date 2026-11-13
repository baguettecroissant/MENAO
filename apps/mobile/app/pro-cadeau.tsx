import { WELCOME_GIFT_ITEMS, type RewardSize, type WelcomeGiftItem } from "@menao/core";
import { welcomeGiftChoiceSchema, type WelcomeGift } from "@menao/validation";
import { router } from "expo-router";
import { Check, Gift, Truck } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { ActionSubmit } from "@/components/pro/action-kit";
import { FicheButton, FicheScreen, FicheSkeleton, FicheTag } from "@/components/pro/fiche-kit";
import {
  CapDrawing,
  DeliverySummary,
  GiftLabel,
  GiftTile,
  GiftTiles,
  SizePills,
  TShirtDrawing,
} from "@/components/pro/gift-kit";
import { FieldPair, ToolField } from "@/components/pro/tools-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { useFocusData } from "@/lib/use-focus-data";
import { chooseWelcomeGift, loadWelcomeGift } from "@/lib/welcome-gift";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proHub.welcomeGift;
const { colors, font, spacing } = theme;
type Field = "item" | "size" | "recipient" | "ligne" | "code_postal" | "commune";

const drawing = (item: WelcomeGiftItem, size: number) =>
  item === "tshirt" ? <TShirtDrawing size={size} /> : <CapDrawing size={size} />;

/**
 * « Mon cadeau » du filleul (F-60, ADR 0154), refonte « Nette » (lot 37, maquette
 * « RecompenseCadeauApp ») : deux grandes tuiles illustrées (t-shirt avec sa taille, ou
 * casquette), adresse de l'entreprise en résumé (« Modifier » déplie les champs) et bouton collé en
 * bas ; après l'envoi, l'article choisi et la frise Choisi → En préparation → Envoyé. La demande
 * part à l'équipe MENAO (ticket « recompense »). Ni abonnement ni achat : rien à voir avec la
 * règle 10.
 */
function WelcomeGiftScreen() {
  const [gift] = useFocusData(loadWelcomeGift);
  if (gift === undefined) return <FicheSkeleton title={t.bar} />;
  if (!gift) {
    return (
      <FicheScreen title={t.bar}>
        <Notice tone="info">{t.unavailable}</Notice>
        <FicheButton label={t.back} variant="secondary" onPress={() => router.back()} />
      </FicheScreen>
    );
  }
  if (gift.status !== "a_choisir") {
    return (
      <GiftStatus
        item={gift.item}
        size={gift.size}
        sent={gift.status === "envoye"}
        sentAt={gift.sent_at}
      />
    );
  }
  return <GiftForm gift={gift} />;
}

function GiftForm({ gift }: { gift: WelcomeGift }) {
  const [item, setItem] = useState<WelcomeGiftItem | null>(null);
  const [size, setSize] = useState<RewardSize | null>(null);
  const [values, setValues] = useState({
    recipient: gift.address.recipient ?? "",
    ligne: gift.address.ligne ?? "",
    code_postal: gift.address.code_postal ?? "",
    commune: gift.address.commune ?? "",
  });
  // Adresse de l'entreprise : affichée en résumé, modifiable sur demande (maquette).
  const [editing, setEditing] = useState(
    !values.recipient || !values.ligne || !values.code_postal || !values.commune,
  );
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  async function submit() {
    const parsed = welcomeGiftChoiceSchema.safeParse({ item: item ?? "", size, ...values });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0]])),
      );
      if (fields.recipient || fields.ligne || fields.code_postal || fields.commune)
        setEditing(true);
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await chooseWelcomeGift(parsed.data);
    setPending(false);
    if (failed) return setFailure(failed);
    setDone(true);
  }

  if (done) {
    return (
      <GiftStatus item={item} size={item === "tshirt" ? size : null} sent={false} sentAt={null} />
    );
  }
  return (
    <FicheScreen
      title={t.bar}
      footer={
        <ActionSubmit
          label={t.submit}
          icon={Gift}
          onPress={submit}
          loading={pending}
          footnote={t.note}
        />
      }
    >
      <Text style={styles.lead}>{t.lead(gift.referrer)}</Text>
      <View style={styles.group}>
        <GiftTiles label={t.itemLegend}>
          {WELCOME_GIFT_ITEMS.map((value) => (
            <GiftTile
              key={value}
              label={t.items[value]}
              drawing={drawing(value, 72)}
              selected={item === value}
              onPress={() => setItem(value)}
            />
          ))}
        </GiftTiles>
        {errors.item ? <Text style={styles.error}>{errors.item}</Text> : null}
      </View>
      {item === "tshirt" ? (
        <SizePills label={t.sizeLegend} value={size} onChange={setSize} error={errors.size} />
      ) : null}
      {editing ? (
        <View style={styles.group}>
          <GiftLabel text={t.deliveryShort} />
          <ToolField
            label={t.recipient}
            value={values.recipient}
            onChangeText={set("recipient")}
            error={errors.recipient}
            autoComplete="name"
          />
          <ToolField
            label={t.address}
            value={values.ligne}
            onChangeText={set("ligne")}
            error={errors.ligne}
            autoComplete="street-address"
          />
          <FieldPair>
            <ToolField
              label={t.postalCode}
              value={values.code_postal}
              onChangeText={set("code_postal")}
              error={errors.code_postal}
              keyboardType="number-pad"
              maxLength={5}
              autoComplete="postal-code"
              style={styles.postalCode}
            />
            <ToolField
              label={t.city}
              value={values.commune}
              onChangeText={set("commune")}
              error={errors.commune}
              style={styles.city}
            />
          </FieldPair>
        </View>
      ) : (
        <DeliverySummary
          title={t.deliveryShort}
          name={values.recipient}
          address={`${values.ligne}, ${values.code_postal} ${values.commune}`}
          caption={t.companyAddress}
          editLabel={t.edit}
          onEdit={() => setEditing(true)}
        />
      )}
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </FicheScreen>
  );
}

/**
 * Après l'envoi : l'article choisi dans une carte (dessin, « T-shirt MENAO, taille L », puce
 * d'état), la frise Choisi → En préparation → Envoyé, puis le message de l'équipe.
 */
function GiftStatus({
  item,
  size,
  sent,
  sentAt,
}: {
  item: WelcomeGiftItem | null;
  size: RewardSize | null;
  sent: boolean;
  sentAt: string | null;
}) {
  const summary = item ? t.summary(t.items[item], size) : "";
  const steps = [
    { title: t.steps.chosen, detail: summary, on: true, icon: Check, tone: colors.success },
    {
      title: t.steps.preparing,
      detail: t.steps.preparingDetail,
      on: true,
      icon: Truck,
      tone: colors.foreground,
    },
    {
      title: t.steps.sent,
      detail: sentAt ? t.steps.sentOn(formatDay(sentAt)) : t.steps.sentLater,
      on: sent,
      icon: Truck,
      tone: colors.foreground,
    },
  ];
  return (
    <FicheScreen title={t.bar}>
      <View style={[styles.card, styles.itemCard]}>
        {item ? drawing(item, 110) : null}
        {summary ? (
          <Text role="heading" style={styles.itemTitle}>
            {summary}
          </Text>
        ) : null}
        <View>
          <FicheTag
            text={sent ? t.sentTag : t.inProgress}
            tone={sent ? "success" : "primary"}
            dot
          />
        </View>
      </View>
      <View role="list" aria-label={t.stepsLabel} style={[styles.card, styles.steps]}>
        {steps.map((step) => (
          <View key={step.title} role="listitem" style={styles.step}>
            {step.on ? (
              <View style={[styles.dot, { backgroundColor: step.tone }]}>
                <step.icon size={14} color={colors["primary-foreground"]} strokeWidth={2.4} />
              </View>
            ) : (
              <View style={[styles.dot, styles.dotOff]} />
            )}
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, !step.on && styles.stepTitleOff]}>{step.title}</Text>
              {step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.done}>{sent && sentAt ? t.sent(formatDay(sentAt)) : t.done}</Text>
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.label },
  group: { gap: spacing(2) },
  error: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.danger },
  postalCode: { flex: 2 },
  city: { flex: 3 },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemCard: { alignItems: "center", gap: spacing(2) },
  itemTitle: {
    textAlign: "center",
    fontFamily: font.bold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.foreground,
  },
  steps: { gap: spacing(3) },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3) },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dotOff: {
    borderWidth: 2,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  stepText: { flex: 1, gap: 2, paddingTop: 3 },
  stepTitle: { fontFamily: font.bold, fontSize: 14, lineHeight: 19, color: colors.foreground },
  stepTitleOff: { color: colors["muted-foreground"] },
  stepDetail: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  done: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("referral", WelcomeGiftScreen);
