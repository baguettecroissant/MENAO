import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { loadAccount, saveProfile, type AccountDetails } from "@/lib/account";
import { useSession } from "@/lib/session";
import { useFocusData } from "@/lib/use-focus-data";
import { Button, Notice, Screen, ScreenSkeleton, TextField, Title } from "@/ui";

const t = fr.account.profile;

/** « Mes informations » (F-08), comme sur le site : prénom, nom et téléphone. */
export default function AccountProfileScreen() {
  const [account] = useFocusData(loadAccount);
  const { role } = useSession();
  if (account === undefined) return <ScreenSkeleton header={<TopBar />} />;
  if (account === null) {
    return (
      <Screen header={<TopBar />}>
        <Title>{t.title}</Title>
        <Notice tone="error">{fr.account.errors.unavailable}</Notice>
      </Screen>
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
    setState(await saveProfile(values, pro));
    setPending(false);
  }

  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.save} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      {state.success ? <Notice tone="success">{state.success}</Notice> : null}
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <TextField
        label={t.firstName}
        value={values.firstName}
        onChangeText={set("firstName")}
        error={errors.firstName}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <TextField
        label={t.lastName}
        value={values.lastName}
        onChangeText={set("lastName")}
        error={errors.lastName}
        autoComplete="family-name"
        textContentType="familyName"
      />
      <TextField
        label={pro ? t.phone : t.phoneOptional}
        value={values.phone}
        onChangeText={set("phone")}
        error={errors.phone}
        hint={pro ? t.phoneHintPro : t.phoneHintClient}
        autoComplete="tel"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
    </Screen>
  );
}
