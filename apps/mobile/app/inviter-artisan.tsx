import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import {
  inviteArtisan,
  loadMyInvitations,
  type InvitationForm,
  type MyInvitation,
} from "@/lib/invitations";
import { Body, Button, Card, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.inviteArtisan;
const { colors, font, spacing } = theme;
const EMPTY: InvitationForm = {
  company: "",
  contact_name: "",
  phone: "",
  email: "",
  city: "",
  message: "",
};

/**
 * « Invitez votre artisan de confiance » (ADR 0162), comme sur le site : l'équipe MENAO contacte
 * de la part du client un artisan qui n'est pas encore sur MENAO. Suivi de ses invitations.
 */
export default function InviteArtisanScreen() {
  const [values, setValues] = useState<InvitationForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);

  useEffect(() => {
    void loadMyInvitations().then(setInvitations);
  }, [sent]);

  const field = (name: keyof InvitationForm) => ({
    value: values[name],
    onChangeText: (text: string) => setValues((v) => ({ ...v, [name]: text })),
    error: errors[name]?.[0],
  });

  async function submit() {
    setFailure(null);
    setPending(true);
    const result = await inviteArtisan(values);
    setPending(false);
    if (result?.fieldErrors) return setErrors(result.fieldErrors);
    if (result?.error) return setFailure(result.error);
    setErrors({});
    setValues(EMPTY);
    setSent(true);
  }

  const list = invitations.length ? (
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.listTitle}
      </Text>
      {invitations.map((invitation) => (
        <View key={invitation.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.strong} numberOfLines={1}>
              {invitation.company}
            </Text>
            <Text style={styles.meta}>{formatDateNumeric(invitation.created_at)}</Text>
          </View>
          <Text style={[styles.meta, invitation.status === "inscrit" && styles.done]}>
            {t.status[invitation.status]}
          </Text>
        </View>
      ))}
    </Card>
  ) : null;

  if (sent) {
    return (
      <Screen
        header={<TopBar />}
        footer={
          <View style={styles.actions}>
            <Button label={t.another} onPress={() => setSent(false)} />
            <Button label={t.back} variant="secondary" onPress={() => router.back()} />
          </View>
        }
      >
        <Title>{t.title}</Title>
        <Notice tone="success">{t.sent}</Notice>
        {list}
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <TextField label={t.company} maxLength={120} {...field("company")} />
      <TextField label={t.contactName} maxLength={120} {...field("contact_name")} />
      <TextField
        label={t.phone}
        keyboardType="phone-pad"
        autoComplete="off"
        hint={t.contactHint}
        {...field("phone")}
      />
      <TextField
        label={t.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        {...field("email")}
      />
      <TextField label={t.city} maxLength={100} {...field("city")} />
      <TextField label={t.message} maxLength={500} multiline {...field("message")} />
      <Body muted>{t.privacy}</Body>
      {list}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing(2) },
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing(2.5),
  },
  rowText: { flex: 1, gap: spacing(0.5) },
  strong: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  done: { color: colors.success },
});
