import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { recommendPartner, type PartnerOption } from "@/lib/pro-requests";
import { Body, Button, Card, Notice, toast } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proPartners;
const { colors, font, radius, spacing } = theme;

/**
 * « Recommander un partenaire » (ADR 0174), comme sur le site : partenaires du réseau de parrainage
 * qui interviennent chez ce client, à la place de l'artisan ou pour un autre métier du chantier.
 */
export function PartnerRecommendations({
  requestId,
  clientFirstName,
  options,
}: {
  requestId: string;
  clientFirstName: string | null;
  options: PartnerOption[];
}) {
  const [done, setDone] = useState<string[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = (o: PartnerOption) => `${o.projectId}:${o.artisanId}`;

  async function recommend(o: PartnerOption) {
    setSending(key(o));
    const failure = await recommendPartner(requestId, o.projectId, o.artisanId);
    setSending(null);
    setError(failure);
    if (failure) return;
    setDone((current) => [...current, key(o)]);
    toast.success(t.sent(clientFirstName ?? t.client));
  }

  const groups = [
    { title: t.instead, rows: options.filter((o) => o.sameProject) },
    { title: t.otherTrades, rows: options.filter((o) => !o.sameProject) },
  ].filter((g) => g.rows.length > 0);

  return (
    <Card>
      <Text role="heading" style={styles.heading}>
        {t.title}
      </Text>
      <Body muted>{t.lead}</Body>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.rows.map((o) => {
            const recommended = o.recommended || done.includes(key(o));
            return (
              <View key={key(o)} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name}>{o.name}</Text>
                  <Text style={styles.trade}>{o.trade}</Text>
                </View>
                {recommended ? (
                  <Text style={styles.tag}>{t.recommended}</Text>
                ) : (
                  <View style={styles.action}>
                    <Button
                      label={t.recommend}
                      variant="secondary"
                      loading={sending === key(o)}
                      disabled={sending !== null}
                      onPress={() => recommend(o)}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: font.medium, fontSize: 17, color: colors.foreground },
  group: { gap: spacing(2) },
  groupTitle: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.input,
    backgroundColor: colors.background,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  rowText: { flex: 1, gap: spacing(0.5) },
  name: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  trade: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  action: { minWidth: 130 },
  tag: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
});
