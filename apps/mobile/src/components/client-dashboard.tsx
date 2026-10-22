import { router } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FilePen,
  HeartHandshake,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tagOf } from "@/components/chantier/chantier-card";
import { ChantierCover, StatusPill } from "@/components/chantier/parts";
import { fr } from "@/i18n/fr";
import type { ClientChantier } from "@/lib/chantiers";
import type { ClientHome } from "@/lib/client-home";
import { formatCents, formatDateNumeric, formatDayAndTime } from "@/lib/format";
import { openTab } from "@/lib/navigation";
import { Card, LinkText, Section } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.home.dashboard;
const { colors, font, radius, spacing } = theme;

type Todo = ClientHome["todos"][number];

const TODO_ICONS = {
  signer_devis: FilePen,
  payer_acompte: CreditCard,
  valider_reception: ClipboardCheck,
  confirmer_levee: ShieldCheck,
  payer_solde: CreditCard,
  donner_avis: Star,
} as const;

/** Même écran que depuis « Mes chantiers » : devis, paiement, avis, ou la vue du chantier. */
function openTodo(todo: Todo) {
  const id = todo.row.c.chantier_id;
  switch (todo.kind) {
    case "signer_devis":
      return router.push(`/devis/${todo.quoteId}`);
    case "payer_acompte":
      return router.push(`/devis/${todo.quoteId}/acompte`);
    case "payer_solde":
      return router.push(`/chantier/${id}/solde`);
    case "donner_avis":
      return router.push(`/chantier/${id}/avis`);
    default:
      // Réception (avec ou sans réserves) et levée des réserves : depuis la vue du chantier.
      return router.push(`/chantier/${id}`);
  }
}

/** Montant affiché : total TTC du devis à signer, acompte ou solde à payer. */
function todoAmount(todo: Todo): number | null {
  if (todo.kind === "payer_acompte" || todo.kind === "payer_solde") return todo.amountCents;
  if (todo.kind === "signer_devis") return todo.row.c.quote_total_ttc_cents ?? null;
  return null;
}

const openChantier = (c: ClientChantier) => router.push(`/chantier/${c.chantier_id}`);

/** Ligne cliquable : icône ou vignette, textes, puis chevron. */
function Row({
  leading,
  label,
  children,
  onPress,
}: {
  leading: ReactNode;
  label: string;
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="link"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.rowText}>{children}</View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

function Icon({ icon: Glyph }: { icon: (typeof TODO_ICONS)[keyof typeof TODO_ICONS] }) {
  return (
    <View style={styles.icon}>
      <Glyph size={18} color={colors["primary-strong"]} />
    </View>
  );
}

/**
 * Tableau de bord de l'accueil du client connecté (ADR 0082) : ce qui l'attend, prochains
 * rendez-vous, chantiers en cours et dernière recherche non envoyée. Les actions ouvrent les mêmes
 * écrans que « Mes chantiers ».
 */
export function ClientDashboard({ home }: { home: ClientHome }) {
  return (
    <>
      {home.todos.length > 0 && (
        <Section title={t.todoTitle}>
          <View style={styles.list}>
            {home.todos.map((todo) => {
              const label =
                todo.kind === "donner_avis"
                  ? t.todo.donner_avis(todo.row.c.artisan_name)
                  : t.todo[todo.kind];
              const amount = todoAmount(todo);
              return (
                <Row
                  key={`${todo.kind}-${todo.row.c.chantier_id}`}
                  leading={<Icon icon={TODO_ICONS[todo.kind]} />}
                  label={label}
                  onPress={() => openTodo(todo)}
                >
                  <View style={styles.labelRow}>
                    <Text style={[styles.strong, styles.flex]}>{label}</Text>
                    {amount !== null ? (
                      <Text style={styles.amount}>{formatCents(amount)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={2}>
                    {t.detail(todo.row.c.title, todo.row.c.artisan_name)}
                  </Text>
                </Row>
              );
            })}
          </View>
        </Section>
      )}

      {home.appointments.length > 0 && (
        <Section title={t.appointmentsTitle}>
          <View style={styles.list}>
            {home.appointments.map((a) => {
              const { day, time } = formatDayAndTime(a.at);
              return (
                <Row
                  key={`${a.kind}-${a.c.chantier_id}`}
                  leading={<Icon icon={CalendarDays} />}
                  label={`${t.appointmentKinds[a.kind]}, ${t.when(day, time)}`}
                  onPress={() => openChantier(a.c)}
                >
                  <Text style={styles.kind}>{t.appointmentKinds[a.kind]}</Text>
                  <Text style={styles.strong}>{t.when(day, time)}</Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    {t.detail(a.c.title, a.c.artisan_name)}
                  </Text>
                </Row>
              );
            })}
          </View>
        </Section>
      )}

      {home.active.length > 0 && (
        <Section title={t.chantiersTitle}>
          <View style={styles.list}>
            {home.active.map((c) => (
              <Row
                key={c.chantier_id}
                leading={
                  <View style={styles.thumb}>
                    <ChantierCover
                      url={c.photo_path ? (home.photoByPath.get(c.photo_path) ?? null) : null}
                      trade={c.trade_label}
                      height={64}
                      compact
                    />
                  </View>
                }
                label={c.title}
                onPress={() => openChantier(c)}
              >
                <StatusPill {...tagOf(c)} />
                <Text style={styles.strong} numberOfLines={2}>
                  {c.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[c.artisan_name, c.trade_label].filter(Boolean).join(" · ")}
                </Text>
              </Row>
            ))}
          </View>
          <LinkText label={t.allChantiers} onPress={() => openTab("/chantiers")} />
        </Section>
      )}

      {home.draft && (
        <Section title={t.draftTitle}>
          <Card>
            <Text style={styles.strong} numberOfLines={2}>
              {home.draft.title ?? fr.myChantiers.drafts.untitled}
            </Text>
            <Text style={styles.meta}>
              {[
                home.draft.city,
                fr.myChantiers.drafts.started(formatDateNumeric(home.draft.createdAt)),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <LinkText
              label={fr.myChantiers.drafts.resume}
              onPress={() => {
                const id = home.draft?.id;
                if (id) router.push({ pathname: "/projet/[id]", params: { id } });
              }}
            />
          </Card>
        </Section>
      )}

      {/* « Invitez votre artisan de confiance » (ADR 0162). */}
      <Card>
        <View style={styles.invite}>
          <View style={styles.icon}>
            <HeartHandshake size={20} color={colors["primary-strong"]} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.strong}>{fr.inviteArtisan.title}</Text>
            <Text style={styles.meta}>{fr.inviteArtisan.cardText}</Text>
          </View>
        </View>
        <LinkText
          label={fr.inviteArtisan.cardAction}
          onPress={() => router.push("/inviter-artisan")}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  invite: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  list: { gap: spacing(2.5) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(3.5),
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: spacing(1) },
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: spacing(2) },
  flex: { flex: 1 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: 64, height: 64, overflow: "hidden", borderRadius: 12 },
  kind: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  strong: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
  amount: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
});
