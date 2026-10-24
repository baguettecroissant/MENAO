import {
  MAX_PROJECT_PHOTOS,
  PROJECT_TEXT_MAX_LENGTH,
  SUGGESTION_MIN_LENGTH,
  appendDescription,
  appendIdea,
  matchNeedPhrases,
  needHelpLevel,
  remainingCompletion,
  type NeedIdea,
  type NeedPhrase,
} from "@menao/core";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Info,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  House,
  MapPin,
  Ruler,
  Wrench,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AnalysisScreen } from "@/components/analysis-screen";
import { DictationButton } from "@/components/dictation-button";
import { PhotoThumbnails } from "@/components/photo-thumbnails";
import { TopBar } from "@/components/top-bar";
import { TradeShortcuts } from "@/components/trade-shortcuts";
import { fr } from "@/i18n/fr";
import { choosePhotoSource, pickPhotos, uploadPhoto, type PickedPhoto } from "@/lib/photos";
import { useNeedSuggestions } from "@/lib/need-suggestions";
import { describeProjectPhoto } from "@/lib/photo-description";
import { analyzeNeed } from "@/lib/project";
import { useTrades } from "@/lib/trades";
import { uploadBatch } from "@/lib/uploads";
import { Button, Notice, Screen } from "@/ui";
import { theme } from "@/ui/theme";

const { colors, font, radius, spacing } = theme;
const s = fr.search.suggestions;
const u = fr.search.understanding;
const ph = fr.search.photoDescription;

type PhotoDraft =
  | { step: "reading" }
  | { step: "filled" }
  | { step: "ready"; description: string }
  | { step: "failed" };
const p = fr.search.proposals;
// Icônes des cartes d'avantages, dans l'ordre des textes (comme sur le site).
const FEATURE_ICONS = [Sparkles, Clock, ShieldCheck, BadgeCheck];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Saisie du projet (F-05) d'après la maquette « Recherche », comme sur le site : zone de saisie
 * avec trombone (photos, 10 au plus) et micro (dictée), aide progressive, raccourcis métiers et
 * avantages. L'analyse par l'IA crée le projet et pré-remplit ses critères (ADR 0012) ; l'écran
 * animé reste affiché pendant l'analyse puis l'envoi des photos, avant la vérification des critères.
 * « Redemander un devis » (`artisan`, `depuis`, `nom`) : l'artisan d'un chantier précédent est
 * proposé en premier ; le nom ne sert qu'au bandeau, le serveur vérifie le chantier commun.
 */
