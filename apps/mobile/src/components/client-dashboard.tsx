import {
  CHANTIER_STEPS,
  chantierStepIndex,
  nextIntervention,
  type ChantierStatus,
} from "@menao/core";
import { router } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  CreditCard,
  FilePen,
  FileSearch,
  HeartHandshake,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { tagOf } from "@/components/chantier/chantier-card";
import { ChantierCover } from "@/components/chantier/parts";
import { FigureStrip, GroupTitle, ListGroup, ListRow } from "@/components/list-kit";
import { FicheTag, TAG_TONES, type FicheTone } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";
import type { ClientChantier } from "@/lib/chantiers";
import type { ClientHome } from "@/lib/client-home";
import {
  formatCents,
  formatDateNumeric,
  formatDayAndTime,
  formatDayMonthShort,
  formatWeekdayDay,
} from "@/lib/format";
import { openTab } from "@/lib/navigation";
import { LinkText, Tappable } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.home.dashboard;
const { colors, font, radius, spacing } = theme;

type Todo = ClientHome["todos"][number];

const TODO_ICONS: Record<Todo["kind"], { icon: LucideIcon; tone: FicheTone }> = {
  signer_devis: { icon: FilePen, tone: "primary" },
  payer_acompte: { icon: CreditCard, tone: "primary" },
  valider_reception: { icon: ClipboardCheck, tone: "success" },
  confirmer_levee: { icon: ShieldCheck, tone: "warning" },
  payer_solde: { icon: CreditCard, tone: "primary" },
  donner_avis: { icon: Star, tone: "warning" },
};

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

const todoLabel = (todo: Todo) =>
  todo.kind === "donner_avis" ? t.todo.donner_avis(todo.row.c.artisan_name) : t.todo[todo.kind];

const openChantier = (c: ClientChantier) => router.push(`/chantier/${c.chantier_id}`);

/**
 * Tableau de bord de l'accueil du client connecté (ADR 0082), refonte « Nette » (lot 6) : trois
 * chiffres serrés, « À faire maintenant », cartes des chantiers en cours (avancement en 5
 * segments), prochains rendez-vous, recherche non envoyée et invitation d'un artisan. Les actions
 * ouvrent les mêmes écrans que « Mes chantiers ».
 */
