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
import { Ellipsis, Mail } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { BottomSheet } from "@/components/bottom-sheet";
import { GroupTitle, ListGroup } from "@/components/list-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheScreen,
  FicheSkeleton,
  FicheTag,
  type FicheTone,
} from "@/components/pro/fiche-kit";
import { ChoiceCards, FieldPair, ProgressBar, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { formatDay } from "@/lib/format";
import { inviteTeamMember, loadTeam, removeTeamMember, updateTeamMember } from "@/lib/team";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proTeam;
const { colors, font, radius, spacing } = theme;

const STATE_TONE: Record<TeamMember["state"], FicheTone> = {
  actif: "success",
  en_attente: "warning",
  suspendu_places: "danger",
  suspendu_patron: "neutral",
};

const roleOptions = TEAM_ROLES.map((value) => ({
  value,
  label: t.roles[value],
  detail: t.roleDetails[value],
}));

/** Texte d'un statut de l'Edge Function team-members (« indisponible » par défaut). */
const errorText = (status: string) => t.errors[status] ?? t.errors.unavailable ?? "";

/**
 * « Mon équipe » du patron (F-89, ADR 0240), comme sur le site : places, membres et leur état,
 * invitation par e-mail. Formule sans comptes d'équipe : une simple phrase, sans lien (règle 10).
 * Refonte « Nette » (lot 8, maquette « EquipeNette » en une colonne) : carte des comptes utilisés
 * avec sa barre, membres en lignes (actions dans une feuille), invitation avec le rôle en cartes.
 */
export default function TeamScreen() {
  const [team, reload] = useFocusData(loadTeam);
  if (team === undefined) return <FicheSkeleton title={t.title} />;
  return (
    <FicheScreen title={t.title} onRefresh={reload}>
      <Text style={styles.lead}>{t.lead}</Text>
      {team === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : !teamIncluded(team) ? (
        <Notice tone="info">{t.notIncluded}</Notice>
      ) : (
        <TeamContent team={team} onChange={reload} />
      )}
    </FicheScreen>
  );
}

function TeamContent({ team, onChange }: { team: Team; onChange: () => Promise<void> }) {
  return (
    <>
      <FicheCard gap={3}>
        <Text style={styles.seatsLabel}>{t.seatsTitle}</Text>
        <Text style={styles.seatsValue}>{t.seatsValue(team.used, team.seats)}</Text>
        <ProgressBar value={team.used} target={team.seats} label={t.seatsTitle} height={10} />
        <Text style={styles.muted}>{t.seats(team.used, team.seats)}</Text>
      </FicheCard>

      <GroupTitle title={t.membersTitle} count={team.members.length + 1} />
      <ListGroup>
        <View style={styles.row}>
          <Avatar url={null} name={t.you} size={44} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{t.you}</Text>
            <Text style={styles.rowMeta}>{t.youPatron}</Text>
            <FicheTag text={t.states.actif} tone="success" dot />
          </View>
        </View>
        {team.members.map((member) => (
          <MemberRow key={member.userId} member={member} onChange={onChange} />
        ))}
      </ListGroup>
      <Text style={styles.muted}>{t.workerNote}</Text>

      <FicheCard gap={3.5}>
        <CardHeading title={t.invite.title} />
        {teamSeatsLeft(team) > 0 ? (
          <InviteForm onChange={onChange} />
        ) : (
          <Text style={styles.muted}>{t.full}</Text>
        )}
      </FicheCard>
    </>
  );
}

function MemberRow({ member, onChange }: { member: TeamMember; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
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
          setOpen(false);
          await onChange();
        },
      },
    ]);
  }

  const meta = [t.roles[member.role], member.since ? t.since(formatDay(member.since)) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.row}>
      <Avatar url={null} name={name} size={44} initials />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {name}
        </Text>
        {member.email && member.email !== name ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {member.email}
          </Text>
        ) : null}
        <Text style={styles.rowMeta}>{meta}</Text>
        <FicheTag text={t.states[member.state]} tone={STATE_TONE[member.state]} dot />
      </View>
      <Tappable
        role="button"
        aria-label={t.memberActions(name)}
        aria-haspopup="dialog"
        onPress={() => setOpen(true)}
        style={styles.more}
      >
        <Ellipsis size={20} color={colors.foreground} />
      </Tappable>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={name}
        closeLabel={t.actions.cancel}
      >
        <View style={styles.sheet}>
          <ChoiceCards
            label={t.changeRole}
            value={member.role}
            onChange={(role) => {
              if (!busy && member.role !== role) void change({ role });
            }}
            options={roleOptions}
          />
          <FicheButton
            label={suspended ? t.actions.reactivate : t.actions.suspend}
            variant="secondary"
            disabled={busy}
            onPress={() => void change({ active: suspended })}
          />
          <Pressable
            role="button"
            aria-disabled={busy}
            disabled={busy}
            onPress={confirmRemove}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>{t.actions.remove}</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
      <Text style={styles.lead}>{t.invite.hint}</Text>
      <FieldPair>
        <ToolField
          label={t.invite.firstName}
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="off"
          error={errors.firstName}
          style={styles.half}
        />
        <ToolField
          label={t.invite.lastName}
          value={lastName}
          onChangeText={setLastName}
          autoComplete="off"
          error={errors.lastName}
          style={styles.half}
        />
      </FieldPair>
      <ToolField
        label={t.invite.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        error={errors.email}
      />
      <ChoiceCards label={t.invite.role} value={role} onChange={setRole} options={roleOptions} />
      <FicheButton
        label={t.invite.submit}
        icon={Mail}
        tall
        loading={sending}
        onPress={() => void send()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.label },
  muted: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  seatsLabel: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  seatsValue: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: colors.foreground,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  rowText: { flex: 1, gap: 3, alignItems: "flex-start" },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  rowMeta: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  more: {
    width: theme.touchTarget,
    height: theme.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheet: { gap: spacing(4) },
  remove: { alignSelf: "center", minHeight: theme.touchTarget, justifyContent: "center" },
  removeText: { fontFamily: font.semibold, fontSize: 15, color: colors.danger },
  pressed: { opacity: 0.7 },
  half: { flex: 1, minWidth: 0 },
});
