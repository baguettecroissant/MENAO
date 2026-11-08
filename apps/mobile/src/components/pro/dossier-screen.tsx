import {
  CHARTER_RULE_COUNT,
  REQUIRED_DOCUMENT_TYPES,
  documentState,
  dossierGroups,
  dossierItemCount,
  zoneDemandShown,
  type DocumentState,
  type RequiredDocumentType,
} from "@menao/core";
import {
  Building2,
  Camera,
  FileText,
  PenLine,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TabHeader } from "@/components/tab-header";
import { fr } from "@/i18n/fr";
import { loadDossier, loadZoneDemand, submitDossier } from "@/lib/artisan-dossier";
import { useTrades } from "@/lib/trades";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice, Screen, ScreenSkeleton } from "@/ui";
import { theme } from "@/ui/theme";
import { ExamplesCard } from "@/components/examples";
import {
  DossierChecks,
  DossierGroup,
  DossierRow,
  PrivacyNote,
  SoftBanner,
  type DossierTone,
} from "./dossier-kit";
import { FicheButton } from "./fiche-kit";
import { ProgressBar } from "./tools-kit";

const t = fr.proDossier;
const { colors, font, radius, spacing } = theme;

const documentTone: Record<DocumentState, DossierTone> = {
  missing: "todo",
  en_attente: "pending",
  valide: "done",
  refuse: "danger",
  a_refaire: "danger",
};

/** Icône de chaque document : bouclier pour les assurances, feuille pour les autres. */
const documentIcon: Record<RequiredDocumentType, LucideIcon> = {
  kbis: FileText,
  decennale: ShieldCheck,
  rc_pro: ShieldCheck,
  identite: FileText,
  urssaf: FileText,
};

