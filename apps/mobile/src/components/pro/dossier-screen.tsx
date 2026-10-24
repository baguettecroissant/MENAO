import {
  CHARTER_RULE_COUNT,
  REQUIRED_DOCUMENT_TYPES,
  documentState,
  dossierItemCount,
  type DocumentState,
} from "@menao/core";
import { router, type Href } from "expo-router";
import {
  Building2,
  ChevronRight,
  FileText,
  Lock,
  PenLine,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadDossier, loadZoneDemand, submitDossier } from "@/lib/artisan-dossier";
import { useTrades } from "@/lib/trades";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen, ScreenSkeleton, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proDossier;
const { colors, font, radius, spacing } = theme;

type Tone = "todo" | "pending" | "done" | "danger";

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  todo: { bg: colors["primary-softer"], fg: colors["primary-strong"] },
  pending: { bg: colors["warning-soft"], fg: colors.warning },
  done: { bg: colors["success-soft"], fg: colors.success },
  danger: { bg: colors["danger-soft"], fg: colors.danger },
};

const documentTone: Record<DocumentState, Tone> = {
  missing: "todo",
  en_attente: "pending",
  valide: "done",
  refuse: "danger",
  a_refaire: "danger",
};

/**
 * « Faire vérifier mon entreprise » (ADR 0113), comme sur le site (ADR 0111) : ce qu'il reste à
 * faire avant l'envoi du dossier, chaque élément ouvrant son écran, puis l'envoi. Rien sur la
 * formule ni l'abonnement (règle 10) : MENAO écrit à l'artisan une fois son entreprise vérifiée.
 */
