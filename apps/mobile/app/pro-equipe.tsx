import {
  TEAM_ROLES,
  teamIncluded,
  teamMemberName,
  teamSeatsLeft,
  type Team,
  type TeamMember,
  type TeamRole,
} from "@menao/core";
import { teamInviteSchema } from "@menao/validation";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { inviteTeamMember, loadTeam, removeTeamMember, updateTeamMember } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import {
  Body,
  Button,
  Card,
  Chip,
  Notice,
  Screen,
  ScreenSkeleton,
  TextField,
  Title,
  toast,
} from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proTeam;
const { colors, font, spacing } = theme;

/** Texte d'un statut de l'Edge Function team-members (« indisponible » par défaut). */
const errorText = (status: string) => t.errors[status] ?? t.errors.unavailable ?? "";

/**
 * « Mon équipe » du patron (F-89, ADR 0240), comme sur le site : places, membres et leur état,
 * invitation par e-mail. Formule sans comptes d'équipe : une simple phrase, sans lien (règle 10).
 */
export default function TeamScreen() {
  const [team, reload] = useFocusData(loadTeam);
  if (team === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen header={<TopBar />} onRefresh={reload}>
      <View style={styles.head}>
        <Title>{t.title}</Title>
        <Body muted>{t.lead}</Body>
      </View>
      {team === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : !teamIncluded(team) ? (
        <Notice tone="info">{t.notIncluded}</Notice>
      ) : (
        <TeamContent team={team} onChange={reload} />
      )}
    </Screen>
  );
}

function TeamContent({ team, onChange }: { team: Team; onChange: () => Promise<void> }) {
  return (
    <>
      <Card>
        <Text style={styles.cardTitle}>{t.seats(team.used, team.seats)}</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{t.you}</Text>
            <Text style={styles.rowMeta}>{t.patron}</Text>
          </View>
        </View>
        {team.members.map((member) => (
          <MemberRow key={member.userId} member={member} onChange={onChange} />
        ))}
      </Card>
      <Card>
        <Text style={styles.cardTitle}>{t.invite.title}</Text>
        {teamSeatsLeft(team) > 0 ? <InviteForm onChange={onChange} /> : <Body muted>{t.full}</Body>}
      </Card>
    </>
  );
}

function MemberRow({ member, onChange }: { member: TeamMember; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const name = teamMemberName(member);
  const suspended = member.state === "suspendu_places" || member.state === "suspendu_patron";

  async function change(update: { role: TeamRole } | { active: boolean }) {
    setBusy(true);
    const error = await updateTeamMember(member.userId, update);
    setBusy(false);
    if (error !== null) return toast.error(error || errorText("unavailable"));
    toast.success(t.actions.saved);
    await onChange();
  }

  function confirmRemove() {
    Alert.alert(t.actions.confirmTitle, t.actions.confirmRemove(name), [
      { text: t.actions.cancel, style: "cancel" },
      {
        text: t.actions.remove,
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          const status = await removeTeamMember(member.userId);
          setBusy(false);
          if (status !== "ok") return toast.error(errorText(status));
          toast.success(t.actions.removed(name));
          await onChange();
        },
      },
    ]);
  }

  return (
    <View style={[styles.row, styles.member]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {name}
        </Text>
        {member.email && member.email !== name ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {member.email}
          </Text>
        ) : null}
        <Text style={[styles.rowMeta, suspended ? styles.warning : null]}>
          {[t.states[member.state], member.since ? t.since(formatDay(member.since)) : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View style={styles.chips}>
        {TEAM_ROLES.map((role) => (
          <Chip
            key={role}
            label={t.roles[role]}
            selected={member.role === role}
            onPress={() => {
              if (!busy && member.role !== role) void change({ role });
            }}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <Button
          label={suspended ? t.actions.reactivate : t.actions.suspend}
          variant="secondary"
          disabled={busy}
          onPress={() => void change({ active: suspended })}
        />
        <Button label={t.actions.remove} variant="danger" disabled={busy} onPress={confirmRemove} />
      </View>
    </View>
  );
}

function InviteForm({ onChange }: { onChange: () => Promise<void> }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("ouvrier");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [sending, setSending] = useState(false);

  async function send() {
    const parsed = teamInviteSchema.safeParse({ firstName, lastName, email, role });
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[] | undefined
      >;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]])));
      return;
    }
    setErrors({});
    setSending(true);
    const status = await inviteTeamMember(parsed.data);
    setSending(false);
    if (status === "email_taken") return setErrors({ email: errorText(status) });
    if (status !== "ok") return toast.error(errorText(status));
    toast.success(t.invite.sent(parsed.data.email));
    setFirstName("");
    setLastName("");
    setEmail("");
    await onChange();
  }

  return (
    <>
      <Body muted>{t.invite.hint}</Body>
      <TextField
        label={t.invite.firstName}
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="off"
        error={errors.firstName}
      />
      <TextField
        label={t.invite.lastName}
        value={lastName}
        onChangeText={setLastName}
        autoComplete="off"
        error={errors.lastName}
      />
      <TextField
        label={t.invite.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        error={errors.email}
      />
      <Text style={styles.label}>{t.invite.role}</Text>
      <View style={styles.chips}>
        {TEAM_ROLES.map((value) => (
          <Chip
            key={value}
            label={t.roles[value]}
            selected={role === value}
            onPress={() => setRole(value)}
          />
        ))}
      </View>
      <Button label={t.invite.submit} loading={sending} onPress={() => void send()} />
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing(1.5) },
  cardTitle: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  label: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  actions: { gap: spacing(2) },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing(2),
  },
  member: { flexDirection: "column", alignItems: "stretch" },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  rowMeta: { fontFamily: font.regular, fontSize: 12, color: colors["muted-foreground"] },
  warning: { color: colors.warning },
});
