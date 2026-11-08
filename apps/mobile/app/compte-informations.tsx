import { useState } from "react";
import { StyleSheet } from "react-native";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { FicheCard, FicheSkeleton } from "@/components/pro/fiche-kit";
import { FieldPair, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadAccount, saveProfile, type AccountDetails } from "@/lib/account";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, toast } from "@/ui";

const t = fr.account.profile;

/**
 * « Mes informations » (F-08), comme sur le site : prénom, nom et téléphone. Refonte « Nette »
 * (lot 13) : grand titre, champs en carte, bouton collé en bas.
 */
export default function AccountProfileScreen() {
  const [account] = useFocusData(loadAccount);
  const { role } = useSession();
  if (account === undefined) return <FicheSkeleton />;
  if (account === null) {
    return (
      <ActionScreen title={t.title}>
        <Notice tone="error">{fr.account.errors.unavailable}</Notice>
      </ActionScreen>
    );
  }
  return <ProfileForm account={account} pro={role !== "particulier"} />;
}

/** Téléphone obligatoire pour un compte professionnel, visible de ses clients. */
function ProfileForm({ account, pro }: { account: AccountDetails; pro: boolean }) {
  const [values, setValues] = useState({
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
  });
  const [state, setState] = useState<Awaited<ReturnType<typeof saveProfile>>>({});
  const [pending, setPending] = useState(false);
  const set = (field: keyof typeof values) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));
  const errors = state.fieldErrors ?? {};

  async function submit() {
    setPending(true);
    const result = await saveProfile(values, pro);
    setPending(false);
    // Confirmation en bas de l'écran ; les erreurs restent près des champs.
    if (result.success) toast.success(result.success);
    setState(result.success ? {} : result);
  }

  return (
    <ActionScreen
      title={t.title}
      footer={<ActionSubmit label={t.save} onPress={submit} loading={pending} />}
    >
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <FicheCard padding={4} gap={3.5}>
        <FieldPair>
          <ToolField
            label={t.firstName}
            value={values.firstName}
            onChangeText={set("firstName")}
            error={errors.firstName}
            autoComplete="given-name"
            textContentType="givenName"
            style={styles.half}
          />
          <ToolField
            label={t.lastName}
            value={values.lastName}
            onChangeText={set("lastName")}
            error={errors.lastName}
            autoComplete="family-name"
            textContentType="familyName"
            style={styles.half}
          />
        </FieldPair>
        <ToolField
          label={pro ? t.phone : t.phoneOptional}
          value={values.phone}
          onChangeText={set("phone")}
          error={errors.phone}
          hint={pro ? t.phoneHintPro : t.phoneHintClient}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </FicheCard>
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1 },
});