export function ClientDashboard({ home }: { home: ClientHome }) {
  const { figures } = home;
  const todoByChantier = new Map(home.todos.map((todo) => [todo.row.c.chantier_id, todo]));
  const next = figures.next;
  const nextWhen = next ? formatDayAndTime(next.at) : null;
  const showStrip = figures.active > 0 || home.todos.length > 0;

  return (
    <View style={styles.stack}>
      {showStrip ? (
        <FigureStrip
          label={t.figures.label}
          figures={[
            { label: t.figures.active, value: String(figures.active) },
            {
              label: t.figures.todo,
              value: String(home.todos.length),
              danger: home.todos.length > 0,
            },
            {
              label: t.figures.next,
              value: next ? formatWeekdayDay(next.at) : "—",
              spoken:
                next && nextWhen
                  ? t.figures.nextSpoken(
                      t.appointmentKinds[next.kind],
                      nextWhen.day,
                      nextWhen.time,
                      next.artisan,
                    )
                  : t.figures.none,
            },
          ]}
        />
      ) : null}

      {home.todos.length > 0 ? (
        <TodoCard todos={home.todos} />
      ) : figures.active > 0 ? (
        <View style={styles.done}>
          <CircleCheck size={22} color={colors.success} />
          <View style={styles.flex}>
            <Text style={styles.doneTitle}>{t.todoEmpty}</Text>
            <Text style={styles.meta}>{t.summary.a_jour}</Text>
          </View>
        </View>
      ) : null}

      {home.active.length > 0 ? (
        <>
          <GroupTitle title={t.chantiersTitle} count={home.activeCount} />
          {home.active.map((c) => (
            <ChantierHomeCard
              key={c.chantier_id}
              c={c}
              photoUrl={c.photo_path ? (home.photoByPath.get(c.photo_path) ?? null) : null}
              todo={todoByChantier.get(c.chantier_id) ?? null}
            />
          ))}
          {home.activeCount > home.active.length ? (
            <LinkText label={t.allChantiers} onPress={() => openTab("/chantiers")} />
          ) : null}
        </>
      ) : null}

      {home.appointments.length > 0 ? (
        <>
          <GroupTitle title={t.appointmentsTitle} count={home.appointments.length} />
          <ListGroup>
            {home.appointments.map((a) => {
              const { day, time } = formatDayAndTime(a.at);
              const detail = t.detail(a.c.title, a.c.artisan_name);
              return (
                <ListRow
                  key={`${a.kind}-${a.c.chantier_id}`}
                  icon={{ icon: CalendarDays, tone: "primary" }}
                  label={`${t.appointmentKinds[a.kind]}, ${t.when(day, time)}, ${detail}`}
                  title={t.when(day, time)}
                  detail={`${t.appointmentKinds[a.kind]} · ${detail}`}
                  onPress={() => openChantier(a.c)}
                />
              );
            })}
          </ListGroup>
        </>
      ) : null}

      {home.draft ? (
        <>
          <Text role="heading" style={styles.groupHeading}>
            {t.draftTitle}
          </Text>
          <ListGroup>
            <ListRow
              icon={{ icon: FileSearch, tone: "neutral" }}
              label={`${fr.myChantiers.drafts.resume} : ${home.draft.title ?? fr.myChantiers.drafts.untitled}`}
              title={home.draft.title ?? fr.myChantiers.drafts.untitled}
              detail={[
                home.draft.city,
                fr.myChantiers.drafts.started(formatDateNumeric(home.draft.createdAt)),
              ]
                .filter(Boolean)
                .join(" · ")}
              onPress={() => {
                const id = home.draft?.id;
                if (id) router.push({ pathname: "/projet/[id]", params: { id } });
              }}
            />
          </ListGroup>
        </>
      ) : null}

      {/* « Invitez votre artisan de confiance » (ADR 0162). */}
      <View style={[styles.card, styles.inviteCard]}>
        <View style={styles.invite}>
          <View style={[styles.icon, { backgroundColor: TAG_TONES.primary.bg }]}>
            <HeartHandshake size={20} color={TAG_TONES.primary.fg} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.strong}>{fr.inviteArtisan.title}</Text>
            <Text style={styles.meta}>{fr.inviteArtisan.cardText}</Text>
          </View>
        </View>
        <LinkText
          label={fr.inviteArtisan.cardAction}
          onPress={() => router.push("/inviter-artisan")}
        />
      </View>
    </View>
  );
}

/**
 * « À faire maintenant » (maquette du lot 6) : titre et pastille rouge du nombre dans la carte,
 * puis une ligne par action (icône colorée, action, « chantier · artisan », montant, chevron).
 */
function TodoCard({ todos }: { todos: Todo[] }) {
  return (
    <View
      style={styles.card}
      role="region"
      aria-label={`${t.todoTitle}, ${t.todoCount(todos.length)}`}
    >
      <View style={styles.todoHead}>
        <Text role="heading" style={styles.cardTitle}>
          {t.todoTitle}
        </Text>
        <View style={styles.count} aria-hidden>
          <Text style={styles.countText}>{todos.length}</Text>
        </View>
      </View>
      <View>
        {todos.map((todo, index) => {
          const { icon: Icon, tone } = TODO_ICONS[todo.kind];
          const label = todoLabel(todo);
          const detail = t.detail(todo.row.c.title, todo.row.c.artisan_name);
          const amount = todoAmount(todo);
          return (
            <Tappable
              key={`${todo.kind}-${todo.row.c.chantier_id}`}
              role="link"
              aria-label={[label, detail, amount !== null ? formatCents(amount) : null]
                .filter(Boolean)
                .join(", ")}
              onPress={() => openTodo(todo)}
              scaleTo={0.985}
              style={[styles.todoRow, index > 0 && styles.todoBorder]}
            >
              <View style={[styles.icon, { backgroundColor: TAG_TONES[tone].bg }]}>
                <Icon size={20} color={TAG_TONES[tone].fg} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.todoTitle} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={styles.detail} numberOfLines={1}>
                  {detail}
                </Text>
                {amount !== null ? (
                  <Text style={styles.todoAmount}>{formatCents(amount)}</Text>
                ) : null}
              </View>
              <ChevronRight size={18} color={colors["muted-foreground"]} />
            </Tappable>
          );
        })}
      </View>
    </View>
  );
}