export function DossierScreen() {
  const [dossier, reload] = useFocusData(loadDossier);
  // Demande de la zone (ADR 0182), comme sur le site.
  const [zoneDemand] = useFocusData(loadZoneDemand);
  const trades = useTrades();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dossier === undefined) return <ScreenSkeleton />;
  if (dossier === null) {
    return (
      <Screen onRefresh={reload}>
        <TabHeader title={t.title} />
        <Notice tone="error">{fr.errors.generic}</Notice>
      </Screen>
    );
  }

  const { progress, snapshot } = dossier;
  const editable = dossier.status === "brouillon" || dossier.status === "refuse";
  const total = dossierItemCount(snapshot);
  const done = total - dossier.itemsLeft;
  const profileDone = progress.entreprise && progress.metiers && progress.zone;

  async function submit() {
    setSending(true);
    setError(null);
    const failure = await submitDossier();
    setSending(false);
    if (failure) return setError(failure);
    reload();
  }

  return (
    <Screen
      footer={
        editable ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {dossier.canSubmit ? t.ready : t.left(dossier.itemsLeft)}
            </Text>
            <Button
              label={t.submit}
              onPress={submit}
              loading={sending}
              disabled={!dossier.canSubmit}
            />
          </View>
        ) : undefined
      }
    >
      <TabHeader title={t.title} />
      {dossier.status === "en_verification" ? <Notice tone="success">{t.sent}</Notice> : null}
      {dossier.status === "refuse" ? (
        <Notice tone="error">{t.refused(dossier.refusalReason)}</Notice>
      ) : null}
      {dossier.status === "brouillon" && dossier.refusalReason ? (
        <Notice tone="error">{t.complement(dossier.refusalReason)}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {progress.metiers && progress.zone && zoneDemand && zoneDemand.recherches > 0 ? (
        <Card tone="soft">
          <View style={styles.demandHead}>
            <Users size={18} color={colors["primary-strong"]} />
            <Text style={styles.demandTitle}>{t.zoneDemand.title}</Text>
          </View>
          <Body>{t.zoneDemand.body(zoneDemand.recherches, zoneDemand.jours)}</Body>
          {zoneDemand.metiers.length > 1 ? (
            <Body muted>
              {zoneDemand.metiers
                .map((m) =>
                  t.zoneDemand.trade(
                    trades.find((tr) => tr.code === m.metier)?.label ?? m.metier,
                    m.recherches,
                  ),
                )
                .join(" · ")}
            </Body>
          ) : null}
          <Text style={styles.demandNext}>{t.zoneDemand.next}</Text>
        </Card>
      ) : null}
      {editable ? <Body muted>{t.lead}</Body> : null}

      <View style={styles.progress}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{t.progressLabel}</Text>
          <Text style={styles.progressText}>{t.progress(done, total)}</Text>
        </View>
        <View
          role="progressbar"
          aria-label={t.progressLabel}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          style={styles.track}
        >
          <View style={[styles.bar, { width: `${(done / total) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.list}>
        <Row
          icon={Building2}
          title={t.profileTitle}
          hint={profileDone ? undefined : t.profileTodo}
          tone={profileDone ? "done" : "todo"}
          status={profileDone ? t.states.done : t.states.todo}
          href="/pro-entreprise"
        />
        <Row
          icon={PenLine}
          title={t.charterTitle}
          hint={t.charterHint(CHARTER_RULE_COUNT)}
          tone={progress.charte ? "done" : "todo"}
          status={progress.charte ? t.states.signed : t.states.todo}
          href="/pro-charte"
        />
        {REQUIRED_DOCUMENT_TYPES.map((type) => {
          // « Non soumis » à la décennale (ADR 0116) : pas exigée, l'équipe le vérifie.
          if (type === "decennale" && snapshot.decennaleExempt) {
            return (
              <Row
                key={type}
                icon={FileText}
                title={t.documents[type]}
                hint={t.exemptHint}
                tone="pending"
                status={t.states.exempt}
                href={{ pathname: "/pro-document", params: { type } }}
              />
            );
          }
          const state = documentState(type, snapshot.documents[type]);
          const refused = dossier.documents.find((d) => d.type === type && d.status === "refuse");
          return (
            <Row
              key={type}
              icon={FileText}
              title={t.documents[type]}
              hint={
                state === "refuse" && refused?.refusal_reason
                  ? t.refusedBecause(refused.refusal_reason)
                  : t.documentHints[type]
              }
              tone={documentTone[state]}
              status={t.states[state]}
              href={{ pathname: "/pro-document", params: { type } }}
            />
          );
        })}
        <Row
          icon={UserRound}
          title={t.profilTitle}
          hint={t.profilHint}
          tone={progress.profil ? "done" : "todo"}
          status={progress.profil ? t.states.done : t.states.todo}
          href="/pro-profil-public"
        />
      </View>

      <View style={styles.privacy}>
        <Lock size={16} color={colors["muted-foreground"]} />
        <Text style={styles.privacyText}>{t.privacy}</Text>
      </View>
      <Body muted>{t.after}</Body>
    </Screen>
  );
}

function Row({
  icon: Icon,
  title,
  hint,
  tone,
  status,
  href,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  tone: Tone;
  status: string;
  href?: Href;
}) {
  const chip = toneColors[tone];
  const content = (
    <>
      <View style={styles.icon}>
        <Icon size={20} color={colors["primary-strong"]} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={[styles.chip, { backgroundColor: chip.bg, color: chip.fg }]}>{status}</Text>
      {href ? <ChevronRight size={20} color={colors["muted-foreground"]} /> : null}
    </>
  );
  if (!href) return <View style={styles.row}>{content}</View>;
  return (
    <Tappable
      role="link"
      aria-label={`${title}, ${status}`}
      onPress={() => router.push(href)}
      style={styles.row}
    >
      {content}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  demandHead: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  demandTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  demandNext: { fontFamily: font.medium, fontSize: 14, color: colors["primary-strong"] },
  progress: { gap: spacing(2) },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontFamily: font.medium, fontSize: 13, color: colors["muted-foreground"] },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
    overflow: "hidden",
  },
  bar: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.success },
  list: { gap: spacing(2.5) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  rowHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  chip: {
    fontFamily: font.bold,
    fontSize: 12,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  privacy: { flexDirection: "row", gap: spacing(2), alignItems: "flex-start" },
  privacyText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
  footer: { gap: spacing(2) },
  footerText: {
    fontFamily: font.regular,
    fontSize: 13,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
});