/**
 * « Faire vérifier mon entreprise » (ADR 0113), comme sur le site (ADR 0111) : ce qu'il reste à
 * faire avant l'envoi du dossier, chaque élément ouvrant son écran, puis l'envoi. Rien sur la
 * formule ni l'abonnement (règle 10) : MENAO écrit à l'artisan une fois son entreprise vérifiée.
 * Refonte « Nette » (lot 9, maquette « DossierApp ») : carte d'avancement, trois groupes en cartes
 * avec leur compteur (entreprise, documents, fiche), barre du bas avec ce qu'il reste et l'envoi.
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
  const groups = dossierGroups(snapshot);
  const profileDone = progress.entreprise && progress.metiers && progress.zone;
  const count = (g: { done: number; total: number }) => t.progress(g.done, g.total);

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
          <>
            <Text style={styles.footerText}>
              {dossier.canSubmit ? t.ready : t.left(dossier.itemsLeft)}
            </Text>
            <FicheButton
              label={t.submit}
              tall
              onPress={() => void submit()}
              loading={sending}
              disabled={!dossier.canSubmit}
            />
          </>
        ) : undefined
      }
    >
      <TabHeader title={t.title} />
      {dossier.status === "en_verification" ? <Notice tone="success">{t.sent}</Notice> : null}
      {/* Pendant la vérification : l'espace rempli d'exemples (ADR 0184), comme sur le site. */}
      {dossier.status === "en_verification" ? (
        <ExamplesCard
          title={fr.proExamples.dossierCard.title}
          text={fr.proExamples.dossierCard.text}
          action={fr.proExamples.dossierCard.open}
        />
      ) : null}
      {dossier.status === "refuse" ? (
        <Notice tone="error">{t.refused(dossier.refusalReason)}</Notice>
      ) : null}
      {dossier.status === "brouillon" && dossier.refusalReason ? (
        <Notice tone="error">{t.complement(dossier.refusalReason)}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <View style={styles.progress}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t.progressLabel}</Text>
          <Text style={styles.progressValue}>{t.progress(done, total)}</Text>
        </View>
        <ProgressBar value={done} target={total} label={t.progressLabel} color={colors.success} />
        {editable ? <Text style={styles.progressHint}>{t.lead}</Text> : null}
      </View>

      {progress.metiers && progress.zone && zoneDemand && zoneDemandShown(zoneDemand.recherches) ? (
        <SoftBanner
          icon={Users}
          title={t.zoneDemand.title}
          text={t.zoneDemand.body(zoneDemand.recherches, zoneDemand.jours)}
        >
          {zoneDemand.metiers.length > 1 ? (
            <Text style={styles.demandTrades}>
              {zoneDemand.metiers
                .map((m) =>
                  t.zoneDemand.trade(
                    trades.find((tr) => tr.code === m.metier)?.label ?? m.metier,
                    m.recherches,
                  ),
                )
                .join(" · ")}
            </Text>
          ) : null}
          <Text style={styles.demandNext}>{t.zoneDemand.next}</Text>
        </SoftBanner>
      ) : null}

      <DossierGroup title={t.groups.company} count={count(groups.company)}>
        <DossierRow
          icon={Building2}
          title={t.profileTitle}
          hint={profileDone ? undefined : t.profileTodo}
          sub={
            <DossierChecks
              items={[
                { label: t.profileParts.entreprise, done: progress.entreprise },
                { label: t.profileParts.metiers, done: progress.metiers },
                { label: t.profileParts.zone, done: progress.zone },
              ]}
            />
          }
          tone={profileDone ? "done" : "todo"}
          status={profileDone ? t.states.done : t.states.todo}
          href="/pro-entreprise"
        />
        <DossierRow
          icon={PenLine}
          title={t.charterTitle}
          hint={t.charterHint(CHARTER_RULE_COUNT)}
          tone={progress.charte ? "done" : "todo"}
          status={progress.charte ? t.states.signed : t.states.todo}
          href="/pro-charte"
        />
      </DossierGroup>

      <DossierGroup title={t.groups.documents} count={count(groups.documents)}>
        {REQUIRED_DOCUMENT_TYPES.map((type) => {
          // « Non soumis » à la décennale (ADR 0116) : pas exigée, l'équipe le vérifie.
          if (type === "decennale" && snapshot.decennaleExempt) {
            return (
              <DossierRow
                key={type}
                icon={documentIcon[type]}
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
          // Kbis vérifié au registre, ou vérification impossible (ADR 0217), comme sur le site.
          const registry =
            type === "kbis" &&
            dossier.documents.some((d) => d.type === "kbis" && d.source === "registre");
          const registryFailed =
            type === "kbis" &&
            state === "missing" &&
            dossier.registryStatus !== null &&
            dossier.registryStatus !== "verifie";
          return (
            <DossierRow
              key={type}
              icon={documentIcon[type]}
              title={t.documents[type]}
              hint={
                state === "refuse" && refused?.refusal_reason
                  ? t.refusedBecause(refused.refusal_reason)
                  : registry && state === "valide"
                    ? t.registryHint
                    : registryFailed
                      ? t.registryFailedHint
                      : t.documentHints[type]
              }
              tone={documentTone[state]}
              status={t.states[state]}
              href={{ pathname: "/pro-document", params: { type } }}
            />
          );
        })}
      </DossierGroup>

      <DossierGroup title={t.groups.profile} count={count(groups.profile)}>
        <DossierRow
          icon={Camera}
          title={t.profilTitle}
          hint={t.profilHint}
          tone={progress.profil ? "done" : "todo"}
          status={progress.profil ? t.states.done : t.states.todo}
          href="/pro-profil-public"
        />
        {/* Paiements ouverts dès l'envoi du dossier, comme sur le site (ADR 0215). */}
        {dossier.status === "en_verification" ? (
          <DossierRow
            icon={Wallet}
            title={t.paiementsTitle}
            hint={t.paiementsHintNow}
            tone={progress.paiements ? "done" : "todo"}
            status={progress.paiements ? t.states.done : t.states.todo}
            href="/pro-paiements"
          />
        ) : null}
      </DossierGroup>

      <PrivacyNote text={t.privacy} />
      <Text style={styles.after}>{t.after}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: {
    gap: spacing(2.5),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  progressLabel: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  progressValue: {
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  progressHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  demandTrades: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  demandNext: { fontFamily: font.semibold, fontSize: 13, color: colors["primary-strong"] },
  after: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  footerText: {
    fontFamily: font.semibold,
    fontSize: 13,
    textAlign: "center",
    color: colors.foreground,
  },
});
