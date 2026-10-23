import { router, useLocalSearchParams } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fr } from "@/i18n/fr";
import { openTab } from "@/lib/navigation";
import { loadChantierProjects } from "@/lib/project";
import { supabase } from "@/lib/supabase";
import { Body, Button, Card, IconTile, Screen, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.sent;

/**
 * Confirmation de l'envoi (F-11), comme la maquette « Votre demande est envoyée » : coche,
 * rappel de la préférence de rappel et suite du parcours.
 */
export default function Envoyee() {
  const {
    id,
    names = "",
    count = "1",
    from,
    to,
  } = useLocalSearchParams<{
    id: string;
    names?: string;
    count?: string;
    from?: string;
    to?: string;
  }>();
  // Chantier à plusieurs métiers (ADR 0168) : les métiers pas encore contactés.
  const [others, setOthers] = useState<{ id: string; trade: string }[]>([]);
  const [workOrder, setWorkOrder] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const chantier = await loadChantierProjects(id);
      if (!chantier || chantier.projects.length < 2) return;
      const { data: sent } = await supabase
        .from("requests")
        .select("project_id")
        .in(
          "project_id",
          chantier.projects.map((p) => p.id),
        );
      const contacted = new Set((sent ?? []).map((r) => r.project_id));
      if (!active) return;
      setOthers(chantier.projects.filter((p) => p.id !== id && !contacted.has(p.id)));
      setWorkOrder(chantier.projects.map((p) => p.trade).filter(Boolean));
    })();
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <Screen centered>
      <View style={styles.icon}>
        <IconTile icon={CircleCheck} size="lg" />
      </View>
      <Title center>{t.title(names)}</Title>
      <Body muted center>
        {t.text(names, Number(count) > 1)}
      </Body>
      <Card tone="soft">
        <Text style={styles.heading}>{t.reminder}</Text>
        <Body>{from && to ? t.callbackRange(from, to) : t.callbackAsap}</Body>
        <Body muted>{t.next}</Body>
      </Card>
      {others.length > 0 ? (
        <Card>
          <Text style={styles.heading}>{t.otherLots.title}</Text>
          <Body muted>{t.otherLots.lead}</Body>
          {others.map((p) => (
            <Button
              key={p.id}
              label={t.otherLots.choose(p.trade)}
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/projet/[id]/artisans", params: { id: p.id } })
              }
            />
          ))}
          {workOrder.length > 1 ? <Body muted>{t.workOrder(workOrder.join(", "))}</Body> : null}
        </Card>
      ) : null}
      <Button label={t.follow} onPress={() => openTab("/chantiers")} />
      <Button label={t.home} variant="secondary" onPress={() => openTab("/accueil")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: "center" },
  heading: { fontFamily: theme.font.medium, fontSize: 16, color: theme.colors.foreground },
});