export default function Recherche() {
  const params = useLocalSearchParams<{
    metier?: string;
    artisan?: string;
    depuis?: string;
    nom?: string;
  }>();
  const rehire =
    params.artisan && params.depuis && UUID.test(params.artisan) && UUID.test(params.depuis)
      ? { artisanId: params.artisan, chantierId: params.depuis }
      : null;
  const trades = useTrades();
  const [description, setDescription] = useState("");
  const [trade, setTrade] = useState<string | null>(params.metier ?? null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [phase, setPhase] = useState<"idle" | "analyzing" | "photos">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const ready = description.trim().length > 0;
  const input = useRef<TextInput>(null);
  // Suggestions pendant la saisie (ADR 0177), comme sur le site : la suite proposée, à toucher pour
  // l'ajouter, et des idées en pastilles pour préciser la demande.
  const suggestion = useNeedSuggestions(description, phase === "idle");
  const [usedIdeas, setUsedIdeas] = useState<string[]>([]);
  // Propositions instantanées (ADR 0178), comme sur le site : demandes types dès les premiers mots.
  const proposals = useMemo(
    () => (phase === "idle" ? matchNeedPhrases(description) : []),
    [phase, description],
  );
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const showProposals = proposals.length > 0 && closedFor !== description;
  const completion =
    suggestion && !showProposals
      ? remainingCompletion(suggestion.base, suggestion.completion, description)
      : null;
  const ideas =
    suggestion && description.trim().length >= SUGGESTION_MIN_LENGTH
      ? suggestion.ideas.filter((idea) => !usedIdeas.includes(`${suggestion.base}|${idea.label}`))
      : [];

  /** Texte modifié par une suggestion, puis curseur placé (fin du texte ou endroit à compléter). */
  function replaceText(next: string, select: [number, number] | null = null) {
    const value = next.slice(0, PROJECT_TEXT_MAX_LENGTH);
    setDescription(value);
    const [start, end] = select ?? [value.length, value.length];
    input.current?.focus();
    setTimeout(() => {
      // Natif : setSelection ; version web : le champ est un élément HTML.
      const field = input.current as
        (TextInput & { setSelectionRange?: (start: number, end: number) => void }) | null;
      if (typeof field?.setSelection === "function") field.setSelection(start, end);
      else field?.setSelectionRange?.(start, end);
    }, 50);
  }

  function chooseProposal(proposal: NeedPhrase) {
    const next = `${proposal.text} `;
    setClosedFor(next);
    replaceText(next);
  }

  // Compréhension en direct (ADR 0179), comme sur le site.
  const [answered, setAnswered] = useState<string[]>([]);
  const understood =
    suggestion && description.trim().length >= SUGGESTION_MIN_LENGTH ? suggestion.understood : null;
  const understoodItems = understood
    ? [
        {
          Icon: Wrench,
          label: understood.trade
            ? (trades.find((t) => t.code === understood.trade)?.label ?? null)
            : null,
        },
        { Icon: House, label: understood.room },
        { Icon: MapPin, label: understood.city },
        { Icon: Ruler, label: understood.surface },
        { Icon: Clock, label: understood.timing },
      ].filter((item): item is { Icon: typeof Wrench; label: string } => Boolean(item.label))
    : [];
  const question =
    understood && suggestion?.question && !answered.includes(`${suggestion.base}|q`)
      ? suggestion.question
      : null;

  function answerQuestion(answer: NeedIdea) {
    if (suggestion) setAnswered((done) => [...done, `${suggestion.base}|q`]);
    const next = appendIdea(description, answer.insert);
    replaceText(next.text, next.select);
  }

  function addIdea(idea: NeedIdea) {
    if (suggestion) setUsedIdeas((used) => [...used, `${suggestion.base}|${idea.label}`]);
    const next = appendIdea(description, idea.insert);
    replaceText(next.text, next.select);
  }

  // Photo → description (ADR 0180), comme sur le site : tant que la description est courte, la
  // première photo jointe est décrite ; le texte vide est rempli, sinon la description est proposée.
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const currentText = useRef(description);
  useEffect(() => {
    currentText.current = description;
  }, [description]);

  async function describePhoto(photo: PickedPhoto) {
    setPhotoDraft({ step: "reading" });
    const drafted = await describeProjectPhoto(photo);
    if (!drafted) return setPhotoDraft({ step: "failed" });
    if (currentText.current.trim()) return setPhotoDraft({ step: "ready", description: drafted });
    setPhotoDraft({ step: "filled" });
    replaceText(`${drafted} `);
  }

  async function addPhotos() {
    const source = await choosePhotoSource(fr.search.photos.add);
    if (!source) return;
    const picked = await pickPhotos(source, MAX_PROJECT_PHOTOS - photos.length);
    if ("error" in picked) return setFailure(picked.error);
    setFailure(null);
    setPhotos((current) => [...current, ...picked.photos].slice(0, MAX_PROJECT_PHOTOS));
    const first = picked.photos[0];
    if (first && needHelpLevel(description) !== "suffisant" && photoDraft?.step !== "reading") {
      void describePhoto(first);
    }
  }

  async function submit() {
    if (!ready || phase !== "idle") return;
    setFailure(null);
    setPhase("analyzing");
    const result = await analyzeNeed(description.trim(), trade, rehire);
    if (result.status !== "ok") {
      setPhase("idle");
      return setFailure(fr.search.errors[result.status]);
    }
    let failed = false;
    if (photos.length) {
      // Comme sur le site : les photos rejoignent le projet créé par l'analyse.
      setPhase("photos");
      const project = { purpose: "project_photo", projectId: result.projectId } as const;
      const sent = await uploadBatch(photos, (photo) => uploadPhoto(project, photo));
      failed = sent.added < photos.length;
    }
    router.replace({
      pathname: "/projet/[id]",
      params: failed ? { id: result.projectId, photos: "erreur" } : { id: result.projectId },
    });
  }

  const help = needHelpLevel(description);
  return (
    <View style={styles.page}>
      <Screen header={<TopBar />}>
        {/* Maquette « Recherche » : titre, accroche, zone de saisie avec trombone et micro. */}
        <View style={styles.hero}>
          <Text role="heading" style={styles.title}>
            {fr.search.titleStart} <Text style={styles.accent}>{fr.search.titleAccent}</Text>
          </Text>
          <View style={styles.tagline}>
            <Sparkles size={15} color={colors["primary-strong"]} />
            <Text style={styles.taglineText}>{fr.search.tagline}</Text>
          </View>
        </View>
        {rehire && params.nom ? <Notice tone="info">{fr.search.rehire(params.nom)}</Notice> : null}
        {failure && <Notice tone="error">{failure}</Notice>}
        <View style={[styles.box, focused && styles.boxFocused]}>
          {photos.length > 0 ? (
            <View style={styles.boxPhotos} aria-label={fr.search.photos.count(photos.length)}>
              <PhotoThumbnails
                // La même photo peut être choisie deux fois : repérée par sa place dans la liste.
                photos={photos.map((photo, i) => ({ key: String(i), uri: photo.uri }))}
                alt={fr.search.photos.alt}
                removeLabel={fr.search.photos.remove}
                onRemove={(key) =>
                  setPhotos((current) => current.filter((_, i) => String(i) !== key))
                }
              />
            </View>
          ) : null}
          <TextInput
            ref={input}
            aria-label={fr.search.label}
            value={description}
            onChangeText={setDescription}
            placeholder={fr.search.placeholder}
            placeholderTextColor={colors["subtle-foreground"]}
            maxLength={PROJECT_TEXT_MAX_LENGTH}
            multiline
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.input}
          />
          <View style={styles.boxActions}>
            <Pressable
              role="button"
              aria-label={fr.search.attach}
              accessibilityHint={fr.search.photos.hint}
              disabled={photos.length >= MAX_PROJECT_PHOTOS}
              onPress={addPhotos}
              style={({ pressed }) => [
                styles.attach,
                photos.length >= MAX_PROJECT_PHOTOS && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Paperclip size={17} color={colors["muted-foreground"]} />
            </Pressable>
            <DictationButton
              onText={(spoken) =>
                setDescription((current) =>
                  (current.trim() ? `${current.trim()} ${spoken}` : spoken).slice(
                    0,
                    PROJECT_TEXT_MAX_LENGTH,
                  ),
                )
              }
              onError={setFailure}
            />
          </View>
        </View>
        {showProposals ? (
          <View role="list" aria-label={p.label} style={styles.proposals}>
            {proposals.map((proposal, index) => (
              <Pressable
                key={proposal.text}
                role="button"
                onPress={() => chooseProposal(proposal)}
                style={({ pressed }) => [
                  styles.proposal,
                  index > 0 && styles.proposalBorder,
                  pressed && styles.proposalPressed,
                ]}
              >
                <Search size={15} color={colors["subtle-foreground"]} />
                <Text style={styles.proposalText}>{proposal.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {completion ? (
          <Pressable
            role="button"
            aria-label={s.acceptAria(completion.trim())}
            onPress={() => replaceText(description + completion)}
            style={({ pressed }) => [styles.completion, pressed && styles.pressed]}
          >
            <Text style={styles.completionText} numberOfLines={2}>
              <Text style={styles.completionEllipsis}>… </Text>
              {completion.trim()}
            </Text>
            <View style={styles.completionAction}>
              <ArrowRight size={14} color={colors["primary-strong"]} />
              <Text style={styles.completionActionText}>{s.accept}</Text>
            </View>
          </Pressable>
        ) : null}
        {photoDraft?.step === "ready" ? (
          <View aria-live="polite" style={styles.question}>
            <View style={styles.understoodTitle}>
              <Sparkles size={14} color={colors.primary} />
              <Text style={styles.understoodTitleText}>{ph.fromPhoto}</Text>
            </View>
            <Text style={styles.questionText}>{photoDraft.description}</Text>
            <Pressable
              role="button"
              onPress={() => {
                setPhotoDraft(null);
                replaceText(`${appendDescription(description, photoDraft.description)} `);
              }}
              style={({ pressed }) => [styles.idea, styles.photoAdd, pressed && styles.pressed]}
            >
              <Plus size={13} color={colors["primary-strong"]} />
              <Text style={styles.ideaText}>{ph.add}</Text>
            </Pressable>
          </View>
        ) : photoDraft ? (
          <View aria-live="polite" style={styles.help}>
            <Sparkles
              size={14}
              color={
                photoDraft.step === "failed" ? colors["muted-foreground"] : colors["primary-strong"]
              }
            />
            <Text style={[styles.helpText, photoDraft.step !== "failed" && styles.helpEnough]}>
              {ph[photoDraft.step]}
            </Text>
          </View>
        ) : null}
        {understoodItems.length > 0 ? (
          <View aria-live="polite" style={styles.understood}>
            <View style={styles.understoodTitle}>
              <Sparkles size={13} color={colors["primary-strong"]} />
              <Text style={styles.understoodTitleText}>{u.title}</Text>
            </View>
            {understoodItems.map(({ Icon, label }) => (
              <View key={label} style={styles.badge}>
                <Icon size={13} color={colors["primary-strong"]} />
                <Text style={styles.badgeText}>{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {question ? (
          <View role="group" aria-label={question.label} style={styles.question}>
            <Text style={styles.questionText}>{question.label}</Text>
            <View style={styles.answers}>
              {question.answers.map((answer) => (
                <Pressable
                  key={answer.label}
                  role="button"
                  onPress={() => answerQuestion(answer)}
                  style={({ pressed }) => [styles.answer, pressed && styles.proposalPressed]}
                >
                  <Text style={styles.answerText}>{answer.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {ideas.length > 0 ? (
          <View role="group" aria-label={s.ideasAria} style={styles.ideas}>
            <Text style={styles.ideasLabel}>{s.ideas}</Text>
            {ideas.map((idea) => (
              <Pressable
                key={idea.label}
                role="button"
                aria-label={s.addIdea(idea.label)}
                onPress={() => addIdea(idea)}
                style={({ pressed }) => [styles.idea, pressed && styles.pressed]}
              >
                <Plus size={13} color={colors["primary-strong"]} />
                <Text style={styles.ideaText}>{idea.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View aria-live="polite" style={styles.help}>
          {help === "suffisant" ? (
            <>
              <Sparkles size={14} color={colors["primary-strong"]} />
              <Text style={[styles.helpText, styles.helpEnough]}>{fr.search.helpEnough}</Text>
            </>
          ) : (
            <>
              <Info size={14} color={colors["muted-foreground"]} />
              <Text style={styles.helpText}>
                {help === "vide" ? fr.search.helpEmpty : fr.search.helpShort}
              </Text>
            </>
          )}
        </View>
        {trades.length > 0 && (
          <TradeShortcuts
            trades={trades}
            selected={trade}
            onToggle={(code) => setTrade((current) => (current === code ? null : code))}
          />
        )}
        <Button label={fr.search.submit} icon={Search} disabled={!ready} onPress={submit} />
        <Text style={styles.privacy}>{fr.search.privacy}</Text>
        <View style={styles.features}>
          {fr.search.features.map((feature, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <View key={feature.title} style={styles.feature}>
                <View style={styles.featureHead}>
                  <Icon size={16} color={colors.primary} />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </View>
                <Text style={styles.featureBody}>{feature.body}</Text>
              </View>
            );
          })}
        </View>
      </Screen>
      {phase !== "idle" && <AnalysisScreen photos={phase === "photos"} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { alignItems: "center", gap: spacing(2), paddingTop: spacing(2) },
  title: {
    fontFamily: font.medium,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    color: colors.foreground,
  },
  accent: { color: colors.primary },
  tagline: { flexDirection: "row", alignItems: "center", gap: spacing(1.5) },
  taglineText: { fontFamily: font.regular, fontSize: 14, color: colors["primary-strong"] },
  box: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    boxShadow: "0 2px 10px rgba(17, 23, 40, 0.06)",
  },
  boxFocused: { borderColor: colors.primary },
  boxPhotos: { paddingHorizontal: spacing(4), paddingTop: spacing(4) },
  input: {
    minHeight: 110,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2),
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  boxActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing(3),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },
  attach: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  proposals: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  proposal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  proposalBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  proposalPressed: { backgroundColor: colors["primary-softer"] },
  proposalText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  completion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    borderRadius: radius.card,
    backgroundColor: colors["primary-softer"],
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  completionText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors["muted-foreground"],
  },
  completionEllipsis: { color: colors["subtle-foreground"] },
  completionAction: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  completionActionText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  understood: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(1.5) },
  understoodTitle: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  understoodTitleText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors["primary-soft"],
  },
  badgeText: { fontFamily: font.medium, fontSize: 12, color: colors["primary-strong"] },
  question: {
    gap: spacing(2.5),
    padding: spacing(3.5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  questionText: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  answers: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  answer: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors["border-strong"],
    backgroundColor: colors.surface,
  },
  answerText: { fontFamily: font.medium, fontSize: 14, color: colors.foreground },
  photoAdd: { alignSelf: "flex-start" },
  ideas: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing(2) },
  ideasLabel: { fontFamily: font.medium, fontSize: 12, color: colors["muted-foreground"] },
  idea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
    minHeight: 34,
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ideaText: { fontFamily: font.medium, fontSize: 13, color: colors["primary-strong"] },
  help: { flexDirection: "row", alignItems: "flex-start", gap: spacing(1.5) },
  helpText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors["muted-foreground"],
  },
  helpEnough: { color: colors["primary-strong"] },
  privacy: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: colors["muted-foreground"],
  },
  features: { gap: spacing(3), paddingTop: spacing(2) },
  feature: {
    gap: spacing(1.5),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(4),
  },
  featureHead: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  featureTitle: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  featureBody: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors["muted-foreground"],
  },
});
