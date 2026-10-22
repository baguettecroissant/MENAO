import {
  REWARD_SIZES,
  WELCOME_GIFT_ITEMS,
  type RewardSize,
  type WelcomeGiftItem,
} from "@menao/core";
import { welcomeGiftChoiceSchema, type WelcomeGift } from "@menao/validation";
import { router } from "expo-router";
import { CircleCheck, Gift, MapPin } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { useFocusData } from "@/lib/use-focus-data";
import { chooseWelcomeGift, loadWelcomeGift } from "@/lib/welcome-gift";
import { Body, Button, LinkText, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proHub.welcomeGift;
const { colors, font, radius, spacing } = theme;
type Field = "item" | "size" | "recipient" | "ligne" | "code_postal" | "commune";

/**
 * Cadeau de bienvenue du filleul (F-60, ADR 0154) : t-shirt (avec sa taille) ou casquette, adresse
 * de livraison pré-remplie avec celle de l'entreprise. La demande part à l'équipe MENAO (ticket
 * « recompense »), qui organise l'envoi. Ni abonnement ni achat : rien à voir avec la règle 10.
 */
export default function WelcomeGiftScreen() {
  const [gift] = useFocusData(loadWelcomeGift);
  if (gift === undefined) return <Screen header={<TopBar />}>{null}</Screen>;
  if (!gift) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="info">{t.unavailable}</Notice>
        <Button label={t.back} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (gift.status !== "a_choisir") {
    return (
      <Screen header={<TopBar />}>
        <View style={styles.hero}>
          <Gift size={48} color={colors.primary} />
          <Text role="heading" style={styles.title}>
            {t.title}
          </Text>
          <Body center>{gift.item ? t.summary(t.items[gift.item], gift.size) : ""}</Body>
          <Body muted center>
            {gift.status === "envoye" && gift.sent_at ? t.sent(formatDay(gift.sent_at)) : t.pending}
          </Body>
        </View>
        <Button label={t.back} variant="secondary" onPress={() => router.back()} />
      </Screen>
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
  // Adresse de l'entreprise : affichée en résumé, modifiable sur demande (comme les récompenses).
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
      <Screen header={<TopBar />}>
        <View style={styles.hero}>
          <CircleCheck size={56} color={colors.primary} />
          <Text role="heading" style={styles.title}>
            {t.done}
          </Text>
        </View>
        <Button label={t.back} onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={
        <View style={styles.footer}>
          <Button label={t.submit} onPress={submit} loading={pending} />
          <Text style={[styles.small, styles.center]}>{t.note}</Text>
        </View>
      }
    >
      <View style={styles.hero}>
        <Gift size={48} color={colors.primary} />
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
        <Body muted center>
          {t.lead(gift.referrer)}
        </Body>
      </View>
      <View style={styles.card}>
        <Choices
          label={t.itemLegend}
          options={WELCOME_GIFT_ITEMS.map((value) => ({ value, label: t.items[value] }))}
          value={item}
          onChange={setItem}
          error={errors.item}
        />
        {item === "tshirt" ? (
          <Choices
            label={t.sizeLegend}
            options={REWARD_SIZES.map((value) => ({ value, label: value }))}
            value={size}
            onChange={setSize}
            error={errors.size}
          />
        ) : null}
        <Text style={styles.label}>{t.delivery}</Text>
        {editing ? (
          <>
            <TextField
              label={t.recipient}
              value={values.recipient}
              onChangeText={set("recipient")}
              error={errors.recipient}
              autoComplete="name"
            />
            <TextField
              label={t.address}
              value={values.ligne}
              onChangeText={set("ligne")}
              error={errors.ligne}
              autoComplete="street-address"
            />
            <TextField
              label={t.postalCode}
              value={values.code_postal}
              onChangeText={set("code_postal")}
              error={errors.code_postal}
              keyboardType="number-pad"
              maxLength={5}
              autoComplete="postal-code"
            />
            <TextField
              label={t.city}
              value={values.commune}
              onChangeText={set("commune")}
              error={errors.commune}
            />
          </>
        ) : (
          <View style={styles.address}>
            <MapPin size={16} color={colors.primary} />
            <View style={styles.addressText}>
              <Text style={styles.text}>{values.recipient}</Text>
              <Text style={styles.text}>
                {`${values.ligne}, ${values.code_postal} ${values.commune}`}
              </Text>
              <LinkText label={t.checkAddress} onPress={() => setEditing(true)} />
            </View>
          </View>
        )}
      </View>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </Screen>
  );
}

/** Choix exclusif (cadeau, taille), comme les tailles des récompenses des grades. */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <View style={styles.choices}>
      <Text style={styles.label}>{label}</Text>
      <View role="radiogroup" aria-label={label} style={styles.choiceRow}>
        {options.map((option) => {
          const on = value === option.value;
          return (
            <Pressable
              key={option.value}
              role="radio"
              aria-checked={on}
              onPress={() => onChange(option.value)}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing(2), paddingTop: spacing(2) },
  title: {
    fontFamily: font.medium,
    fontSize: 20,
    textAlign: "center",
    color: colors["primary-strong"],
  },
  card: {
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  choices: { gap: spacing(2) },
  choiceRow: { flexDirection: "row", gap: spacing(2) },
  choice: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing(1),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors["primary-soft"] },
  choiceText: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  choiceTextOn: { color: colors["primary-strong"] },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  address: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  addressText: { flex: 1, gap: spacing(1) },
  footer: { gap: spacing(2) },
});
