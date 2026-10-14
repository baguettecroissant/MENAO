import { REWARD_SIZES, claimableReward, type RewardSize } from "@menao/core";
import { rewardClaimSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { CircleCheck, MapPin, Shirt } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { claimReward, loadDeliveryDefaults, loadGrade } from "@/lib/grade";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, LinkText, Notice, Screen, TextField } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.grade.reward;
const { colors, font, radius, spacing } = theme;
type Field = "jacket_size" | "pants_size" | "address" | "city" | "country" | "phone";

/**
 * « Réclamez votre récompense » (F-24, maquette) : tenue MENAO du niveau atteint, tailles de la
 * veste et du pantalon, adresse de livraison (pré-remplie avec celle de l'entreprise) et téléphone.
 * La demande part à l'équipe MENAO (ticket « recompense »), qui organise l'envoi.
 */
export default function RewardScreen() {
  const { niveau } = useLocalSearchParams<{ niveau?: string }>();
  const load = useCallback(async () => {
    const [grade, defaults] = await Promise.all([loadGrade(), loadDeliveryDefaults()]);
    return { grade, defaults };
  }, []);
  const [data] = useFocusData(load);

  if (data === undefined) return <Screen header={<TopBar />}>{null}</Screen>;
  const grade = data.grade;
  const reward = grade ? claimableReward(grade.levels, grade.level, grade.claimedLevels) : null;
  if (!grade || !reward || (niveau && Number(niveau) !== reward.level)) {
    return (
      <Screen header={<TopBar />}>
        <Notice tone="info">{t.unavailable}</Notice>
        <Button label={t.back} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <RewardForm level={reward.level} reward={reward} defaults={data.defaults} />;
}

function RewardForm({
  level,
  reward,
  defaults,
}: {
  level: number;
  reward: { reward: string | null; rewardDetail: string | null };
  defaults: { firstName: string | null; address: string; city: string; phone: string };
}) {
  const [jacket, setJacket] = useState<RewardSize | null>(null);
  const [pants, setPants] = useState<RewardSize | null>(null);
  const [values, setValues] = useState({
    address: defaults.address,
    city: defaults.city,
    country: t.countryDefault,
    phone: defaults.phone,
  });
  // Adresse pré-remplie : affichée en résumé, modifiable sur demande (maquette).
  const [editing, setEditing] = useState(!defaults.address || !defaults.phone);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  async function submit() {
    const parsed = rewardClaimSchema.safeParse({
      jacket_size: jacket ?? "",
      pants_size: pants ?? "",
      ...values,
    });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, messages]) => [key, messages?.[0]])),
      );
      if (fields.address || fields.city || fields.country || fields.phone) setEditing(true);
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    const failed = await claimReward(level, parsed.data);
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
        <CircleCheck size={56} color={colors.primary} />
        <Text role="heading" style={styles.title}>
          {t.title(defaults.firstName)}
        </Text>
        <Body muted center>
          {t.intro(level)}
        </Body>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.waiting}</Text>
        <View style={styles.rewardImage}>
          <Shirt size={64} color={colors.primary} strokeWidth={1.4} />
        </View>
        <Text style={styles.rewardName}>{reward.reward}</Text>
        {reward.rewardDetail ? <Text style={styles.small}>{reward.rewardDetail}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.sizesTitle}</Text>
        <SizePicker
          label={t.jacket}
          value={jacket}
          onChange={setJacket}
          error={errors.jacket_size}
        />
        <SizePicker label={t.pants} value={pants} onChange={setPants} error={errors.pants_size} />
        {editing ? (
          <>
            <Text style={styles.cardTitle}>{t.delivery}</Text>
            <TextField
              label={t.address}
              value={values.address}
              onChangeText={set("address")}
              error={errors.address}
              autoComplete="street-address"
            />
            <TextField
              label={t.city}
              value={values.city}
              onChangeText={set("city")}
              error={errors.city}
            />
            <TextField
              label={t.country}
              value={values.country}
              onChangeText={set("country")}
              error={errors.country}
            />
            <TextField
              label={t.phone}
              value={values.phone}
              onChangeText={set("phone")}
              error={errors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        ) : (
          <View style={styles.address}>
            <MapPin size={16} color={colors.primary} />
            <View style={styles.addressText}>
              <Text style={styles.text}>
                {[values.address, values.city, values.country].join(", ")}
              </Text>
              <Text style={styles.small}>{values.phone}</Text>
              <LinkText label={t.checkAddress} onPress={() => setEditing(true)} />
            </View>
          </View>
        )}
      </View>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </Screen>
  );
}

function SizePicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: RewardSize | null;
  onChange: (size: RewardSize) => void;
  error?: string;
}) {
  return (
    <View style={styles.sizes}>
      <Text style={styles.label}>{label}</Text>
      <View role="radiogroup" aria-label={label} style={styles.sizeRow}>
        {REWARD_SIZES.map((size) => {
          const on = value === size;
          return (
            <Pressable
              key={size}
              role="radio"
              aria-checked={on}
              onPress={() => onChange(size)}
              style={[styles.size, on && styles.sizeOn]}
            >
              <Text style={[styles.sizeText, on && styles.sizeTextOn]}>{size}</Text>
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
  cardTitle: {
    fontFamily: font.medium,
    fontSize: 15,
    textAlign: "center",
    color: colors["primary-strong"],
  },
  rewardImage: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
  rewardName: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  small: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  center: { textAlign: "center" },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.foreground },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  sizes: { gap: spacing(2) },
  sizeRow: { flexDirection: "row", gap: spacing(2) },
  size: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sizeOn: { borderColor: colors.primary, backgroundColor: colors["primary-soft"] },
  sizeText: { fontFamily: font.medium, fontSize: 13, color: colors.foreground },
  sizeTextOn: { color: colors["primary-strong"] },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  address: { flexDirection: "row", alignItems: "flex-start", gap: spacing(2) },
  addressText: { flex: 1, gap: spacing(1) },
  footer: { gap: spacing(2) },
});
