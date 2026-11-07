import { teamMemberName, type ChantierTeamMember } from "@menao/core";
import { Square, SquareCheck, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { loadChantierTeam, saveChantierTeam } from "@/lib/team";
import { Body, Card, Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proChantierTeam;
const { colors, font, spacing } = theme;

/**
 * « Équipe sur ce chantier » (ADR 0241), comme sur le site : le patron ou le chef d'équipe coche
 * les membres qui y travaillent, enregistré à chaque choix. Rien sans membre dans l'équipe.
 */
export function ChantierTeamCard({ chantierId }: { chantierId: string }) {
  const [members, setMembers] = useState<ChantierTeamMember[] | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadChantierTeam(chantierId)
      .then((team) => active && setMembers(team))
      .catch(() => active && setMembers(null));
    return () => {
      active = false;
    };
  }, [chantierId]);
  if (!members) return null;

  async function toggle(userId: string) {
    if (!members || pending) return;
    const next = members.map((m) => (m.userId === userId ? { ...m, assigned: !m.assigned } : m));
    setMembers(next);
    setPending(true);
    setFailed(false);
    const ok = await saveChantierTeam(
      chantierId,
      next.filter((m) => m.assigned).map((m) => m.userId),
    );
    setPending(false);
    if (!ok) {
      setMembers(members);
      setFailed(true);
    }
  }

  return (
    <Card>
      <View style={styles.head}>
        <Users size={18} color={colors.primary} />
        <Text role="heading" style={styles.title}>
          {t.title}
        </Text>
      </View>
      <Body muted>{t.intro}</Body>
      {members.map((m) => {
        const Icon = m.assigned ? SquareCheck : Square;
        return (
          <Pressable
            key={m.userId}
            role="checkbox"
            aria-checked={m.assigned}
            disabled={pending}
            onPress={() => void toggle(m.userId)}
            style={styles.row}
          >
            <Icon size={22} color={m.assigned ? colors.primary : colors["muted-foreground"]} />
            <Text style={styles.name}>{teamMemberName({ ...m, email: null })}</Text>
            <Text style={styles.role}>{fr.proTeam.roles[m.role]}</Text>
          </Pressable>
        );
      })}
      {failed ? <Notice tone="error">{t.error}</Notice> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  title: { fontFamily: font.medium, fontSize: 16, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(3), minHeight: 44 },
  name: { flexShrink: 1, fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  role: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
});
