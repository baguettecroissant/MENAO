import { claimableReward, type RewardSize } from "@menao/core";
import { rewardClaimSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { Gift } from "lucide-react-native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { OutfitIllustration } from "@/components/grade/outfit-illustration";
import { ActionSubmit, SentCard } from "@/components/pro/action-kit";
import { FicheButton, FicheScreen, FicheSkeleton, FicheTag } from "@/components/pro/fiche-kit";
import { DeliverySummary, GiftLabel, SizePills } from "@/components/pro/gift-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { claimReward, loadDeliveryDefaults, loadGrade } from "@/lib/grade";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.grade.reward;
const { colors, font, spacing } = theme;
type Field = "jacket_size" | "pants_size" | "address" | "city" | "country" | "phone";
type Defaults = Awaited<ReturnType<typeof loadDeliveryDefaults>>;

/**
 * « Ma récompense » (F-24), refonte « Nette » (lot 37, maquette « RecompenseCadeauApp ») : bloc
 * bleu clair avec le niveau atteint et la tenue MENAO, tailles de la veste et du pantalon en
 * pastilles, adresse de l'entreprise en résumé (« Modifier » déplie les champs), téléphone et
 * bouton collé en bas. La demande part à l'équipe MENAO (ticket « recompense »), qui organise
 * l'envoi.
 */
function RewardScreen() {
  const { niveau } = useLocalSearchParams<{ niveau?: string }>();
  const load = useCallback(async () => {
    const [grade, defaults] = await Promise.all([loadGrade(), loadDeliveryDefaults()]);
    return { grade, defaults };
  }, []);
  const [data] = useFocusData(load);

  if (data === undefined) return <FicheSkeleton title={t.bar} />;
  const grade = data.grade;
  const reward = grade ? claimableReward(grade.levels, grade.level, grade.claimedLevels) : null;
  if (!grade || !reward || (niveau && Number(niveau) !== reward.level)) {
    return (
      <FicheScreen title={t.bar}>
        <Notice tone="info">{t.unavailable}</Notice>
        <FicheButton label={t.back} variant="secondary" onPress={() => router.back()} />
      </FicheScreen>
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
  defaults: Defaults;
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
  const [editing, setEditing] = useState(!defaults.address || !defaults.city);
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
      if (fields.address || fields.city || fields.country) setEditing(true);
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
      <FicheScreen title={t.bar}>
        <SentCard text={t.done} />
        <FicheButton label={t.back} variant="secondary" onPress={() => router.back()} />
      </FicheScreen>
    );
  }
  const what = reward.rewardDetail ?? reward.reward;
  const place = [values.city, values.country === t.countryDefault ? "" : values.country]
    .filter(Boolean)
    .join(", ");
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
      <View style={styles.hero}>
        {/* La puce se cale à gauche de son bloc : le bloc, lui, est centré. */}
        <View>
          <FicheTag text={t.levelReached(level)} tone="dark" />
        </View>
        <OutfitIllustration height={135} />
        <Text role="heading" style={styles.title}>
          {t.title(defaults.firstName)}
        </Text>
        {what ? <Text style={styles.lead}>{t.waitingFor(what)}</Text> : null}
        <Text style={styles.small}>{fr.grade.illustrationNote}</Text>
      </View>
      <SizePills label={t.jacket} value={jacket} onChange={setJacket} error={errors.jacket_size} />
      <SizePills label={t.pants} value={pants} onChange={setPants} error={errors.pants_size} />
      {editing ? (
        <View style={styles.group}>
          <GiftLabel text={t.deliveryShort} />
          <ToolField
            label={t.address}
            value={values.address}
            onChangeText={set("address")}
            error={errors.address}
            autoComplete="street-address"
          />
          <ToolField
            label={t.city}
            value={values.city}
            onChangeText={set("city")}
            error={errors.city}
          />
          <ToolField
            label={t.country}
            value={values.country}
            onChangeText={set("country")}
            error={errors.country}
          />
        </View>
      ) : (
        <DeliverySummary
          title={t.deliveryShort}
          name={defaults.company}
          address={[values.address, place].filter(Boolean).join(", ")}
          caption={t.companyAddress}
          editLabel={t.edit}
          onEdit={() => setEditing(true)}
        />
      )}
      <ToolField
        label={t.phone}
        value={values.phone}
        onChangeText={set("phone")}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: spacing(2),
    padding: spacing(4),
    borderRadius: 16,
    backgroundColor: colors["primary-soft"],
  },
  title: {
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  lead: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  small: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  group: { gap: spacing(2.5) },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", RewardScreen);