/** Date utile à droite de la carte : prochaine intervention, sinon le démarrage des travaux. */
function cardDate(c: ClientChantier): string | null {
  const status = c.status as ChantierStatus;
  const next = nextIntervention({ status, appointmentAt: c.appointment_at, startAt: c.start_at });
  if (next) return t.cardDate[next.kind](formatDayMonthShort(next.startsAt));
  if (status === "en_cours" && c.start_at) {
    return t.cardDate.started(formatDayMonthShort(c.start_at));
  }
  return null;
}

/**
 * Carte d'un chantier en cours (maquette du lot 6) : vignette, pastille d'état, titre, artisan,
 * avancement en 5 segments et date utile, puis l'action attendue sur fond crème.
 */
function ChantierHomeCard({
  c,
  photoUrl,
  todo,
}: {
  c: ClientChantier;
  photoUrl: string | null;
  todo: Todo | null;
}) {
  const tag = tagOf(c);
  const step = chantierStepIndex(c.status as ChantierStatus);
  const date = cardDate(c);
  const amount = todo ? todoAmount(todo) : null;
  const TodoIcon = todo ? TODO_ICONS[todo.kind].icon : null;
  return (
    <Tappable
      role="link"
      aria-label={[c.title, tag.text, c.artisan_name, date].filter(Boolean).join(", ")}
      onPress={() => openChantier(c)}
      scaleTo={0.985}
      style={[styles.card, styles.chantier]}
    >
      <View style={styles.chantierHead}>
        <View style={styles.thumb}>
          <ChantierCover url={photoUrl} trade={c.trade_label} height={64} compact />
        </View>
        <View style={styles.chantierTexts}>
          <FicheTag text={tag.text} tone={tag.tone} dot />
          <Text style={styles.chantierTitle} numberOfLines={2}>
            {c.title}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {c.artisan_name}
          </Text>
        </View>
      </View>
      {step !== null || date ? (
        <View style={styles.progressRow}>
          {step !== null ? <MiniProgress step={step} /> : <View />}
          {date ? <Text style={styles.date}>{date}</Text> : null}
        </View>
      ) : null}
      {todo && TodoIcon ? (
        <View style={styles.info}>
          <TodoIcon size={16} color={colors.label} />
          <Text style={styles.infoText} numberOfLines={2}>
            {[todoLabel(todo), amount !== null ? formatCents(amount) : null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}
    </Tappable>
  );
}

/** Avancement en 5 segments (spec §9) : vert franchi, bleu en cours, gris à venir. */
function MiniProgress({ step }: { step: number }) {
  const n = CHANTIER_STEPS.length;
  const shown = Math.min(step, n - 1);
  const label = fr.chantier.steps[CHANTIER_STEPS[shown] ?? "signature"];
  return (
    <View style={styles.progress} accessible aria-label={t.progressLabel(label, shown + 1, n)}>
      <View style={styles.segments}>
        {CHANTIER_STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i < step ? colors.success : i === step ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>{t.progress(label, shown + 1, n)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing(4) },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  groupHeading: {
    marginTop: spacing(2),
    marginBottom: -spacing(1),
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  todoHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2.5),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(1.5),
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
  },
  countText: { fontFamily: font.bold, fontSize: 12, color: colors["primary-foreground"] },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
  },
  todoBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  todoTitle: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  todoAmount: { fontFamily: font.semibold, fontSize: 14, color: colors.label },
  detail: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  done: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: colors["success-soft"],
  },
  doneTitle: { fontFamily: font.bold, fontSize: 16, color: colors.success },
  chantier: { gap: spacing(3.5), padding: spacing(4) },
  chantierHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing(3.5) },
  thumb: { width: 64, height: 64, overflow: "hidden", borderRadius: 12 },
  chantierTexts: { flex: 1, minWidth: 0, gap: spacing(1) },
  chantierTitle: {
    fontFamily: font.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.foreground,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  progress: { gap: spacing(1.5) },
  segments: { flexDirection: "row", gap: 3 },
  segment: { width: 22, height: 6, borderRadius: 3 },
  progressText: { fontFamily: font.semibold, fontSize: 13, color: colors.label },
  date: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  infoText: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.label },
  inviteCard: { gap: spacing(3), padding: spacing(4) },
  invite: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  strong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.foreground },
  meta: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});
