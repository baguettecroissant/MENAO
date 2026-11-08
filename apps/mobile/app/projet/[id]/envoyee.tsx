import { router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActionScreen, ActionSubmit } from "@/components/pro/action-kit";
import { CardHeading, FicheButton, FicheCard } from "@/components/pro/fiche-kit";
import { StepList } from "@/components/request-kit";
import { fr } from "@/i18n/fr";
import { openTab } from "@/lib/navigation";
import { loadChantierProjects } from "@/lib/project";
import { supabase } from "@/lib/supabase";
import { theme } from "@/ui/theme";

const t = fr.sent;

/**
 * Confirmation de l'envoi (F-11), comme la maquette « Votre demande est envoyée » : coche,
 * rappel de la préférence de rappel et suite du parcours. Écran « Nette » (lot 12, maquette
 * « EnvoyeeApp ») : rond vert coché, grand titre, étapes en carte, bouton collé en bas.
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
  const many = Number(count) > 1;
  return (
    <ActionScreen
      back={false}
      steps={
        <View style={styles.check} aria-hidden>
          <Check size={32} color={theme.colors["primary-foreground"]} strokeWidth={2.6} />
        </View>
      }
      title={t.title(names)}
      lead={t.text(names, many)}
      footer={
        <>
          <ActionSubmit label={t.follow} onPress={() => openTab("/chantiers")} />
          <FicheButton label={t.home} variant="secondary" onPress={() => openTab("/accueil")} />
        </>
      }
    >
      <StepList
        label={t.steps.label}
        steps={[
          { title: t.steps.sent, state: "done" },
          { title: t.steps.replies, text: t.next, state: "now" },
          { title: t.steps.visit, text: t.steps.visitText, state: "next" },
        ]}
      />
      <FicheCard padding={4} gap={1.5}>
        <Text style={styles.heading}>{t.reminder}</Text>
        <Text style={styles.text}>{from && to ? t.callbackRange(from, to) : t.callbackAsap}</Text>
      </FicheCard>
      {others.length > 0 ? (
        <FicheCard padding={4.5} gap={3}>
          <CardHeading title={t.otherLots.title} />
          <Text style={styles.text}>{t.otherLots.lead}</Text>
          {others.map((p) => (
            <FicheButton
              key={p.id}
              label={t.otherLots.choose(p.trade)}
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/projet/[id]/artisans", params: { id: p.id } })
              }
            />
          ))}
          {workOrder.length > 1 ? (
            <Text style={styles.muted}>{t.workOrder(workOrder.join(", "))}</Text>
          ) : null}
        </FicheCard>
      ) : null}
    </ActionScreen>
  );
}

const styles = StyleSheet.create({
  // Rond vert de la maquette, au-dessus du grand titre.
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.success,
  },
  heading: { fontFamily: theme.font.bold, fontSize: 14, color: theme.colors.foreground },
  text: {
    fontFamily: theme.font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.label,
  },
  muted: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors["muted-foreground"],
  },
});
