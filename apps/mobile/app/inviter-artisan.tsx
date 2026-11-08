import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { ActionScreen, ActionSubmit, SectionLabel, SentCard } from "@/components/pro/action-kit";
import { PrivacyNote } from "@/components/pro/dossier-kit";
import { FicheButton, FicheCard, FicheTag } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatDateNumeric } from "@/lib/format";
import {
  inviteArtisan,
  loadMyInvitations,
  type InvitationForm,
  type MyInvitation,
} from "@/lib/invitations";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

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
 * Écran « Nette » (lot 11) : formulaire en carte (champs en 16 points), invitations en lignes
 * avec leur pastille d'état, bouton collé en bas.
 */
function InviteArtisanScreen() {
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
    <FicheCard padding={0} gap={0}>
      <View style={styles.listHead}>
        <SectionLabel text={t.listTitle} />
      </View>
      {invitations.map((invitation) => (
        <View key={invitation.id} style={styles.row}>
          <Avatar url={null} name={invitation.company} size={36} initials />
          <View style={styles.rowText}>
            <Text style={styles.strong} numberOfLines={1}>
              {invitation.company}
            </Text>
            <Text style={styles.meta}>{formatDateNumeric(invitation.created_at)}</Text>
          </View>
          <View style={styles.tag}>
            <FicheTag
              text={t.status[invitation.status]}
              tone={invitation.status === "inscrit" ? "success" : "neutral"}
            />
          </View>
        </View>
      ))}
    </FicheCard>
  ) : null;

  if (sent) {
    return (
      <ActionScreen
        bar={t.cardAction}
        title={t.title}
        footer={
          <>
            <ActionSubmit label={t.another} onPress={() => setSent(false)} />
            <FicheButton label={t.back} variant="secondary" tall onPress={() => router.back()} />
          </>
        }
      >
        <SentCard text={t.sent} />
        {list}
      </ActionScreen>
    );
  }
  return (
    <ActionScreen
      bar={t.cardAction}
      title={t.title}
      lead={t.intro}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={pending} />}
    >
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={3.5}>
        <ToolField label={t.company} maxLength={120} {...field("company")} />
        <ToolField label={t.contactName} maxLength={120} {...field("contact_name")} />
        <ToolField
          label={t.phone}
          keyboardType="phone-pad"
          autoComplete="off"
          hint={t.contactHint}
          {...field("phone")}
        />
        <ToolField
          label={t.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="off"
          {...field("email")}
        />
        <ToolField label={t.city} maxLength={100} {...field("city")} />
        <ToolField label={t.message} maxLength={500} multiline {...field("message")} />
      </FicheCard>
      <PrivacyNote text={t.privacy} />
      {list}
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  listHead: { paddingHorizontal: spacing(4), paddingTop: spacing(4), paddingBottom: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  strong: { fontFamily: font.semibold, fontSize: 15, color: colors.foreground },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  tag: { flexShrink: 1, maxWidth: "45%" },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("referral", InviteArtisanScreen);
